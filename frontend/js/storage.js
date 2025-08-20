// Local Storage Helper Functions
const storage = {
    // Get item from storage with fallback
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },

    // Set item in storage
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    // Remove item from storage
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    // Clear all storage
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }
};

// Session Storage Helper Functions
const session = {
    get(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Session get error:', error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Session set error:', error);
            return false;
        }
    },

    remove(key) {
        try {
            sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Session remove error:', error);
            return false;
        }
    },

    clear() {
        try {
            sessionStorage.clear();
            return true;
        } catch (error) {
            console.error('Session clear error:', error);
            return false;
        }
    }
};

// Token Management
const auth = {
    getToken() {
        return storage.get('access_token');
    },

    setToken(token) {
        return storage.set('access_token', token);
    },

    getRefreshToken() {
        return storage.get('refresh_token');
    },

    setRefreshToken(token) {
        return storage.set('refresh_token', token);
    },

    setUser(user) {
        return storage.set('user', user);
    },

    getUser() {
        return storage.get('user');
    },

    clear() {
        storage.remove('access_token');
        storage.remove('refresh_token');
        storage.remove('user');
    },

    isAuthenticated() {
        return !!this.getToken();
    }
};

// Preferences Management
const preferences = {
    getTheme() {
        return storage.get('theme', 'light');
    },

    setTheme(theme) {
        storage.set('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    },

    getLayout() {
        return storage.get('layout', 'default');
    },

    setLayout(layout) {
        return storage.set('layout', layout);
    },

    getNotifications() {
        return storage.get('notifications', {
            enabled: true,
            email: true,
            sound: true
        });
    },

    setNotifications(settings) {
        return storage.set('notifications', settings);
    }
};

// Recent Activity Management
const activity = {
    addRecentNote(note) {
        const recent = storage.get('recent_notes', []);
        const filtered = recent.filter(n => n.id !== note.id);
        filtered.unshift(note);
        storage.set('recent_notes', filtered.slice(0, 5));
    },

    getRecentNotes() {
        return storage.get('recent_notes', []);
    },

    addRecentResource(resource) {
        const recent = storage.get('recent_resources', []);
        const filtered = recent.filter(r => r.id !== resource.id);
        filtered.unshift(resource);
        storage.set('recent_resources', filtered.slice(0, 10));
    },

    getRecentResources() {
        return storage.get('recent_resources', []);
    }
};

// Timer State Management
const timerState = {
    save(state) {
        return session.set('timer_state', {
            ...state,
            timestamp: Date.now()
        });
    },

    load() {
        const state = session.get('timer_state');
        if (!state) return null;

        // Check if state is older than 1 hour
        const age = Date.now() - state.timestamp;
        if (age > 3600000) {
            session.remove('timer_state');
            return null;
        }

        return state;
    },

    clear() {
        return session.remove('timer_state');
    }
};

// Draft Management
const drafts = {
    saveNote(draft) {
        const drafts = storage.get('note_drafts', {});
        drafts[draft.id || 'new'] = {
            ...draft,
            savedAt: Date.now()
        };
        storage.set('note_drafts', drafts);
    },

    getNote(id = 'new') {
        const drafts = storage.get('note_drafts', {});
        return drafts[id];
    },

    deleteNote(id = 'new') {
        const drafts = storage.get('note_drafts', {});
        delete drafts[id];
        storage.set('note_drafts', drafts);
    },

    clearOldDrafts() {
        const drafts = storage.get('note_drafts', {});
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        Object.keys(drafts).forEach(key => {
            if (drafts[key].savedAt < oneWeekAgo) {
                delete drafts[key];
            }
        });

        storage.set('note_drafts', drafts);
    }
};

// Cache Management
const cache = {
    set(key, data, ttl = 3600000) { // Default 1 hour TTL
        const cacheData = {
            data,
            expires: Date.now() + ttl
        };
        return storage.set(`cache_${key}`, cacheData);
    },

    get(key) {
        const cacheData = storage.get(`cache_${key}`);
        if (!cacheData) return null;

        if (Date.now() > cacheData.expires) {
            storage.remove(`cache_${key}`);
            return null;
        }

        return cacheData.data;
    },

    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    }
};

// Export for use in other scripts
window.storage = storage;
window.session = session;
window.auth = auth;
window.preferences = preferences;
window.activity = activity;
window.timerState = timerState;
window.drafts = drafts;
window.cache = cache;