// Global State Management
const State = {
    // Application state
    data: {
        user: null,
        progress: {},
        notes: [],
        dashboard: null,
        roadmap: [],
        resources: [],
        notifications: [],
        timer: {
            isRunning: false,
            timeLeft: 0,
            mode: 'pomodoro',
            sessionId: null
        },
        ui: {
            theme: 'light',
            sidebarCollapsed: false,
            loading: false,
            currentRoute: '/'
        },
        preferences: {},
        cache: {}
    },

    // Event listeners
    listeners: {},

    // Initialize state
    init() {
        this.loadFromStorage();
        this.setupStorageSync();
        return this;
    },

    // Load state from storage
    loadFromStorage() {
        // Load user data
        const userData = Storage.auth.getUser();
        if (userData) {
            this.data.user = userData;
        }

        // Load preferences
        this.data.preferences = Storage.preferences.get();

        // Load theme
        this.data.ui.theme = Storage.get(STORAGE_KEYS.THEME, APP_CONFIG.DEFAULT_THEME);

        // Load timer state
        this.data.timer = { ...this.data.timer, ...Storage.timer.getState() };
    },

    // Setup storage synchronization
    setupStorageSync() {
        // Sync preferences to storage when changed
        this.subscribe('preferences', (preferences) => {
            Storage.preferences.set(preferences);
        });

        // Sync theme to storage when changed
        this.subscribe('ui.theme', (theme) => {
            Storage.set(STORAGE_KEYS.THEME, theme);
        });

        // Sync timer state to storage when changed
        this.subscribe('timer', (timer) => {
            Storage.timer.setState(timer);
        });
    },

    // Get state value
    get(path) {
        return this.getNestedValue(this.data, path);
    },

    // Set state value
    set(path, value) {
        const oldValue = this.get(path);
        this.setNestedValue(this.data, path, value);

        // Emit change event
        this.emit(path, value, oldValue);

        return this;
    },

    // Update state (merge with existing)
    update(path, updates) {
        const currentValue = this.get(path) || {};
        const newValue = { ...currentValue, ...updates };
        return this.set(path, newValue);
    },

    // Subscribe to state changes
    subscribe(path, callback) {
        if (!this.listeners[path]) {
            this.listeners[path] = [];
        }

        this.listeners[path].push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.listeners[path].indexOf(callback);
            if (index > -1) {
                this.listeners[path].splice(index, 1);
            }
        };
    },

    // Emit state change
    emit(path, newValue, oldValue) {
        // Emit specific path listeners
        if (this.listeners[path]) {
            this.listeners[path].forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }

        // Emit wildcard listeners
        if (this.listeners['*']) {
            this.listeners['*'].forEach(callback => {
                try {
                    callback(path, newValue, oldValue);
                } catch (error) {
                    console.error('Wildcard state listener error:', error);
                }
            });
        }
    },

    // Helper to get nested value
    getNestedValue(obj, path) {
        if (typeof path !== 'string') return obj[path];

        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    },

    // Helper to set nested value
    setNestedValue(obj, path, value) {
        if (typeof path !== 'string') {
            obj[path] = value;
            return;
        }

        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (current[key] === undefined) {
                current[key] = {};
            }
            return current[key];
        }, obj);

        target[lastKey] = value;
    },

    // State actions
    actions: {
        // User actions
        setUser(user) {
            State.set('user', user);
        },

        updateUser(updates) {
            State.update('user', updates);
        },

        clearUser() {
            State.set('user', null);
        },

        // Progress actions
        setProgress(progress) {
            State.set('progress', progress);
        },

        updateProgress(week, day, data) {
            const currentProgress = State.get('progress') || {};
            if (!currentProgress[week]) {
                currentProgress[week] = {};
            }
            currentProgress[week][day] = data;
            State.set('progress', currentProgress);
        },

        // Notes actions
        setNotes(notes) {
            State.set('notes', notes);
        },

        addNote(note) {
            const notes = State.get('notes') || [];
            notes.unshift(note);
            State.set('notes', notes);
        },

        updateNote(noteId, updates) {
            const notes = State.get('notes') || [];
            const index = notes.findIndex(note => note.id === noteId);
            if (index !== -1) {
                notes[index] = { ...notes[index], ...updates };
                State.set('notes', notes);
            }
        },

        removeNote(noteId) {
            const notes = State.get('notes') || [];
            const filtered = notes.filter(note => note.id !== noteId);
            State.set('notes', filtered);
        },

        // Dashboard actions
        setDashboard(dashboard) {
            State.set('dashboard', dashboard);
        },

        // Roadmap actions
        setRoadmap(roadmap) {
            State.set('roadmap', roadmap);
        },

        // Resources actions
        setResources(resources) {
            State.set('resources', resources);
        },

        // Notifications actions
        setNotifications(notifications) {
            State.set('notifications', notifications);
        },

        addNotification(notification) {
            const notifications = State.get('notifications') || [];
            notifications.unshift(notification);
            State.set('notifications', notifications);
        },

        markNotificationRead(notificationId) {
            const notifications = State.get('notifications') || [];
            const index = notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                notifications[index].is_read = true;
                State.set('notifications', notifications);
            }
        },

        // Timer actions
        startTimer(sessionId, timeLeft, mode = 'pomodoro') {
            State.set('timer', {
                isRunning: true,
                timeLeft,
                mode,
                sessionId,
                startTime: Date.now()
            });
        },

        pauseTimer() {
            State.update('timer', {
                isRunning: false,
                pausedAt: Date.now()
            });
        },

        resumeTimer() {
            const timer = State.get('timer');
            const pausedDuration = Date.now() - timer.pausedAt;
            State.update('timer', {
                isRunning: true,
                startTime: timer.startTime + pausedDuration,
                pausedAt: null
            });
        },

        updateTimerTime(timeLeft) {
            State.update('timer', { timeLeft });
        },

        completeTimer() {
            State.update('timer', {
                isRunning: false,
                timeLeft: 0,
                completedAt: Date.now()
            });
        },

        resetTimer() {
            State.set('timer', {
                isRunning: false,
                timeLeft: 0,
                mode: 'pomodoro',
                sessionId: null
            });
        },

        // UI actions
        setTheme(theme) {
            State.set('ui.theme', theme);
        },

        toggleSidebar() {
            const collapsed = State.get('ui.sidebarCollapsed');
            State.set('ui.sidebarCollapsed', !collapsed);
        },

        setLoading(loading) {
            State.set('ui.loading', loading);
        },

        setCurrentRoute(route) {
            State.set('ui.currentRoute', route);
        },

        // Preferences actions
        setPreferences(preferences) {
            State.set('preferences', preferences);
        },

        updatePreference(key, value) {
            State.update('preferences', { [key]: value });
        },

        // Cache actions
        setCache(key, data, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
            State.update('cache', {
                [key]: {
                    data,
                    timestamp: Date.now(),
                    ttl
                }
            });
        },

        getCache(key) {
            const cache = State.get('cache') || {};
            const item = cache[key];

            if (!item) return null;

            // Check if expired
            if (Date.now() - item.timestamp > item.ttl) {
                State.clearCache(key);
                return null;
            }

            return item.data;
        },

        clearCache(key) {
            const cache = State.get('cache') || {};
            delete cache[key];
            State.set('cache', cache);
        },

        clearAllCache() {
            State.set('cache', {});
        }
    },

    // Computed values
    computed: {
        // Get total completed progress
        getTotalProgress() {
            const progress = State.get('progress') || {};
            let completed = 0;
            let total = 0;

            Object.values(progress).forEach(week => {
                Object.values(week).forEach(day => {
                    total++;
                    if (day.completed) completed++;
                });
            });

            return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
        },

        // Get current streak
        getCurrentStreak() {
            const progress = State.get('progress') || {};
            const completedDates = [];

            Object.values(progress).forEach(week => {
                Object.values(week).forEach(day => {
                    if (day.completed && day.completion_date) {
                        completedDates.push(day.completion_date);
                    }
                });
            });

            return Utils.calculateStreak(completedDates);
        },

        // Get unread notifications count
        getUnreadNotificationsCount() {
            const notifications = State.get('notifications') || [];
            return notifications.filter(n => !n.is_read).length;
        },

        // Get timer progress percentage
        getTimerProgress() {
            const timer = State.get('timer');
            if (!timer.isRunning) return 0;

            const totalTime = APP_CONFIG.POMODORO_DURATION; // Default duration
            return ((totalTime - timer.timeLeft) / totalTime) * 100;
        }
    },

    // Debugging helpers
    debug: {
        getState() {
            return State.data;
        },

        setState(newState) {
            State.data = newState;
        },

        getListeners() {
            return State.listeners;
        },

        clearState() {
            State.data = {
                user: null,
                progress: {},
                notes: [],
                dashboard: null,
                roadmap: [],
                resources: [],
                notifications: [],
                timer: {
                    isRunning: false,
                    timeLeft: 0,
                    mode: 'pomodoro',
                    sessionId: null
                },
                ui: {
                    theme: 'light',
                    sidebarCollapsed: false,
                    loading: false,
                    currentRoute: '/'
                },
                preferences: {},
                cache: {}
            };
        }
    }
};

// Initialize state
State.init();

// Make actions available globally for convenience
Object.assign(State, State.actions);

// Make available globally
window.State = State;