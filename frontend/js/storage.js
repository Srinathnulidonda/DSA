// Storage Management
const Storage = {
    // Initialize storage
    init() {
        this.checkStorageAvailability();
        this.migrateOldData();
        return this;
    },

    // Check if localStorage is available
    checkStorageAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            this.isAvailable = true;
        } catch (error) {
            this.isAvailable = false;
            console.warn('localStorage is not available:', error);
        }
    },

    // Migrate old data if needed
    migrateOldData() {
        const version = this.get('version', '1.0.0');
        if (version !== APP_CONFIG.VERSION) {
            console.log('Migrating storage data...');
            this.set('version', APP_CONFIG.VERSION);
        }
    },

    // Core storage methods
    set(key, value, options = {}) {
        if (!this.isAvailable) {
            console.warn('Storage not available');
            return false;
        }

        try {
            const data = {
                value,
                timestamp: Date.now(),
                expires: options.expires ? Date.now() + options.expires : null,
                encrypted: options.encrypt || false
            };

            let serialized = JSON.stringify(data);

            if (options.encrypt) {
                serialized = this.encrypt(serialized);
            }

            localStorage.setItem(this.getKey(key), serialized);
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    get(key, defaultValue = null) {
        if (!this.isAvailable) {
            return defaultValue;
        }

        try {
            let item = localStorage.getItem(this.getKey(key));
            if (!item) return defaultValue;

            // Check if it's encrypted
            if (item.startsWith('encrypted:')) {
                item = this.decrypt(item);
            }

            const data = JSON.parse(item);

            // Check expiration
            if (data.expires && Date.now() > data.expires) {
                this.remove(key);
                return defaultValue;
            }

            return data.value;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },

    remove(key) {
        if (!this.isAvailable) return false;

        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    clear() {
        if (!this.isAvailable) return false;

        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(APP_CONFIG.STORAGE_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    // Helper methods
    getKey(key) {
        return APP_CONFIG.STORAGE_PREFIX + key;
    },

    // Simple encryption (for sensitive data)
    encrypt(data) {
        // Simple base64 encoding (not secure, just obfuscation)
        return 'encrypted:' + btoa(data);
    },

    decrypt(data) {
        return atob(data.replace('encrypted:', ''));
    },

    // Session storage methods
    session: {
        set(key, value) {
            try {
                sessionStorage.setItem(APP_CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Session storage set error:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(APP_CONFIG.STORAGE_PREFIX + key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Session storage get error:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                sessionStorage.removeItem(APP_CONFIG.STORAGE_PREFIX + key);
                return true;
            } catch (error) {
                console.error('Session storage remove error:', error);
                return false;
            }
        },

        clear() {
            try {
                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith(APP_CONFIG.STORAGE_PREFIX)) {
                        sessionStorage.removeItem(key);
                    }
                });
                return true;
            } catch (error) {
                console.error('Session storage clear error:', error);
                return false;
            }
        }
    },

    // Specialized storage methods
    auth: {
        setTokens(accessToken, refreshToken) {
            Storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken, { encrypt: true });
            Storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken, { encrypt: true });
        },

        getAccessToken() {
            return Storage.get(STORAGE_KEYS.ACCESS_TOKEN);
        },

        getRefreshToken() {
            return Storage.get(STORAGE_KEYS.REFRESH_TOKEN);
        },

        clearTokens() {
            Storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
            Storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
        },

        setUser(userData) {
            Storage.set(STORAGE_KEYS.USER_DATA, userData);
        },

        getUser() {
            return Storage.get(STORAGE_KEYS.USER_DATA);
        },

        clearUser() {
            Storage.remove(STORAGE_KEYS.USER_DATA);
        }
    },

    preferences: {
        set(preferences) {
            Storage.set(STORAGE_KEYS.PREFERENCES, preferences);
        },

        get() {
            return Storage.get(STORAGE_KEYS.PREFERENCES, {
                theme: APP_CONFIG.DEFAULT_THEME,
                notifications: true,
                sounds: true,
                autoSave: true,
                pomodoroLength: 25,
                shortBreakLength: 5,
                longBreakLength: 15
            });
        },

        update(key, value) {
            const current = this.get();
            current[key] = value;
            this.set(current);
        }
    },

    timer: {
        setState(state) {
            Storage.session.set(STORAGE_KEYS.TIMER_STATE, state);
        },

        getState() {
            return Storage.session.get(STORAGE_KEYS.TIMER_STATE, {
                mode: 'pomodoro',
                timeLeft: APP_CONFIG.POMODORO_DURATION,
                isRunning: false,
                sessionCount: 0
            });
        },

        clearState() {
            Storage.session.remove(STORAGE_KEYS.TIMER_STATE);
        }
    },

    notes: {
        saveDraft(noteId, content) {
            const drafts = Storage.get(STORAGE_KEYS.DRAFT_NOTE, {});
            drafts[noteId] = {
                content,
                timestamp: Date.now()
            };
            Storage.set(STORAGE_KEYS.DRAFT_NOTE, drafts);
        },

        getDraft(noteId) {
            const drafts = Storage.get(STORAGE_KEYS.DRAFT_NOTE, {});
            return drafts[noteId] || null;
        },

        clearDraft(noteId) {
            const drafts = Storage.get(STORAGE_KEYS.DRAFT_NOTE, {});
            delete drafts[noteId];
            Storage.set(STORAGE_KEYS.DRAFT_NOTE, drafts);
        },

        clearAllDrafts() {
            Storage.remove(STORAGE_KEYS.DRAFT_NOTE);
        }
    },

    search: {
        addRecentSearch(query) {
            const recent = this.getRecentSearches();
            const filtered = recent.filter(item => item.query !== query);
            filtered.unshift({
                query,
                timestamp: Date.now()
            });

            // Keep only last 10 searches
            const limited = filtered.slice(0, 10);
            Storage.set(STORAGE_KEYS.RECENT_SEARCHES, limited);
        },

        getRecentSearches() {
            return Storage.get(STORAGE_KEYS.RECENT_SEARCHES, []);
        },

        clearRecentSearches() {
            Storage.remove(STORAGE_KEYS.RECENT_SEARCHES);
        }
    },

    offline: {
        saveData(key, data) {
            const offlineData = Storage.get(STORAGE_KEYS.OFFLINE_DATA, {});
            offlineData[key] = {
                data,
                timestamp: Date.now(),
                synced: false
            };
            Storage.set(STORAGE_KEYS.OFFLINE_DATA, offlineData);
        },

        getData(key) {
            const offlineData = Storage.get(STORAGE_KEYS.OFFLINE_DATA, {});
            return offlineData[key] || null;
        },

        markSynced(key) {
            const offlineData = Storage.get(STORAGE_KEYS.OFFLINE_DATA, {});
            if (offlineData[key]) {
                offlineData[key].synced = true;
                Storage.set(STORAGE_KEYS.OFFLINE_DATA, offlineData);
            }
        },

        getUnsyncedData() {
            const offlineData = Storage.get(STORAGE_KEYS.OFFLINE_DATA, {});
            const unsynced = {};

            Object.keys(offlineData).forEach(key => {
                if (!offlineData[key].synced) {
                    unsynced[key] = offlineData[key];
                }
            });

            return unsynced;
        },

        clearSyncedData() {
            const offlineData = Storage.get(STORAGE_KEYS.OFFLINE_DATA, {});
            const unsynced = {};

            Object.keys(offlineData).forEach(key => {
                if (!offlineData[key].synced) {
                    unsynced[key] = offlineData[key];
                }
            });

            Storage.set(STORAGE_KEYS.OFFLINE_DATA, unsynced);
        }
    },

    // Storage size management
    getSize() {
        if (!this.isAvailable) return 0;

        let total = 0;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(APP_CONFIG.STORAGE_PREFIX)) {
                total += localStorage.getItem(key).length;
            }
        });

        return total;
    },

    getFormattedSize() {
        return Utils.formatFileSize(this.getSize());
    },

    // Cleanup old data
    cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
        if (!this.isAvailable) return;

        const now = Date.now();
        const toRemove = [];

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(APP_CONFIG.STORAGE_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.timestamp && (now - data.timestamp) > maxAge) {
                        toRemove.push(key);
                    }
                } catch (error) {
                    // Invalid data, mark for removal
                    toRemove.push(key);
                }
            }
        });

        toRemove.forEach(key => localStorage.removeItem(key));
        console.log(`Cleaned up ${toRemove.length} old storage items`);
    },

    // Export/Import data
    export() {
        if (!this.isAvailable) return null;

        const data = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(APP_CONFIG.STORAGE_PREFIX)) {
                data[key] = localStorage.getItem(key);
            }
        });

        return JSON.stringify(data);
    },

    import(jsonData) {
        if (!this.isAvailable) return false;

        try {
            const data = JSON.parse(jsonData);
            Object.keys(data).forEach(key => {
                if (key.startsWith(APP_CONFIG.STORAGE_PREFIX)) {
                    localStorage.setItem(key, data[key]);
                }
            });
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    },

    // Debug methods
    debug: {
        listAll() {
            if (!Storage.isAvailable) return {};

            const data = {};
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(APP_CONFIG.STORAGE_PREFIX)) {
                    try {
                        data[key] = JSON.parse(localStorage.getItem(key));
                    } catch (error) {
                        data[key] = localStorage.getItem(key);
                    }
                }
            });
            return data;
        },

        clear() {
            return Storage.clear();
        },

        size() {
            return Storage.getFormattedSize();
        }
    }
};

// Initialize storage
Storage.init();

// Make available globally
window.Storage = Storage;