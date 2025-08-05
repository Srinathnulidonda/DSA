// API Management for DSA Learning Dashboard

class DSALearningAPI {
    constructor() {
        this.baseURL = 'http://apibackend/api';
        this.isOnline = navigator.onLine;
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.getAuthToken()
            }
        };

        const config = { ...defaultOptions, ...options };

        try {
            if (!this.isOnline) {
                return this.handleOfflineRequest(endpoint, config);
            }

            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.cacheResponse(endpoint, data);
            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            return this.getCachedResponse(endpoint);
        }
    }

    // Authentication
    getAuthToken() {
        return localStorage.getItem('authToken') || '';
    }

    setAuthToken(token) {
        localStorage.setItem('authToken', token);
    }

    // User Management
    async loginUser(email, password) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (response.token) {
                this.setAuthToken(response.token);
                return { success: true, user: response.user };
            }
            return { success: false, error: response.message };
        } catch (error) {
            return { success: false, error: 'Login failed' };
        }
    }

    async registerUser(userData) {
        try {
            const response = await this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.token) {
                this.setAuthToken(response.token);
                return { success: true, user: response.user };
            }
            return { success: false, error: response.message };
        } catch (error) {
            return { success: false, error: 'Registration failed' };
        }
    }

    async logoutUser() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
            localStorage.removeItem('authToken');
            return { success: true };
        } catch (error) {
            localStorage.removeItem('authToken');
            return { success: true };
        }
    }

    // Progress Management
    async saveProgress(progressData) {
        try {
            const response = await this.request('/progress', {
                method: 'POST',
                body: JSON.stringify(progressData)
            });
            return { success: true, data: response };
        } catch (error) {
            // Cache for offline sync
            this.cacheOfflineAction('saveProgress', progressData);
            return { success: false, error: 'Saved locally, will sync when online' };
        }
    }

    async getProgress() {
        try {
            const response = await this.request('/progress');
            return { success: true, data: response };
        } catch (error) {
            const cached = this.getCachedResponse('/progress');
            return { success: !!cached, data: cached };
        }
    }

    async updateProgress(progressData) {
        try {
            const response = await this.request('/progress', {
                method: 'PUT',
                body: JSON.stringify(progressData)
            });
            return { success: true, data: response };
        } catch (error) {
            this.cacheOfflineAction('updateProgress', progressData);
            return { success: false, error: 'Saved locally, will sync when online' };
        }
    }

    // Notes Management
    async saveNote(noteData) {
        try {
            const response = await this.request('/notes', {
                method: 'POST',
                body: JSON.stringify(noteData)
            });
            return { success: true, data: response };
        } catch (error) {
            this.cacheOfflineAction('saveNote', noteData);
            return { success: false, error: 'Saved locally, will sync when online' };
        }
    }

    async getNotes() {
        try {
            const response = await this.request('/notes');
            return { success: true, data: response };
        } catch (error) {
            const cached = this.getCachedResponse('/notes');
            return { success: !!cached, data: cached || [] };
        }
    }

    async updateNote(noteId, noteData) {
        try {
            const response = await this.request(`/notes/${noteId}`, {
                method: 'PUT',
                body: JSON.stringify(noteData)
            });
            return { success: true, data: response };
        } catch (error) {
            this.cacheOfflineAction('updateNote', { noteId, noteData });
            return { success: false, error: 'Saved locally, will sync when online' };
        }
    }

    async deleteNote(noteId) {
        try {
            const response = await this.request(`/notes/${noteId}`, {
                method: 'DELETE'
            });
            return { success: true, data: response };
        } catch (error) {
            this.cacheOfflineAction('deleteNote', { noteId });
            return { success: false, error: 'Will delete when online' };
        }
    }

    // Projects Management
    async saveProject(projectData) {
        try {
            const response = await this.request('/projects', {
                method: 'POST',
                body: JSON.stringify(projectData)
            });
            return { success: true, data: response };
        } catch (error) {
            this.cacheOfflineAction('saveProject', projectData);
            return { success: false, error: 'Saved locally, will sync when online' };
        }
    }

    async getProjects() {
        try {
            const response = await this.request('/projects');
            return { success: true, data: response };
        } catch (error) {
            const cached = this.getCachedResponse('/projects');
            return { success: !!cached, data: cached || [] };
        }
    }

    async updateProject(projectId, projectData) {
        try {
            const response = await this.request(`/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify(projectData)
            });
            return { success: true, data: response };
        } catch (error) {
            this.cacheOfflineAction('updateProject', { projectId, projectData });
            return { success: false, error: 'Saved locally, will sync when online' };
        }
    }

    async deleteProject(projectId) {
        try {
            const response = await this.request(`/projects/${projectId}`, {
                method: 'DELETE'
            });
            return { success: true, data: response };
        } catch (error) {
            this.cacheOfflineAction('deleteProject', { projectId });
            return { success: false, error: 'Will delete when online' };
        }
    }

    // Resources Management
    async getResources() {
        try {
            const response = await this.request('/resources');
            return { success: true, data: response };
        } catch (error) {
            const cached = this.getCachedResponse('/resources');
            if (cached) {
                return { success: true, data: cached };
            }
            // Return default resources if no cache
            return { success: true, data: await this.getDefaultResources() };
        }
    }

    async getDefaultResources() {
        try {
            const response = await fetch('/resources/dsa_resources.json');
            return await response.json();
        } catch (error) {
            return [];
        }
    }

    // Practice Problems
    async getPracticeProblems(topic = null, difficulty = null) {
        try {
            let endpoint = '/practice';
            const params = new URLSearchParams();
            if (topic) params.append('topic', topic);
            if (difficulty) params.append('difficulty', difficulty);
            if (params.toString()) endpoint += `?${params.toString()}`;

            const response = await this.request(endpoint);
            return { success: true, data: response };
        } catch (error) {
            const cached = this.getCachedResponse('/practice');
            return { success: !!cached, data: cached || [] };
        }
    }

    async markProblemSolved(problemId) {
        try {
            const response = await this.request(`/practice/${problemId}/solve`, {
                method: 'POST'
            });
            return { success: true, data: response };
        } catch (error) {
            this.cacheOfflineAction('markProblemSolved', { problemId });
            return { success: false, error: 'Will sync when online' };
        }
    }

    // Statistics
    async getStatistics() {
        try {
            const response = await this.request('/statistics');
            return { success: true, data: response };
        } catch (error) {
            const cached = this.getCachedResponse('/statistics');
            return { success: !!cached, data: cached };
        }
    }

    // Leaderboard
    async getLeaderboard() {
        try {
            const response = await this.request('/leaderboard');
            return { success: true, data: response };
        } catch (error) {
            const cached = this.getCachedResponse('/leaderboard');
            return { success: !!cached, data: cached || [] };
        }
    }

    // Caching Methods
    cacheResponse(endpoint, data) {
        const cacheKey = `api_cache_${endpoint}`;
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            expiry: Date.now() + (1000 * 60 * 30) // 30 minutes
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }

    getCachedResponse(endpoint) {
        const cacheKey = `api_cache_${endpoint}`;
        const cached = localStorage.getItem(cacheKey);

        if (!cached) return null;

        try {
            const cacheData = JSON.parse(cached);
            if (Date.now() > cacheData.expiry) {
                localStorage.removeItem(cacheKey);
                return null;
            }
            return cacheData.data;
        } catch (error) {
            localStorage.removeItem(cacheKey);
            return null;
        }
    }

    // Offline Support
    cacheOfflineAction(action, data) {
        const offlineActions = JSON.parse(localStorage.getItem('offlineActions') || '[]');
        offlineActions.push({
            action,
            data,
            timestamp: Date.now()
        });
        localStorage.setItem('offlineActions', JSON.stringify(offlineActions));
    }

    async syncOfflineData() {
        const offlineActions = JSON.parse(localStorage.getItem('offlineActions') || '[]');

        if (offlineActions.length === 0) return;

        console.log('Syncing offline data...', offlineActions);

        for (const action of offlineActions) {
            try {
                switch (action.action) {
                    case 'saveProgress':
                        await this.saveProgress(action.data);
                        break;
                    case 'updateProgress':
                        await this.updateProgress(action.data);
                        break;
                    case 'saveNote':
                        await this.saveNote(action.data);
                        break;
                    case 'updateNote':
                        await this.updateNote(action.data.noteId, action.data.noteData);
                        break;
                    case 'deleteNote':
                        await this.deleteNote(action.data.noteId);
                        break;
                    case 'saveProject':
                        await this.saveProject(action.data);
                        break;
                    case 'updateProject':
                        await this.updateProject(action.data.projectId, action.data.projectData);
                        break;
                    case 'deleteProject':
                        await this.deleteProject(action.data.projectId);
                        break;
                    case 'markProblemSolved':
                        await this.markProblemSolved(action.data.problemId);
                        break;
                }
            } catch (error) {
                console.error('Failed to sync action:', action, error);
            }
        }

        // Clear synced actions
        localStorage.setItem('offlineActions', '[]');
        showNotification('Offline data synced successfully!', 'success');
    }

    handleOfflineRequest(endpoint, config) {
        console.log('Handling offline request for:', endpoint);

        // Return cached data for GET requests
        if (!config.method || config.method === 'GET') {
            return this.getCachedResponse(endpoint);
        }

        // For other methods, cache the action
        const actionData = config.body ? JSON.parse(config.body) : {};
        this.cacheOfflineAction(`offline_${endpoint}`, actionData);

        throw new Error('Offline - data will be synced when online');
    }

    // Utility Methods
    clearCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('api_cache_')) {
                localStorage.removeItem(key);
            }
        });
    }

    getConnectionStatus() {
        return {
            online: this.isOnline,
            lastSync: localStorage.getItem('lastSyncTime'),
            pendingActions: JSON.parse(localStorage.getItem('offlineActions') || '[]').length
        };
    }

    // Export/Import Data
    async exportData() {
        try {
            const [progress, notes, projects] = await Promise.all([
                this.getProgress(),
                this.getNotes(),
                this.getProjects()
            ]);

            const exportData = {
                progress: progress.data,
                notes: notes.data,
                projects: projects.data,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            return { success: true, data: exportData };
        } catch (error) {
            return { success: false, error: 'Failed to export data' };
        }
    }

    async importData(importData) {
        try {
            const results = [];

            if (importData.progress) {
                const result = await this.updateProgress(importData.progress);
                results.push({ type: 'progress', success: result.success });
            }

            if (importData.notes && Array.isArray(importData.notes)) {
                for (const note of importData.notes) {
                    const result = await this.saveNote(note);
                    results.push({ type: 'note', success: result.success });
                }
            }

            if (importData.projects && Array.isArray(importData.projects)) {
                for (const project of importData.projects) {
                    const result = await this.saveProject(project);
                    results.push({ type: 'project', success: result.success });
                }
            }

            return { success: true, results };
        } catch (error) {
            return { success: false, error: 'Failed to import data' };
        }
    }

    // Rate Limiting
    isRateLimited(endpoint) {
        const rateLimitKey = `rate_limit_${endpoint}`;
        const lastRequest = localStorage.getItem(rateLimitKey);

        if (!lastRequest) {
            localStorage.setItem(rateLimitKey, Date.now().toString());
            return false;
        }

        const timeDiff = Date.now() - parseInt(lastRequest);
        const minInterval = 1000; // 1 second minimum between requests

        if (timeDiff < minInterval) {
            return true;
        }

        localStorage.setItem(rateLimitKey, Date.now().toString());
        return false;
    }
}

// Create global API instance
const dsaAPI = new DSALearningAPI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSALearningAPI;
}

// Make available globally
window.dsaAPI = dsaAPI;