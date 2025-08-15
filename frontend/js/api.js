// api.js - API service layer

class APIService {
    constructor() {
        this.baseURL = window.DSAApp.API_BASE_URL;
        this.authToken = localStorage.getItem('dsa_auth_token');
    }

    // Set auth header
    setAuthHeader() {
        if (this.authToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
        }
    }

    // Auth APIs
    async login(credentials) {
        return await axios.post(`${this.baseURL}/auth/login`, credentials);
    }

    async register(userData) {
        return await axios.post(`${this.baseURL}/auth/register`, userData);
    }

    async forgotPassword(email) {
        return await axios.post(`${this.baseURL}/auth/forgot-password`, { email });
    }

    async resetPassword(token, password) {
        return await axios.post(`${this.baseURL}/auth/reset-password`, { token, password });
    }

    // Profile APIs
    async getProfile() {
        this.setAuthHeader();
        return await axios.get(`${this.baseURL}/profile`);
    }

    async updateProfile(data) {
        this.setAuthHeader();
        return await axios.put(`${this.baseURL}/profile`, data);
    }

    async uploadAvatar(file) {
        this.setAuthHeader();
        const formData = new FormData();
        formData.append('avatar', file);
        return await axios.post(`${this.baseURL}/profile/upload-avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }

    // Progress APIs
    async getProgress() {
        this.setAuthHeader();
        return await axios.get(`${this.baseURL}/progress`);
    }

    async updateProgress(progressData) {
        this.setAuthHeader();
        return await axios.post(`${this.baseURL}/progress`, progressData);
    }

    // Roadmap APIs
    async getRoadmap() {
        return await axios.get(`${this.baseURL}/roadmap`);
    }

    async getResources(type) {
        const params = type ? { type } : {};
        return await axios.get(`${this.baseURL}/resources`, { params });
    }

    // Calendar APIs
    async getCalendarEvents(startDate, endDate) {
        this.setAuthHeader();
        const params = { start: startDate, end: endDate };
        return await axios.get(`${this.baseURL}/calendar`, { params });
    }

    async createCalendarEvent(eventData) {
        this.setAuthHeader();
        return await axios.post(`${this.baseURL}/calendar`, eventData);
    }

    async updateCalendarEvent(eventId, eventData) {
        this.setAuthHeader();
        return await axios.put(`${this.baseURL}/calendar/${eventId}`, eventData);
    }

    async deleteCalendarEvent(eventId) {
        this.setAuthHeader();
        return await axios.delete(`${this.baseURL}/calendar/${eventId}`);
    }

    // Pomodoro APIs
    async getPomodoroLogs(limit = 50, offset = 0) {
        this.setAuthHeader();
        const params = { limit, offset };
        return await axios.get(`${this.baseURL}/pomodoro`, { params });
    }

    async logPomodoro(sessionData) {
        this.setAuthHeader();
        return await axios.post(`${this.baseURL}/pomodoro`, sessionData);
    }

    // Notes APIs
    async getNotes(filters = {}) {
        this.setAuthHeader();
        return await axios.get(`${this.baseURL}/notes`, { params: filters });
    }

    async createNote(noteData) {
        this.setAuthHeader();
        return await axios.post(`${this.baseURL}/notes`, noteData);
    }

    async updateNote(noteId, noteData) {
        this.setAuthHeader();
        return await axios.put(`${this.baseURL}/notes/${noteId}`, noteData);
    }

    async deleteNote(noteId) {
        this.setAuthHeader();
        return await axios.delete(`${this.baseURL}/notes/${noteId}`);
    }

    // Notifications APIs
    async getNotifications(unreadOnly = false) {
        this.setAuthHeader();
        const params = { unread_only: unreadOnly };
        return await axios.get(`${this.baseURL}/notifications`, { params });
    }

    async markNotificationRead(notificationId) {
        this.setAuthHeader();
        return await axios.put(`${this.baseURL}/notifications/${notificationId}/read`);
    }

    async markAllNotificationsRead() {
        this.setAuthHeader();
        return await axios.put(`${this.baseURL}/notifications/read-all`);
    }

    // Dashboard APIs
    async getDashboardData() {
        this.setAuthHeader();
        return await axios.get(`${this.baseURL}/dashboard`);
    }

    async getAnalytics(days = 30) {
        this.setAuthHeader();
        const params = { days };
        return await axios.get(`${this.baseURL}/analytics/dashboard`, { params });
    }

    // Streak APIs
    async getStreaks() {
        this.setAuthHeader();
        return await axios.get(`${this.baseURL}/streaks`);
    }

    // AI APIs
    async generateStudyPlan(preferences) {
        this.setAuthHeader();
        return await axios.post(`${this.baseURL}/ai/generate-study-plan`, preferences);
    }

    // Search API
    async search(query) {
        this.setAuthHeader();
        const params = { q: query };
        return await axios.get(`${this.baseURL}/search`, { params });
    }

    // Settings APIs
    async getSettings() {
        this.setAuthHeader();
        return await axios.get(`${this.baseURL}/settings`);
    }

    async updateSettings(settings) {
        this.setAuthHeader();
        return await axios.put(`${this.baseURL}/settings`, settings);
    }
}

// Export API service instance
window.API = new APIService();