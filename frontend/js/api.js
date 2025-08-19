// API Client

class ApiClient {
    constructor() {
        this.baseURL = APP_CONFIG.API_BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    // Get auth headers
    getAuthHeaders() {
        const token = storage.getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Handle response
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        const data = isJson ? await response.json() : await response.text();

        if (!response.ok) {
            // Handle token expiration
            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (!refreshed) {
                    storage.clearAuth();
                    window.location.href = APP_CONFIG.ROUTES.LOGIN;
                    return;
                }
            }

            throw {
                status: response.status,
                message: data.error || data.message || 'Request failed',
                data
            };
        }

        return data;
    }

    // Refresh token
    async refreshToken() {
        try {
            const refreshToken = storage.getRefreshToken();
            if (!refreshToken) return false;

            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    ...this.defaultHeaders,
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                storage.setAccessToken(data.access_token);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...this.getAuthHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = utils.buildQueryString(params);
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // File upload
    async upload(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);

        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: this.getAuthHeaders() // Remove Content-Type for FormData
        });
    }

    // API Methods

    // Auth
    async login(email, password) {
        return this.post('/auth/login', { email, password });
    }

    async register(email, password, name) {
        return this.post('/auth/register', { email, password, name });
    }

    async forgotPassword(email) {
        return this.post('/auth/forgot-password', { email });
    }

    async resetPassword(token, password) {
        return this.post('/auth/reset-password', { token, password });
    }

    // Profile
    async getProfile() {
        return this.get('/profile');
    }

    async updateProfile(data) {
        return this.put('/profile', data);
    }

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        return this.request('/profile/avatar', {
            method: 'POST',
            body: formData,
            headers: this.getAuthHeaders()
        });
    }

    // Preferences
    async updatePreferences(preferences) {
        return this.put('/preferences', preferences);
    }

    // Progress
    async getProgress() {
        return this.get('/progress');
    }

    async updateProgress(week, day, data) {
        return this.post('/progress', { week, day, ...data });
    }

    // Calendar
    async getCalendar(week = null) {
        return week ? this.get('/calendar', { week }) : this.get('/calendar');
    }

    // Notes
    async getNotes(params = {}) {
        return this.get('/notes', params);
    }

    async createNote(data) {
        return this.post('/notes', data);
    }

    async updateNote(noteId, data) {
        return this.put(`/notes/${noteId}`, data);
    }

    async deleteNote(noteId) {
        return this.delete(`/notes/${noteId}`);
    }

    // Pomodoro
    async startPomodoro(data) {
        return this.post('/pomodoro', data);
    }

    async completePomodoro(sessionId) {
        return this.post(`/pomodoro/${sessionId}/complete`);
    }

    async getPomodoroHistory(params = {}) {
        return this.get('/pomodoro/history', params);
    }

    // Resources
    async getResources(params = {}) {
        return this.get('/resources', params);
    }

    // Roadmap
    async getRoadmap(week = null) {
        return week ? this.get('/roadmap', { week }) : this.get('/roadmap');
    }

    // Search
    async search(query, type = 'all', page = 1) {
        return this.get('/search', { q: query, type, page });
    }

    // AI Assistant
    async askAI(question) {
        return this.post('/ai/ask', { question });
    }

    async generateStudyPlan(data) {
        return this.post('/ai/study-plan', data);
    }

    async generateQuiz(data) {
        return this.post('/ai/quiz', data);
    }

    async summarizeContent(type, contentId) {
        return this.post('/ai/summarize', { type, content_id: contentId });
    }

    // Dashboard
    async getDashboard() {
        return this.get('/dashboard');
    }

    // Notifications
    async getNotifications(params = {}) {
        return this.get('/notifications', params);
    }

    async markNotificationRead(notificationId) {
        return this.post(`/notifications/${notificationId}/read`);
    }

    // Sessions
    async getSessions() {
        return this.get('/sessions');
    }

    async revokeSession(sessionId) {
        return this.delete(`/sessions/${sessionId}`);
    }
}

// Create global instance
window.api = new ApiClient();