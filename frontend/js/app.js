// Main Application Bootstrap
const App = {
    initialized: false,

    // Initialize application
    async init() {
        if (this.initialized) return;

        console.log('🚀 Initializing DSA Path Application...');

        try {
            // Initialize core systems
            await this.initializeCore();

            // Setup error handling
            this.setupErrorHandling();

            // Setup authentication
            this.setupAuthentication();

            // Initialize router
            this.initializeRouter();

            // Setup theme
            this.setupTheme();

            // Initialize notifications
            this.initializeNotifications();

            // Setup offline handling
            this.setupOfflineHandling();

            // Setup performance monitoring
            this.setupPerformanceMonitoring();

            // Preload critical resources
            await this.preloadCriticalResources();

            // Mark as initialized
            this.initialized = true;

            console.log('✅ DSA Path Application initialized successfully');

            // Dispatch app ready event
            document.dispatchEvent(new CustomEvent('app:ready'));

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    },

    // Initialize core systems
    async initializeCore() {
        // Initialize storage
        Storage.init();

        // Initialize state management
        State.init();

        // Initialize theme manager
        ThemeManager.init();

        // Initialize authentication
        Auth.init();

        // Initialize notifications
        Notifications.init();

        // Preload critical components
        await Loader.preloadComponents();
    },

    // Setup error handling
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logError('javascript', event.error);

            // Don't show notifications for known harmless errors
            if (!this.isHarmlessError(event.error)) {
                Notifications.error('An unexpected error occurred. Please refresh the page if the problem persists.');
            }
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.logError('promise', event.reason);

            // Prevent the default handling
            event.preventDefault();

            // Show user-friendly error
            if (event.reason && event.reason.message) {
                Notifications.error(`Error: ${event.reason.message}`);
            } else {
                Notifications.error('An unexpected error occurred. Please try again.');
            }
        });

        // Network error handling
        window.addEventListener('online', () => {
            Notifications.success('Connection restored!');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            Notifications.warning('You are now offline. Changes will be saved locally.');
        });
    },

    // Check if error is harmless
    isHarmlessError(error) {
        const harmlessErrors = [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Script error',
            'Network request failed'
        ];

        const message = error?.message || String(error);
        return harmlessErrors.some(harmless => message.includes(harmless));
    },

    // Log error for monitoring
    logError(type, error) {
        const errorData = {
            type,
            message: error?.message || String(error),
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: Auth.getUserId()
        };

        // Store locally for now
        const errors = Storage.get('error_logs', []);
        errors.push(errorData);

        // Keep only last 50 errors
        if (errors.length > 50) {
            errors.splice(0, errors.length - 50);
        }

        Storage.set('error_logs', errors);

        // In production, send to error tracking service
        if (process.env.NODE_ENV === 'production') {
            this.sendErrorToService(errorData);
        }
    },

    // Send error to external service (placeholder)
    sendErrorToService(errorData) {
        // TODO: Implement error tracking service integration
        console.log('Would send error to service:', errorData);
    },

    // Setup authentication
    setupAuthentication() {
        // Listen for auth state changes
        document.addEventListener(EVENT_TYPES.AUTH_STATE_CHANGED, (event) => {
            const { isAuthenticated, user } = event.detail;

            if (isAuthenticated) {
                this.onUserLogin(user);
            } else {
                this.onUserLogout();
            }
        });

        // Setup session monitoring
        this.setupSessionMonitoring();
    },

    // Handle user login
    onUserLogin(user) {
        console.log('User logged in:', user.name);

        // Load user preferences
        this.loadUserPreferences();

        // Setup user-specific features
        this.setupUserFeatures();

        // Track login event
        this.trackEvent('user_login', { userId: user.id });
    },

    // Handle user logout
    onUserLogout() {
        console.log('User logged out');

        // Clear user-specific data
        this.clearUserData();

        // Reset to default preferences
        this.resetToDefaults();

        // Track logout event
        this.trackEvent('user_logout');
    },

    // Load user preferences
    async loadUserPreferences() {
        try {
            const profile = await API.user.getProfile();
            const preferences = profile.preferences;

            // Apply preferences
            if (preferences.theme) {
                ThemeManager.setTheme(preferences.theme);
            }

            // Store preferences in state
            State.setPreferences(preferences);

        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    },

    // Setup user-specific features
    setupUserFeatures() {
        // Setup notifications preferences
        this.setupNotificationPreferences();

        // Setup auto-save for notes
        this.setupAutoSave();

        // Setup periodic data sync
        this.setupDataSync();
    },

    // Clear user-specific data
    clearUserData() {
        // Clear caches
        State.clearAllCache();
        Loader.clearCache();

        // Clear session storage
        Storage.session.clear();

        // Reset timer state
        State.resetTimer();
    },

    // Reset to default preferences
    resetToDefaults() {
        const defaults = {
            theme: APP_CONFIG.DEFAULT_THEME,
            notifications: true,
            sounds: true,
            autoSave: true
        };

        State.setPreferences(defaults);
        ThemeManager.setTheme(defaults.theme);
    },

    // Setup session monitoring
    setupSessionMonitoring() {
        // Check session validity every 5 minutes
        setInterval(async () => {
            if (Auth.isAuthenticated) {
                try {
                    await Auth.checkAuthStatus();
                } catch (error) {
                    console.warn('Session check failed:', error);
                }
            }
        }, 5 * 60 * 1000);

        // Monitor user activity
        let lastActivity = Date.now();
        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
            }, { passive: true });
        });

        // Warn about inactivity
        setInterval(() => {
            if (Auth.isAuthenticated) {
                const inactiveTime = Date.now() - lastActivity;
                const warningTime = 25 * 60 * 1000; // 25 minutes

                if (inactiveTime > warningTime) {
                    Notifications.warning('Your session will expire soon due to inactivity.');
                }
            }
        }, 60 * 1000); // Check every minute
    },

    // Initialize router
    initializeRouter() {
        Router.init();
        Router.setupLazyLoading();
    },

    // Setup theme
    setupTheme() {
        // Apply saved theme or system preference
        const savedTheme = Storage.get(STORAGE_KEYS.THEME);
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = savedTheme || systemTheme;

        ThemeManager.applyTheme(theme);

        // Setup theme change listener
        document.addEventListener(EVENT_TYPES.THEME_CHANGED, (event) => {
            this.onThemeChange(event.detail.theme);
        });
    },

    // Handle theme change
    onThemeChange(theme) {
        console.log('Theme changed to:', theme);

        // Update chart themes if any exist
        if (window.Chart) {
            Object.values(Chart.instances).forEach(chart => {
                Lib.charts.updateChartTheme(chart, theme);
            });
        }

        // Track theme change
        this.trackEvent('theme_changed', { theme });
    },

    // Initialize notifications
    initializeNotifications() {
        // Request notification permission if supported
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(() => {
                Notifications.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        Notifications.success('Desktop notifications enabled!');
                    }
                });
            }, 10000); // Ask after 10 seconds
        }

        // Setup notification preferences
        this.setupNotificationPreferences();
    },

    // Setup notification preferences
    setupNotificationPreferences() {
        const preferences = State.get('preferences') || {};

        // Configure notification settings based on preferences
        if (preferences.notifications === false) {
            Notifications.defaultDuration = 0; // Disable auto-hide
        }

        if (preferences.sounds === false) {
            // Disable sound in notifications
            Object.keys(Notifications.sounds).forEach(key => {
                Notifications.sounds[key].volume = 0;
            });
        }
    },

    // Setup offline handling
    setupOfflineHandling() {
        // Setup service worker for offline support
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }

        // Setup offline data sync
        this.setupOfflineSync();
    },

    // Register service worker
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);

            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        Notifications.info('A new version is available!', {
                            actions: [
                                {
                                    id: 'update',
                                    label: 'Update',
                                    handler: () => window.location.reload()
                                }
                            ],
                            duration: 0
                        });
                    }
                });
            });

        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    },

    // Setup offline sync
    setupOfflineSync() {
        // Sync offline data when online
        window.addEventListener('online', () => {
            this.syncOfflineData();
        });

        // Setup periodic sync
        setInterval(() => {
            if (navigator.onLine) {
                this.syncOfflineData();
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    },

    // Sync offline data
    async syncOfflineData() {
        try {
            const offlineData = Storage.offline.getUnsyncedData();

            if (Object.keys(offlineData).length > 0) {
                console.log('Syncing offline data...');

                // Process each offline item
                for (const [key, item] of Object.entries(offlineData)) {
                    try {
                        await this.syncOfflineItem(key, item);
                        Storage.offline.markSynced(key);
                    } catch (error) {
                        console.error(`Failed to sync item ${key}:`, error);
                    }
                }

                // Clean up synced data
                Storage.offline.clearSyncedData();

                Notifications.success('Offline changes synced successfully!');
            }

        } catch (error) {
            console.error('Offline sync error:', error);
        }
    },

    // Sync individual offline item
    async syncOfflineItem(key, item) {
        const [type, action] = key.split('_');

        switch (type) {
            case 'note':
                if (action === 'create') {
                    await API.notes.create(item.data);
                } else if (action === 'update') {
                    await API.notes.update(item.data.id, item.data);
                }
                break;

            case 'progress':
                await API.progress.update(item.data.week, item.data.day, item.data);
                break;

            default:
                console.warn('Unknown offline item type:', type);
        }
    },

    // Setup auto-save
    setupAutoSave() {
        const preferences = State.get('preferences') || {};

        if (preferences.autoSave !== false) {
            // Setup auto-save for notes
            this.setupNotesAutoSave();

            // Setup auto-save for progress
            this.setupProgressAutoSave();
        }
    },

    // Setup notes auto-save
    setupNotesAutoSave() {
        let autoSaveTimeout;

        document.addEventListener('input', (e) => {
            if (e.target.matches('[data-auto-save="note"]')) {
                clearTimeout(autoSaveTimeout);

                autoSaveTimeout = setTimeout(() => {
                    this.autoSaveNote(e.target);
                }, 2000); // Save after 2 seconds of inactivity
            }
        });
    },

    // Auto-save note
    async autoSaveNote(textarea) {
        const noteId = textarea.dataset.noteId || 'draft';
        const content = textarea.value;

        try {
            if (noteId === 'draft') {
                // Save as draft
                Storage.notes.saveDraft(noteId, content);
            } else {
                // Update existing note
                await API.notes.update(noteId, { content });

                // Show subtle success indicator
                this.showAutoSaveIndicator(textarea, 'saved');
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.showAutoSaveIndicator(textarea, 'error');
        }
    },

    // Show auto-save indicator
    showAutoSaveIndicator(element, status) {
        let indicator = element.parentNode.querySelector('.auto-save-indicator');

        if (!indicator) {
            indicator = document.createElement('small');
            indicator.className = 'auto-save-indicator position-absolute';
            indicator.style.top = '5px';
            indicator.style.right = '5px';
            element.parentNode.style.position = 'relative';
            element.parentNode.appendChild(indicator);
        }

        if (status === 'saved') {
            indicator.textContent = '✓ Saved';
            indicator.className = 'auto-save-indicator position-absolute text-success';
        } else if (status === 'error') {
            indicator.textContent = '✗ Error';
            indicator.className = 'auto-save-indicator position-absolute text-danger';
        }

        setTimeout(() => {
            indicator.textContent = '';
        }, 2000);
    },

    // Setup progress auto-save
    setupProgressAutoSave() {
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-auto-save="progress"]')) {
                this.autoSaveProgress(e.target);
            }
        });
    },

    // Auto-save progress
    async autoSaveProgress(checkbox) {
        const week = parseInt(checkbox.dataset.week);
        const day = checkbox.dataset.day;
        const completed = checkbox.checked;

        try {
            await API.progress.update(week, day, { completed });
            State.updateProgress(week, day, { completed });

            if (completed) {
                Notifications.success(`Great job! You completed ${day} of Week ${week}`);
            }
        } catch (error) {
            console.error('Progress auto-save failed:', error);

            // Revert checkbox state
            checkbox.checked = !completed;

            Notifications.error('Failed to save progress. Please try again.');
        }
    },

    // Setup data sync
    setupDataSync() {
        // Sync data every 10 minutes
        setInterval(() => {
            if (Auth.isAuthenticated && navigator.onLine) {
                this.syncUserData();
            }
        }, 10 * 60 * 1000);
    },

    // Sync user data
    async syncUserData() {
        try {
            // Sync progress data
            const progress = await API.progress.get();
            State.setProgress(progress.progress);

            // Sync recent notes
            const notes = await API.notes.getAll({ limit: 10 });
            State.setNotes(notes.notes);

        } catch (error) {
            console.warn('Data sync failed:', error);
        }
    },

    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor page load time
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            this.trackEvent('page_load_time', { loadTime });
        });

        // Monitor memory usage (if available)
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                console.log('Memory usage:', {
                    used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                    total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                    limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
                });
            }, 60000); // Log every minute
        }
    },

    // Preload critical resources
    async preloadCriticalResources() {
        // Preload critical CSS and images
        const criticalResources = [
            '/assets/icons/apple-touch-icon.png',
            '/assets/sounds/notification.mp3'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;
            link.as = resource.endsWith('.mp3') ? 'audio' : 'image';
            document.head.appendChild(link);
        });
    },

    // Track events (analytics placeholder)
    trackEvent(eventName, properties = {}) {
        const eventData = {
            event: eventName,
            properties: {
                ...properties,
                timestamp: new Date().toISOString(),
                userId: Auth.getUserId(),
                sessionId: this.getSessionId()
            }
        };

        console.log('Track event:', eventData);

        // Store locally for now
        const events = Storage.get('analytics_events', []);
        events.push(eventData);

        // Keep only last 100 events
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }

        Storage.set('analytics_events', events);

        // In production, send to analytics service
        if (process.env.NODE_ENV === 'production') {
            this.sendAnalyticsEvent(eventData);
        }
    },

    // Send analytics event (placeholder)
    sendAnalyticsEvent(eventData) {
        // TODO: Implement analytics service integration
        console.log('Would send analytics event:', eventData);
    },

    // Get session ID
    getSessionId() {
        let sessionId = Storage.session.get('session_id');

        if (!sessionId) {
            sessionId = Utils.generateId('session');
            Storage.session.set('session_id', sessionId);
        }

        return sessionId;
    },

    // Handle initialization error
    handleInitializationError(error) {
        document.getElementById('loading-screen').innerHTML = `
            <div class="text-center text-white">
                <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
                <h4>Initialization Failed</h4>
                <p>There was an error starting the application.</p>
                <button class="btn btn-light" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise me-2"></i>
                    Retry
                </button>
            </div>
        `;

        console.error('Initialization error details:', error);
    },

    // Cleanup on page unload
    cleanup() {
        // Save any pending data
        this.syncOfflineData();

        // Clear intervals and timeouts
        // (This would be handled by the browser, but good practice)

        console.log('App cleanup completed');
    }
};

// Setup cleanup on page unload
window.addEventListener('beforeunload', () => {
    App.cleanup();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}

// Make available globally
window.App = App;