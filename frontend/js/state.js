// State Management for DSA Path Application

const State = {
    // Application state
    app: {
        isLoading: false,
        currentPage: null,
        isOnline: navigator.onLine,
        deviceType: Utils.browser.getDeviceType()
    },

    // User state
    user: {
        data: null,
        preferences: {},
        notifications: [],
        sessions: []
    },

    // Progress state
    progress: {
        data: {},
        stats: {},
        calendar: {},
        weeklyProgress: {}
    },

    // Study tools state
    study: {
        notes: [],
        pomodoroSessions: [],
        currentTimer: null,
        resources: []
    },

    // UI state
    ui: {
        theme: 'system',
        sidebarOpen: false,
        mobileMenuOpen: false,
        modals: {},
        toasts: []
    },

    // Cache for API responses
    cache: new Map(),

    // Event subscribers
    subscribers: new Map(),

    /**
     * Initialize state management
     */
    init() {
        // Load initial state from storage
        this.loadFromStorage();

        // Set up online/offline detection
        this.setupNetworkDetection();

        // Set up periodic cache cleanup
        this.setupCacheCleanup();

        // Load user data if authenticated
        if (Auth.isLoggedIn()) {
            this.loadUserData();
        }
    },

    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, []);
        }
        this.subscribers.get(key).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    },

    /**
     * Update state and notify subscribers
     */
    setState(key, value) {
        const keys = key.split('.');
        let current = this;

        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        // Set the value
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;

        // Notify subscribers
        this.notifySubscribers(key, value, oldValue);

        // Save to storage if needed
        this.saveToStorage(key, value);
    },

    /**
     * Get state value
     */
    getState(key) {
        const keys = key.split('.');
        let current = this;

        for (const k of keys) {
            if (current[k] === undefined) {
                return undefined;
            }
            current = current[k];
        }

        return current;
    },

    /**
     * Notify subscribers of state changes
     */
    notifySubscribers(key, newValue, oldValue) {
        const callbacks = this.subscribers.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error('State subscriber error:', error);
                }
            });
        }
    },

    /**
     * Load initial state from storage
     */
    loadFromStorage() {
        // Load user preferences
        const preferences = Storage.preferences.getPreferences();
        this.setState('user.preferences', preferences);

        // Load theme
        const theme = Storage.theme.getTheme();
        this.setState('ui.theme', theme);

        // Load cached progress data
        const cachedProgress = Storage.cache.get('progress');
        if (cachedProgress) {
            this.setState('progress.data', cachedProgress);
        }
    },

    /**
     * Save state to storage
     */
    saveToStorage(key, value) {
        switch (key) {
            case 'user.preferences':
                Storage.preferences.setPreferences(value);
                break;
            case 'ui.theme':
                Storage.theme.setTheme(value);
                break;
            case 'progress.data':
                Storage.cache.set('progress', value, 60); // Cache for 1 hour
                break;
        }
    },

    /**
     * Setup network detection
     */
    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.setState('app.isOnline', true);
            Notifications.show('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            this.setState('app.isOnline', false);
            Notifications.show('No internet connection', 'warning');
        });
    },

    /**
     * Setup cache cleanup
     */
    setupCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, item] of this.cache.entries()) {
                if (item.expiry && now > item.expiry) {
                    this.cache.delete(key);
                }
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    },

    /**
     * Load user data from API
     */
    async loadUserData() {
        try {
            this.setState('app.isLoading', true);

            // Load profile data
            const profile = await ApiMethods.profile.get();
            this.setState('user.data', profile.user);
            this.setState('user.preferences', profile.preferences);

            // Load dashboard data for quick access
            const dashboard = await ApiMethods.dashboard.get();
            this.setState('progress.stats', dashboard.stats);
            this.setState('progress.weeklyProgress', dashboard.weekly_progress);

        } catch (error) {
            console.error('Failed to load user data:', error);
        } finally {
            this.setState('app.isLoading', false);
        }
    },

    /**
     * Update progress state
     */
    async updateProgress(week, day, progressData) {
        try {
            // Optimistic update
            const currentProgress = this.getState('progress.data') || {};
            if (!currentProgress[week]) currentProgress[week] = {};
            currentProgress[week][day] = progressData;
            this.setState('progress.data', currentProgress);

            // Send to server
            await ApiMethods.progress.update(week, day, progressData);

            // Refresh stats
            const dashboard = await ApiMethods.dashboard.get();
            this.setState('progress.stats', dashboard.stats);
            this.setState('progress.weeklyProgress', dashboard.weekly_progress);

        } catch (error) {
            // Revert optimistic update on error
            this.loadProgress();
            throw error;
        }
    },

    /**
     * Load progress data
     */
    async loadProgress() {
        try {
            const progress = await ApiMethods.progress.get();
            this.setState('progress.data', progress.progress);
            this.setState('progress.stats', progress.stats);
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    },

    /**
     * Load notes
     */
    async loadNotes(filters = {}) {
        try {
            const notes = await ApiMethods.notes.getAll(1, 50, filters);
            this.setState('study.notes', notes.notes);
            return notes;
        } catch (error) {
            console.error('Failed to load notes:', error);
            return { notes: [], pagination: {} };
        }
    },

    /**
     * Add or update note
     */
    async saveNote(noteData, noteId = null) {
        try {
            let response;
            if (noteId) {
                response = await ApiMethods.notes.update(noteId, noteData);
            } else {
                response = await ApiMethods.notes.create(noteData);
            }

            // Refresh notes list
            await this.loadNotes();

            return response;
        } catch (error) {
            console.error('Failed to save note:', error);
            throw error;
        }
    },

    /**
     * Delete note
     */
    async deleteNote(noteId) {
        try {
            await ApiMethods.notes.delete(noteId);

            // Remove from state
            const currentNotes = this.getState('study.notes') || [];
            const updatedNotes = currentNotes.filter(note => note.id !== noteId);
            this.setState('study.notes', updatedNotes);

        } catch (error) {
            console.error('Failed to delete note:', error);
            throw error;
        }
    },

    /**
     * Start pomodoro session
     */
    async startPomodoro(sessionData) {
        try {
            const response = await ApiMethods.pomodoro.start(sessionData);

            const timerState = {
                sessionId: response.session_id,
                startTime: new Date(response.start_time),
                duration: sessionData.duration,
                topic: sessionData.topic,
                isRunning: true
            };

            this.setState('study.currentTimer', timerState);
            Storage.timer.setTimerState(timerState);

            return response;
        } catch (error) {
            console.error('Failed to start pomodoro:', error);
            throw error;
        }
    },

    /**
     * Complete pomodoro session
     */
    async completePomodoro(sessionId) {
        try {
            const response = await ApiMethods.pomodoro.complete(sessionId);

            this.setState('study.currentTimer', null);
            Storage.timer.clearTimerState();

            // Show completion notification
            Notifications.show('Pomodoro session completed!', 'success');

            return response;
        } catch (error) {
            console.error('Failed to complete pomodoro:', error);
            throw error;
        }
    },

    /**
     * Load resources
     */
    async loadResources(type = null) {
        try {
            const cacheKey = `resources_${type || 'all'}`;
            const cached = this.cache.get(cacheKey);

            if (cached && cached.expiry > Date.now()) {
                this.setState('study.resources', cached.data);
                return cached.data;
            }

            const resources = await ApiMethods.resources.get(type);

            // Cache for 30 minutes
            this.cache.set(cacheKey, {
                data: resources,
                expiry: Date.now() + 30 * 60 * 1000
            });

            this.setState('study.resources', resources);
            return resources;
        } catch (error) {
            console.error('Failed to load resources:', error);
            return { resources: [], pagination: {} };
        }
    },

    /**
     * Search functionality
     */
    async search(query, page = 1, type = 'all') {
        try {
            // Add to search history
            Storage.search.addSearchQuery(query);

            const results = await ApiMethods.search.query(query, page, type);
            return results;
        } catch (error) {
            console.error('Search failed:', error);
            return {};
        }
    },

    /**
     * Update UI state
     */
    updateUI(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.setState(`ui.${key}`, value);
        });
    },

    /**
     * Clear all state (on logout)
     */
    clear() {
        this.user = { data: null, preferences: {}, notifications: [], sessions: [] };
        this.progress = { data: {}, stats: {}, calendar: {}, weeklyProgress: {} };
        this.study = { notes: [], pomodoroSessions: [], currentTimer: null, resources: [] };
        this.cache.clear();

        // Clear storage
        Storage.cache.clear();
    }
};

// Export State for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = State;
}