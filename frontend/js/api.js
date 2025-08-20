// API Client
const API = {
    baseURL: APP_CONFIG.API_BASE_URL,

    // Request interceptors
    requestInterceptors: [],
    responseInterceptors: [],

    // Add request interceptor
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    },

    // Add response interceptor
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    },

    // Default headers
    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    },

    // Get auth headers
    getAuthHeaders() {
        const token = Storage.auth.getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    // Build full URL
    buildURL(endpoint) {
        return `${this.baseURL}${endpoint}`;
    },

    // Apply request interceptors
    async applyRequestInterceptors(config) {
        let modifiedConfig = { ...config };

        for (const interceptor of this.requestInterceptors) {
            modifiedConfig = await interceptor(modifiedConfig);
        }

        return modifiedConfig;
    },

    // Apply response interceptors
    async applyResponseInterceptors(response, config) {
        let modifiedResponse = response;

        for (const interceptor of this.responseInterceptors) {
            modifiedResponse = await interceptor(modifiedResponse, config);
        }

        return modifiedResponse;
    },

    // Core request method
    async request(endpoint, options = {}) {
        try {
            // Prepare config
            let config = {
                url: this.buildURL(endpoint),
                method: options.method || 'GET',
                headers: {
                    ...this.getDefaultHeaders(),
                    ...this.getAuthHeaders(),
                    ...options.headers
                },
                body: options.body,
                ...options
            };

            // Apply request interceptors
            config = await this.applyRequestInterceptors(config);

            // Handle FormData
            if (config.body instanceof FormData) {
                delete config.headers['Content-Type'];
            } else if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }

            // Make request
            const response = await fetch(config.url, {
                method: config.method,
                headers: config.headers,
                body: config.body,
                credentials: 'include'
            });

            // Apply response interceptors
            const modifiedResponse = await this.applyResponseInterceptors(response, config);

            // Handle response
            return await this.handleResponse(modifiedResponse);

        } catch (error) {
            throw this.handleError(error);
        }
    },

    // Handle response
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        let data;
        try {
            data = isJson ? await response.json() : await response.text();
        } catch (error) {
            data = null;
        }

        if (!response.ok) {
            const error = new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.response = response;
            error.data = data;
            throw error;
        }

        return data;
    },

    // Handle errors
    handleError(error) {
        console.error('API Error:', error);

        // Network error
        if (!navigator.onLine) {
            error.message = 'Network connection lost. Please check your internet connection.';
            error.type = 'NETWORK_ERROR';
            return error;
        }

        // HTTP errors
        if (error.status) {
            switch (error.status) {
                case 401:
                    error.type = 'UNAUTHORIZED';
                    // Auto logout on 401
                    if (Storage.auth.getAccessToken()) {
                        Auth.logout();
                    }
                    break;
                case 403:
                    error.type = 'FORBIDDEN';
                    break;
                case 404:
                    error.type = 'NOT_FOUND';
                    break;
                case 422:
                    error.type = 'VALIDATION_ERROR';
                    break;
                case 429:
                    error.type = 'RATE_LIMITED';
                    break;
                case 500:
                    error.type = 'SERVER_ERROR';
                    break;
                default:
                    error.type = 'HTTP_ERROR';
            }
        }

        return error;
    },

    // HTTP Methods
    async get(endpoint, params = {}) {
        let url = endpoint;
        if (Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }
        return this.request(url, { method: 'GET' });
    },

    async post(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data,
            ...options
        });
    },

    async put(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data,
            ...options
        });
    },

    async patch(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: data,
            ...options
        });
    },

    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options
        });
    },

    // Upload file
    async upload(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);

        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.request(endpoint, {
            method: 'POST',
            body: formData
        });
    },

    // Auth endpoints
    auth: {
        async login(email, password) {
            return API.post(API_ENDPOINTS.LOGIN, { email, password });
        },

        async register(name, email, password) {
            return API.post(API_ENDPOINTS.REGISTER, { name, email, password });
        },

        async forgotPassword(email) {
            return API.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
        },

        async resetPassword(token, password) {
            return API.post(API_ENDPOINTS.RESET_PASSWORD, { token, password });
        },

        async refreshToken() {
            const refreshToken = Storage.auth.getRefreshToken();
            return API.post(API_ENDPOINTS.REFRESH_TOKEN, { refresh_token: refreshToken });
        }
    },

    // User endpoints
    user: {
        async getProfile() {
            return API.get(API_ENDPOINTS.PROFILE);
        },

        async updateProfile(data) {
            return API.put(API_ENDPOINTS.PROFILE, data);
        },

        async uploadAvatar(file) {
            return API.upload(API_ENDPOINTS.UPLOAD_AVATAR, file);
        },

        async updatePreferences(preferences) {
            return API.put(API_ENDPOINTS.PREFERENCES, preferences);
        }
    },

    // Progress endpoints
    progress: {
        async get() {
            return API.get(API_ENDPOINTS.PROGRESS);
        },

        async update(week, day, data) {
            return API.post(API_ENDPOINTS.PROGRESS, { week, day, ...data });
        },

        async getCalendar(week = null) {
            const params = week ? { week } : {};
            return API.get(API_ENDPOINTS.CALENDAR, params);
        }
    },

    // Notes endpoints
    notes: {
        async getAll(params = {}) {
            return API.get(API_ENDPOINTS.NOTES, params);
        },

        async create(note) {
            return API.post(API_ENDPOINTS.NOTES, note);
        },

        async update(id, note) {
            return API.put(`${API_ENDPOINTS.NOTES}/${id}`, note);
        },

        async delete(id) {
            return API.delete(`${API_ENDPOINTS.NOTES}/${id}`);
        }
    },

    // Pomodoro endpoints
    pomodoro: {
        async start(duration, topic = '', sessionType = 'study') {
            return API.post(API_ENDPOINTS.POMODORO_START, {
                duration,
                topic,
                session_type: sessionType
            });
        },

        async complete(sessionId) {
            const endpoint = API_ENDPOINTS.POMODORO_COMPLETE.replace(':id', sessionId);
            return API.post(endpoint);
        },

        async getHistory(params = {}) {
            return API.get(API_ENDPOINTS.POMODORO_HISTORY, params);
        }
    },

    // AI endpoints
    ai: {
        async ask(question) {
            return API.post(API_ENDPOINTS.AI_ASK, { question });
        },

        async generateStudyPlan(params) {
            return API.post(API_ENDPOINTS.AI_STUDY_PLAN, params);
        },

        async generateQuiz(topic, difficulty = 'medium', questionCount = 5) {
            return API.post(API_ENDPOINTS.AI_QUIZ, {
                topic,
                difficulty,
                question_count: questionCount
            });
        },

        async summarize(contentType, contentId) {
            return API.post(API_ENDPOINTS.AI_SUMMARIZE, {
                type: contentType,
                content_id: contentId
            });
        }
    },

    // Dashboard endpoints
    dashboard: {
        async get() {
            return API.get(API_ENDPOINTS.DASHBOARD);
        }
    },

    // Resources endpoints
    resources: {
        async getAll(params = {}) {
            return API.get(API_ENDPOINTS.RESOURCES, params);
        },

        async getRoadmap(week = null) {
            const params = week ? { week } : {};
            return API.get(API_ENDPOINTS.ROADMAP, params);
        }
    },

    // Search endpoints
    search: {
        async query(q, params = {}) {
            return API.get(API_ENDPOINTS.SEARCH, { q, ...params });
        }
    },

    // Notifications endpoints
    notifications: {
        async getAll(params = {}) {
            return API.get(API_ENDPOINTS.NOTIFICATIONS, params);
        },

        async markRead(id) {
            const endpoint = API_ENDPOINTS.MARK_READ.replace(':id', id);
            return API.post(endpoint);
        }
    }
};

