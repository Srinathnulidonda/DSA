// Local Storage Management for DSA Path Application

const Storage = {
    /**
     * Set item in localStorage with error handling
     */
    setItem(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    /**
     * Get item from localStorage with error handling
     */
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },

    /**
     * Remove item from localStorage
     */
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    /**
     * Clear all items from localStorage
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    },

    /**
     * Check if localStorage is available
     */
    isAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get storage usage information
     */
    getUsage() {
        if (!this.isAvailable()) return null;

        let totalSize = 0;
        const itemSizes = {};

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                itemSizes[key] = size;
                totalSize += size;
            }
        }

        return {
            totalSize,
            itemSizes,
            totalSizeFormatted: this.formatBytes(totalSize),
            itemSizesFormatted: Object.entries(itemSizes).reduce((acc, [key, size]) => {
                acc[key] = this.formatBytes(size);
                return acc;
            }, {})
        };
    },

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Token management
     */
    token: {
        setAccessToken(token) {
            return Storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        },

        getAccessToken() {
            return Storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        },

        setRefreshToken(token) {
            return Storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
        },

        getRefreshToken() {
            return Storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        },

        clearTokens() {
            Storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            Storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        }
    },

    /**
     * User data management
     */
    user: {
        setUserData(userData) {
            return Storage.setItem(STORAGE_KEYS.USER_DATA, userData);
        },

        getUserData() {
            return Storage.getItem(STORAGE_KEYS.USER_DATA);
        },

        clearUserData() {
            Storage.removeItem(STORAGE_KEYS.USER_DATA);
        },

        updateUserData(updates) {
            const currentData = this.getUserData() || {};
            const updatedData = { ...currentData, ...updates };
            return this.setUserData(updatedData);
        }
    },

    /**
     * Theme management
     */
    theme: {
        setTheme(theme) {
            return Storage.setItem(STORAGE_KEYS.THEME, theme);
        },

        getTheme() {
            return Storage.getItem(STORAGE_KEYS.THEME, THEME_CONFIG.SYSTEM);
        }
    },

    /**
     * Preferences management
     */
    preferences: {
        setPreferences(preferences) {
            return Storage.setItem(STORAGE_KEYS.PREFERENCES, preferences);
        },

        getPreferences() {
            return Storage.getItem(STORAGE_KEYS.PREFERENCES, {});
        },

        updatePreferences(updates) {
            const currentPrefs = this.getPreferences();
            const updatedPrefs = { ...currentPrefs, ...updates };
            return this.setPreferences(updatedPrefs);
        }
    },

    /**
     * Timer state management
     */
    timer: {
        setTimerState(state) {
            return Storage.setItem(STORAGE_KEYS.TIMER_STATE, {
                ...state,
                timestamp: Date.now()
            });
        },

        getTimerState() {
            const state = Storage.getItem(STORAGE_KEYS.TIMER_STATE);
            if (!state) return null;

            // Check if state is not too old (1 hour)
            const maxAge = 60 * 60 * 1000; // 1 hour
            if (Date.now() - state.timestamp > maxAge) {
                this.clearTimerState();
                return null;
            }

            return state;
        },

        clearTimerState() {
            Storage.removeItem(STORAGE_KEYS.TIMER_STATE);
        }
    },

    /**
     * Draft notes management
     */
    notes: {
        setDraftNote(noteId, content) {
            const drafts = this.getDraftNotes();
            drafts[noteId] = {
                content,
                timestamp: Date.now()
            };
            return Storage.setItem(STORAGE_KEYS.DRAFT_NOTES, drafts);
        },

        getDraftNote(noteId) {
            const drafts = this.getDraftNotes();
            return drafts[noteId] || null;
        },

        getDraftNotes() {
            return Storage.getItem(STORAGE_KEYS.DRAFT_NOTES, {});
        },

        removeDraftNote(noteId) {
            const drafts = this.getDraftNotes();
            delete drafts[noteId];
            return Storage.setItem(STORAGE_KEYS.DRAFT_NOTES, drafts);
        },

        clearOldDrafts() {
            const drafts = this.getDraftNotes();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            const now = Date.now();

            Object.keys(drafts).forEach(noteId => {
                if (now - drafts[noteId].timestamp > maxAge) {
                    delete drafts[noteId];
                }
            });

            return Storage.setItem(STORAGE_KEYS.DRAFT_NOTES, drafts);
        }
    },

    /**
     * Search history management
     */
    search: {
        addSearchQuery(query) {
            if (!query || query.trim().length < 2) return;

            const history = this.getSearchHistory();
            const normalizedQuery = query.trim().toLowerCase();

            // Remove if already exists
            const existingIndex = history.findIndex(item => item.query === normalizedQuery);
            if (existingIndex > -1) {
                history.splice(existingIndex, 1);
            }

            // Add to beginning
            history.unshift({
                query: normalizedQuery,
                timestamp: Date.now()
            });

            // Keep only last 20 searches
            const trimmedHistory = history.slice(0, 20);

            return Storage.setItem(STORAGE_KEYS.SEARCH_HISTORY, trimmedHistory);
        },

        getSearchHistory() {
            return Storage.getItem(STORAGE_KEYS.SEARCH_HISTORY, []);
        },

        clearSearchHistory() {
            Storage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
        },

        removeSearchQuery(query) {
            const history = this.getSearchHistory();
            const filteredHistory = history.filter(item => item.query !== query);
            return Storage.setItem(STORAGE_KEYS.SEARCH_HISTORY, filteredHistory);
        }
    },

    /**
     * Cache management with expiration
     */
    cache: {
        set(key, data, expirationMinutes = 60) {
            const item = {
                data,
                expiration: Date.now() + (expirationMinutes * 60 * 1000)
            };
            return Storage.setItem(`cache_${key}`, item);
        },

        get(key) {
            const item = Storage.getItem(`cache_${key}`);
            if (!item) return null;

            if (Date.now() > item.expiration) {
                this.remove(key);
                return null;
            }

            return item.data;
        },

        remove(key) {
            Storage.removeItem(`cache_${key}`);
        },

        clear() {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
            keys.forEach(key => localStorage.removeItem(key));
        },

        cleanExpired() {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
            keys.forEach(key => {
                const item = Storage.getItem(key);
                if (item && Date.now() > item.expiration) {
                    localStorage.removeItem(key);
                }
            });
        }
    },

    /**
     * Session management for temporary data
     */
    session: {
        setItem(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Error saving to sessionStorage:', error);
                return false;
            }
        },

        getItem(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Error reading from sessionStorage:', error);
                return defaultValue;
            }
        },

        removeItem(key) {
            try {
                sessionStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Error removing from sessionStorage:', error);
                return false;
            }
        },

        clear() {
            try {
                sessionStorage.clear();
                return true;
            } catch (error) {
                console.error('Error clearing sessionStorage:', error);
                return false;
            }
        }
    },

    /**
     * Backup and restore functionality
     */
    backup: {
        export() {
            const data = {};

            // Export all DSA Path related data
            Object.values(STORAGE_KEYS).forEach(key => {
                const value = Storage.getItem(key);
                if (value !== null) {
                    data[key] = value;
                }
            });

            // Add metadata
            data._metadata = {
                exportDate: new Date().toISOString(),
                version: APP_CONFIG.VERSION
            };

            return data;
        },

        import(data) {
            try {
                // Validate data structure
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid backup data');
                }

                // Import each item
                Object.entries(data).forEach(([key, value]) => {
                    if (key !== '_metadata' && Object.values(STORAGE_KEYS).includes(key)) {
                        Storage.setItem(key, value);
                    }
                });

                return true;
            } catch (error) {
                console.error('Error importing backup:', error);
                return false;
            }
        },

        download() {
            const data = this.export();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const filename = `dsa-path-backup-${Utils.date.format(new Date(), 'YYYY-MM-DD-HHmm')}.json`;

            Utils.browser.download(url, filename);
            URL.revokeObjectURL(url);
        }
    },

    /**
     * Initialize storage with cleanup
     */
    init() {
        // Clean expired cache items
        this.cache.cleanExpired();

        // Clean old draft notes
        this.notes.clearOldDrafts();

        // Set up periodic cleanup
        setInterval(() => {
            this.cache.cleanExpired();
            this.notes.clearOldDrafts();
        }, 60 * 60 * 1000); // Every hour
    }
};

// Export Storage for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}