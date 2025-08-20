// API Client for DSA Path Application

class APIClient {
    constructor() {
        this.baseURL = API_BASE;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get authorization headers
     */
    getAuthHeaders() {
        const token = Storage.token.getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Make HTTP request with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                ...this.defaultHeaders,
                ...this.getAuthHeaders(),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);

            // Handle different response types
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                // Try to refresh token if 401
                if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // Retry original request with new token
                        return this.request(endpoint, options);
                    } else {
                        // Refresh failed, redirect to login
                        Auth.logout();
                        throw new APIError('Session expired', 401, data);
                    }
                }

                throw new APIError(
                    data?.error || data?.message || `HTTP ${response.status}`,
                    response.status,
                    data
                );
            }

            return data;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }

            // Network or other errors
            console.error('API Request failed:', error);
            throw new APIError(
                'Network error. Please check your connection.',
                0,
                { originalError: error }
            );
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = Utils.url.buildQuery(params);
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * Upload file
     */
    async upload(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);

        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        return this.request(endpoint, {
            method: 'POST',
            headers: {
                // Don't set Content-Type for FormData, let browser set it
                ...this.getAuthHeaders()
            },
            body: formData
        });
    }

    /**
     * Refresh access token
     */
    async refreshToken() {
        try {
            const refreshToken = Storage.token.getRefreshToken();
            if (!refreshToken) {
                return false;
            }

            const response = await fetch(`${this.baseURL}${API_ENDPOINTS.AUTH_REFRESH}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                Storage.token.setAccessToken(data.access_token);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Create global API instance
const API = new APIClient();

// API Methods organized by feature
const ApiMethods = {
    // Authentication
    auth: {
        async login(email, password) {
            const response = await API.post(API_ENDPOINTS.AUTH_LOGIN, { email, password });

            // Store tokens
            Storage.token.setAccessToken(response.access_token);
            Storage.token.setRefreshToken(response.refresh_token);
            Storage.user.setUserData(response.user);

            return response;
        },

        async register(userData) {
            const response = await API.post(API_ENDPOINTS.AUTH_REGISTER, userData);

            // Store tokens
            Storage.token.setAccessToken(response.access_token);
            Storage.token.setRefreshToken(response.refresh_token);
            Storage.user.setUserData(response.user);

            return response;
        },

        async forgotPassword(email) {
            return API.post(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, { email });
        },

        async resetPassword(token, password) {
            return API.post(API_ENDPOINTS.AUTH_RESET_PASSWORD, { token, password });
        }
    },

    // User Profile
    profile: {
        async get() {
            return API.get(API_ENDPOINTS.PROFILE);
        },

        async update(data) {
            const response = await API.put(API_ENDPOINTS.PROFILE, data);

            // Update stored user data
            Storage.user.updateUserData(response.user);

            return response;
        },

        async uploadAvatar(file) {
            return API.upload('/profile/avatar', file, { avatar: file });
        }
    },

    // Preferences
    preferences: {
        async update(preferences) {
            const response = await API.put(API_ENDPOINTS.PREFERENCES, preferences);

            // Update stored preferences
            Storage.preferences.updatePreferences(preferences);

            return response;
        }
    },

    // Dashboard
    dashboard: {
        async get() {
            // Try cache first
            const cached = Storage.cache.get('dashboard');
            if (cached) {
                return cached;
            }

            const data = await API.get(API_ENDPOINTS.DASHBOARD);

            // Cache for 5 minutes
            Storage.cache.set('dashboard', data, 5);

            return data;
        }
    },

    // Progress
    progress: {
        async get() {
            return API.get(API_ENDPOINTS.PROGRESS);
        },

        async update(week, day, progressData) {
            const data = {
                week,
                day,
                ...progressData
            };

            const response = await API.post(API_ENDPOINTS.PROGRESS, data);

            // Invalidate dashboard cache
            Storage.cache.remove('dashboard');

            return response;
        }
    },

    // Calendar
    calendar: {
        async get(week = null) {
            const params = week ? { week } : {};
            return API.get(API_ENDPOINTS.CALENDAR, params);
        }
    },

    // Roadmap
    roadmap: {
        async get(week = null) {
            const params = week ? { week } : {};
            return API.get(API_ENDPOINTS.ROADMAP, params);
        }
    },

    // Resources
    resources: {
        async get(type = null, page = 1, perPage = 50) {
            const params = { page, per_page: perPage };
            if (type) params.type = type;

            // Cache key based on parameters
            const cacheKey = `resources_${type || 'all'}_${page}_${perPage}`;
            const cached = Storage.cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const data = await API.get(API_ENDPOINTS.RESOURCES, params);

            // Cache for 30 minutes
            Storage.cache.set(cacheKey, data, 30);

            return data;
        }
    },

    // Notes
    notes: {
        async getAll(page = 1, perPage = 20, filters = {}) {
            const params = { page, per_page: perPage, ...filters };
            return API.get(API_ENDPOINTS.NOTES, params);
        },

        async create(noteData) {
            return API.post(API_ENDPOINTS.NOTES, noteData);
        },

        async update(noteId, noteData) {
            return API.put(`${API_ENDPOINTS.NOTES}/${noteId}`, noteData);
        },

        async delete(noteId) {
            return API.delete(`${API_ENDPOINTS.NOTES}/${noteId}`);
        }
    },

    // Pomodoro
    pomodoro: {
        async start(sessionData) {
            return API.post(API_ENDPOINTS.POMODORO, sessionData);
        },

        async complete(sessionId) {
            return API.post(`${API_ENDPOINTS.POMODORO}/${sessionId}/complete`);
        },

        async getHistory(page = 1, perPage = 20) {
            const params = { page, per_page: perPage };
            return API.get(`${API_ENDPOINTS.POMODORO}/history`, params);
        }
    },

    // Search
    search: {
        async query(searchQuery, page = 1, type = 'all') {
            const params = { q: searchQuery, page, type };
            return API.get(API_ENDPOINTS.SEARCH, params);
        }
    },

    // AI Assistant
    ai: {
        async ask(question) {
            return API.post(API_ENDPOINTS.AI_ASK, { question });
        },

        async generateStudyPlan(preferences) {
            return API.post(API_ENDPOINTS.AI_STUDY_PLAN, preferences);
        },

        async generateQuiz(quizConfig) {
            return API.post(API_ENDPOINTS.AI_QUIZ, quizConfig);
        },

        async summarize(contentType, contentId) {
            return API.post(API_ENDPOINTS.AI_SUMMARIZE, {
                type: contentType,
                content_id: contentId
            });
        }
    },

    // Notifications
    notifications: {
        async getAll(page = 1, perPage = 20) {
            const params = { page, per_page: perPage };
            return API.get(API_ENDPOINTS.NOTIFICATIONS, params);
        },

        async markAsRead(notificationId) {
            return API.post(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, ApiMethods, APIError };
}