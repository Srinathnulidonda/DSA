// Storage Management

class StorageManager {
    constructor() {
        this.storage = window.localStorage;
        this.sessionStorage = window.sessionStorage;
    }

    // Get item from storage
    get(key, defaultValue = null) {
        try {
            const item = this.storage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }

    // Set item in storage
    set(key, value) {
        try {
            this.storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }

    // Remove item from storage
    remove(key) {
        try {
            this.storage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    }

    // Clear all storage
    clear() {
        try {
            this.storage.clear();
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }

    // Session storage methods
    getSession(key, defaultValue = null) {
        try {
            const item = this.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Session storage get error:', e);
            return defaultValue;
        }
    }

    setSession(key, value) {
        try {
            this.sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Session storage set error:', e);
            return false;
        }
    }

    // User data methods
    getUser() {
        return this.get(APP_CONFIG.STORAGE_KEYS.USER_DATA);
    }

    setUser(userData) {
        return this.set(APP_CONFIG.STORAGE_KEYS.USER_DATA, userData);
    }

    // Token methods
    getAccessToken() {
        return this.get(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    }

    setAccessToken(token) {
        return this.set(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token);
    }

    getRefreshToken() {
        return this.get(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    }

    setRefreshToken(token) {
        return this.set(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, token);
    }

    // Theme methods
    getTheme() {
        return this.get(APP_CONFIG.STORAGE_KEYS.THEME, THEMES.LIGHT);
    }

    setTheme(theme) {
        return this.set(APP_CONFIG.STORAGE_KEYS.THEME, theme);
    }

    // Preferences methods
    getPreferences() {
        return this.get(APP_CONFIG.STORAGE_KEYS.PREFERENCES, {});
    }

    setPreferences(preferences) {
        return this.set(APP_CONFIG.STORAGE_KEYS.PREFERENCES, preferences);
    }

    // Pomodoro state
    getPomodoroState() {
        return this.get(APP_CONFIG.STORAGE_KEYS.POMODORO_STATE);
    }

    setPomodoroState(state) {
        return this.set(APP_CONFIG.STORAGE_KEYS.POMODORO_STATE, state);
    }

    // Clear auth data
    clearAuth() {
        this.remove(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        this.remove(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        this.remove(APP_CONFIG.STORAGE_KEYS.USER_DATA);
    }
}

// Create global instance
window.storage = new StorageManager();