// Add default interceptors
API.addRequestInterceptor(async (config) => {
    // Add timestamp to prevent caching
    if (config.method === 'GET') {
        const url = new URL(config.url);
        url.searchParams.set('_t', Date.now());
        config.url = url.toString();
    }

    return config;
});

API.addResponseInterceptor(async (response, config) => {
    // Handle token refresh
    if (response.status === 401 && Storage.auth.getRefreshToken()) {
        try {
            const tokenResponse = await API.auth.refreshToken();
            Storage.auth.setTokens(tokenResponse.access_token, tokenResponse.refresh_token);

            // Retry original request
            config.headers['Authorization'] = `Bearer ${tokenResponse.access_token}`;
            return fetch(config.url, {
                method: config.method,
                headers: config.headers,
                body: config.body
            });
        } catch (error) {
            // Refresh failed, logout user
            Auth.logout();
            throw error;
        }
    }

    return response;
});

// Offline support
let offlineQueue = [];

// Queue requests when offline
API.addRequestInterceptor(async (config) => {
    if (!navigator.onLine && config.method !== 'GET') {
        // Queue non-GET requests for later
        offlineQueue.push(config);
        throw new Error('Request queued for when connection is restored');
    }

    return config;
});

// Process offline queue when back online
window.addEventListener('online', async () => {
    console.log('Connection restored. Processing offline queue...');

    const queue = [...offlineQueue];
    offlineQueue = [];

    for (const config of queue) {
        try {
            await API.request(config.url.replace(API.baseURL, ''), {
                method: config.method,
                body: config.body,
                headers: config.headers
            });
        } catch (error) {
            console.error('Failed to process offline request:', error);
            // Re-queue failed requests
            offlineQueue.push(config);
        }
    }

    if (offlineQueue.length === 0) {
        Notifications.show('All offline actions have been synced!', 'success');
    }
});

// Network status monitoring
let networkStatus = navigator.onLine;

window.addEventListener('online', () => {
    networkStatus = true;
    document.dispatchEvent(new CustomEvent(EVENT_TYPES.NETWORK_STATUS_CHANGED, {
        detail: { online: true }
    }));
});

window.addEventListener('offline', () => {
    networkStatus = false;
    document.dispatchEvent(new CustomEvent(EVENT_TYPES.NETWORK_STATUS_CHANGED, {
        detail: { online: false }
    }));
    Notifications.show('You are now offline. Changes will be synced when connection is restored.', 'warning');
});

API.isOnline = () => networkStatus;

// Make available globally
window.API = API;