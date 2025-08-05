// Application Settings and Configuration
const AppSettings = {
    // API Configuration
    api: {
        baseURL: 'http://apibackend/api',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    },

    // Feature Flags
    features: {
        cloudSync: true,
        offlineMode: true,
        notifications: true,
        achievements: true,
        analytics: true,
        socialFeatures: false,
        advancedEditor: true,
        exportImport: true,
        themes: true,
        customization: true
    },

    // Study Settings
    study: {
        defaultPomodoroMinutes: 25,
        defaultShortBreak: 5,
        defaultLongBreak: 15,
        pomodorosBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartPomodoros: false,
        dailyGoalHours: 2,
        weeklyGoalHours: 14
    },

    // UI Settings
    ui: {
        defaultTheme: 'light',
        animations: true,
        sounds: true,
        compactMode: false,
        showTips: true,
        autoSave: true,
        autoSaveInterval: 30000, // 30 seconds
        language: 'en'
    },

    // Notification Settings
    notifications: {
        browser: true,
        email: false,
        streakReminders: true,
        taskReminders: true,
        achievementAlerts: true,
        studyReminders: true,
        reminderTime: '09:00'
    },

    // Storage Settings
    storage: {
        maxLocalStorageSize: 5 * 1024 * 1024, // 5MB
        maxAttachmentSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'application/pdf',
            'text/plain',
            'text/x-python',
            'application/javascript',
            'text/html',
            'text/css'
        ],
        cacheExpiration: 86400000 // 24 hours
    },

    // Analytics Settings
    analytics: {
        trackPageViews: true,
        trackEvents: true,
        trackErrors: true,
        anonymizeData: true,
        sessionTimeout: 1800000 // 30 minutes
    },

    // Course Structure
    course: {
        totalWeeks: 14,
        tasksPerDay: 3,
        hoursPerDay: 2,
        projectsRequired: 14,
        minimumPassingProgress: 80
    },

    // Resource URLs
    resources: {
        documentation: 'https://docs.example.com',
        support: 'https://support.example.com',
        community: 'https://community.example.com',
        blog: 'https://blog.example.com',
        changelog: 'https://changelog.example.com'
    },

    // Social Integration
    social: {
        enableSharing: true,
        platforms: ['twitter', 'linkedin', 'facebook'],
        shareTemplates: {
            achievement: 'Just earned the {achievement} badge on DSA Dashboard! 🎉',
            milestone: 'Completed Week {week} of my DSA journey! 💪',
            streak: 'On a {days}-day learning streak! 🔥'
        }
    },

    // Gamification Settings
    gamification: {
        enableBadges: true,
        enableLeaderboard: false,
        enablePoints: true,
        pointsPerTask: 10,
        pointsPerProject: 100,
        streakBonus: 5,
        weekCompletionBonus: 50
    },

    // Debug Settings
    debug: {
        enabled: false,
        logLevel: 'error', // 'error', 'warn', 'info', 'debug'
        showPerformanceMetrics: false,
        mockData: false
    }
};

// Settings Manager Class
class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.listeners = new Map();
    }

    loadSettings() {
        // Load user preferences from localStorage
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                return this.mergeSettings(AppSettings, parsed);
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
        return { ...AppSettings };
    }

    mergeSettings(defaults, saved) {
        const merged = { ...defaults };

        Object.keys(saved).forEach(key => {
            if (typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
                merged[key] = this.mergeSettings(defaults[key] || {}, saved[key]);
            } else {
                merged[key] = saved[key];
            }
        });

        return merged;
    }

    get(path) {
        const keys = path.split('.');
        let value = this.settings;

        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.settings;

        for (const key of keys) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }

        const oldValue = target[lastKey];
        target[lastKey] = value;

        // Save settings
        this.saveSettings();

        // Notify listeners
        this.notifyListeners(path, value, oldValue);
    }

    saveSettings() {
        try {
            // Extract only user-modified settings
            const userSettings = this.extractUserSettings();
            localStorage.setItem('userSettings', JSON.stringify(userSettings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    extractUserSettings() {
        // Compare with defaults and extract only changed values
        const changes = {};

        const extractChanges = (current, defaults, path = '') => {
            Object.keys(current).forEach(key => {
                const currentPath = path ? `${path}.${key}` : key;

                if (typeof current[key] === 'object' && !Array.isArray(current[key])) {
                    const subChanges = {};
                    extractChanges(current[key], defaults[key] || {}, currentPath);
                    if (Object.keys(subChanges).length > 0) {
                        changes[key] = subChanges;
                    }
                } else if (current[key] !== defaults[key]) {
                    if (!path) {
                        changes[key] = current[key];
                    } else {
                        // Nested change
                        const pathKeys = path.split('.');
                        let target = changes;

                        pathKeys.forEach((pathKey, index) => {
                            if (!target[pathKey]) {
                                target[pathKey] = {};
                            }
                            if (index === pathKeys.length - 1) {
                                target[pathKey][key] = current[key];
                            } else {
                                target = target[pathKey];
                            }
                        });
                    }
                }
            });
        };

        extractChanges(this.settings, AppSettings);
        return changes;
    }

    reset(path = null) {
        if (path) {
            const keys = path.split('.');
            const lastKey = keys.pop();
            let defaultValue = AppSettings;
            let target = this.settings;

            for (const key of keys) {
                defaultValue = defaultValue[key];
                target = target[key];
            }

            if (defaultValue && defaultValue[lastKey] !== undefined) {
                target[lastKey] = defaultValue[lastKey];
            }
        } else {
            // Reset all settings
            this.settings = { ...AppSettings };
        }

        this.saveSettings();
    }

    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);

        // Return unsubscribe function
        return () => {
            const pathListeners = this.listeners.get(path);
            if (pathListeners) {
                pathListeners.delete(callback);
            }
        };
    }

    notifyListeners(path, newValue, oldValue) {
        // Notify exact path listeners
        const exactListeners = this.listeners.get(path);
        if (exactListeners) {
            exactListeners.forEach(callback => {
                callback(newValue, oldValue, path);
            });
        }

        // Notify parent path listeners
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            const parentListeners = this.listeners.get(parentPath);

            if (parentListeners) {
                parentListeners.forEach(callback => {
                    callback(this.get(parentPath), null, parentPath);
                });
            }
        }
    }

    export() {
        return JSON.stringify(this.settings, null, 2);
    }

    import(settingsJson) {
        try {
            const imported = JSON.parse(settingsJson);
            this.settings = this.mergeSettings(AppSettings, imported);
            this.saveSettings();

            // Notify all listeners
            this.listeners.forEach((callbacks, path) => {
                callbacks.forEach(callback => {
                    callback(this.get(path), null, path);
                });
            });

            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }

    validate() {
        const errors = [];

        // Validate API URL
        if (!this.get('api.baseURL')) {
            errors.push('API base URL is required');
        }

        // Validate study settings
        const pomodoroMinutes = this.get('study.defaultPomodoroMinutes');
        if (pomodoroMinutes < 1 || pomodoroMinutes > 60) {
            errors.push('Pomodoro duration must be between 1 and 60 minutes');
        }

        // Validate storage settings
        const maxAttachmentSize = this.get('storage.maxAttachmentSize');
        if (maxAttachmentSize > 50 * 1024 * 1024) { // 50MB
            errors.push('Maximum attachment size cannot exceed 50MB');
        }

        return errors;
    }
}

// Create global settings instance
window.settingsManager = new SettingsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppSettings, SettingsManager };
}