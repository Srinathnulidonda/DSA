// API and data management with updated endpoint
const API_BASE_URL = 'http://apibackend/api';

class APIManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.baseURL = API_BASE_URL;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.authToken = localStorage.getItem('authToken') || null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processSyncQueue();
            this.dashboard.showNotification('Back Online', 'Your data will now sync with the server.', 'info');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.dashboard.showNotification('Offline Mode', 'Working offline. Data will sync when connection is restored.', 'info');
        });
    }

    // HTTP request wrapper with authentication
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Add authentication token if available
        if (this.authToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);

            // Handle authentication errors
            if (response.status === 401) {
                this.handleAuthError();
                throw new Error('Authentication failed');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);

            // Add to sync queue if offline
            if (!this.isOnline) {
                this.addToSyncQueue(endpoint, finalOptions);
            }

            throw error;
        }
    }

    handleAuthError() {
        this.authToken = null;
        localStorage.removeItem('authToken');

        // Show login modal
        if (window.dashboard) {
            this.dashboard.showNotification('Session Expired', 'Please login again.', 'warning');
            showLoginModal();
        }
    }

    // Authentication endpoints
    async signIn(email, password) {
        try {
            const response = await this.request('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (response.token) {
                this.authToken = response.token;
                localStorage.setItem('authToken', response.token);

                // Store user info
                if (response.user) {
                    localStorage.setItem('userInfo', JSON.stringify(response.user));
                }

                // Load user data from server
                await this.loadUserData();

                this.dashboard.showNotification('Welcome Back!', 'Successfully signed in.', 'success');
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();

                return true;
            }
        } catch (error) {
            console.error('Sign in error:', error);
            this.dashboard.showNotification('Sign In Failed', 'Invalid email or password.', 'error');
            return false;
        }
    }

    async signUp(email, password, name = '') {
        try {
            const response = await this.request('/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, name })
            });

            if (response.token) {
                this.authToken = response.token;
                localStorage.setItem('authToken', response.token);

                // Store user info
                if (response.user) {
                    localStorage.setItem('userInfo', JSON.stringify(response.user));
                }

                this.dashboard.showNotification('Account Created!', 'Welcome to DSA Dashboard!', 'success');
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();

                return true;
            }
        } catch (error) {
            console.error('Sign up error:', error);
            this.dashboard.showNotification('Sign Up Failed', 'Could not create account. Try again.', 'error');
            return false;
        }
    }

    async logout() {
        try {
            // Sync any pending data before logout
            await this.syncAllData();

            // Clear authentication
            this.authToken = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');

            this.dashboard.showNotification('Signed Out', 'Successfully signed out.', 'info');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // User data management
    async loadUserData() {
        if (!this.authToken) return null;

        try {
            const response = await this.request('/user/progress');

            if (response.progress) {
                // Merge server data with local data
                this.dashboard.userData = this.mergeUserData(this.dashboard.userData, response.progress);
                this.dashboard.saveUserData();
                this.dashboard.loadDashboard();

                return response.progress;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            return null;
        }
    }

    async saveUserData() {
        if (!this.authToken) {
            // Save only locally if not authenticated
            return;
        }

        try {
            await this.request('/user/progress', {
                method: 'POST',
                body: JSON.stringify(this.dashboard.userData)
            });
        } catch (error) {
            console.error('Error saving user data:', error);
            // Data will be saved locally and queued for sync
        }
    }

    // Notes API
    async loadNotes() {
        if (!this.authToken) return [];

        try {
            const response = await this.request('/notes');
            return response.notes || [];
        } catch (error) {
            console.error('Error loading notes:', error);
            return [];
        }
    }

    async createNote(noteData) {
        if (!this.authToken) {
            this.addToSyncQueue('/notes', {
                method: 'POST',
                body: JSON.stringify(noteData)
            });
            return;
        }

        try {
            const response = await this.request('/notes', {
                method: 'POST',
                body: JSON.stringify(noteData)
            });
            return response;
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    }

    async updateNote(noteId, noteData) {
        if (!this.authToken) {
            this.addToSyncQueue(`/notes/${noteId}`, {
                method: 'PUT',
                body: JSON.stringify(noteData)
            });
            return;
        }

        try {
            const response = await this.request(`/notes/${noteId}`, {
                method: 'PUT',
                body: JSON.stringify(noteData)
            });
            return response;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    }

    async deleteNote(noteId) {
        if (!this.authToken) {
            this.addToSyncQueue(`/notes/${noteId}`, {
                method: 'DELETE'
            });
            return;
        }

        try {
            await this.request(`/notes/${noteId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    }

    // Projects API
    async loadProjects() {
        if (!this.authToken) return [];

        try {
            const response = await this.request('/projects');
            return response.projects || [];
        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
    }

    async createProject(projectData) {
        if (!this.authToken) {
            this.addToSyncQueue('/projects', {
                method: 'POST',
                body: JSON.stringify(projectData)
            });
            return;
        }

        try {
            const response = await this.request('/projects', {
                method: 'POST',
                body: JSON.stringify(projectData)
            });
            return response;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }

    async updateProject(projectId, projectData) {
        if (!this.authToken) {
            this.addToSyncQueue(`/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify(projectData)
            });
            return;
        }

        try {
            const response = await this.request(`/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify(projectData)
            });
            return response;
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    }

    async deleteProject(projectId) {
        if (!this.authToken) {
            this.addToSyncQueue(`/projects/${projectId}`, {
                method: 'DELETE'
            });
            return;
        }

        try {
            await this.request(`/projects/${projectId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    // Analytics API
    async getAnalytics() {
        if (!this.authToken) return null;

        try {
            const response = await this.request('/analytics');
            return response.analytics || null;
        } catch (error) {
            console.error('Error loading analytics:', error);
            return null;
        }
    }

    // Resource tracking
    async trackResourceClick(resourceName, category) {
        const clickData = {
            resource: resourceName,
            category: category,
            timestamp: new Date().toISOString()
        };

        // Store locally first
        if (!this.dashboard.userData.resourceClicks) {
            this.dashboard.userData.resourceClicks = [];
        }
        this.dashboard.userData.resourceClicks.push(clickData);
        this.dashboard.saveUserData();

        // Try to send to server
        if (this.authToken) {
            try {
                await this.request('/analytics/resource-click', {
                    method: 'POST',
                    body: JSON.stringify(clickData)
                });
            } catch (error) {
                console.error('Error tracking resource click:', error);
            }
        }
    }

    // Data synchronization
    addToSyncQueue(endpoint, options) {
        this.syncQueue.push({
            id: Date.now(),
            endpoint,
            options,
            timestamp: new Date().toISOString()
        });

        // Save queue to localStorage
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0 || !this.authToken) return;

        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            try {
                await this.request(item.endpoint, item.options);
            } catch (error) {
                console.error('Queue processing error:', error);
                // Re-add failed items to queue
                this.syncQueue.push(item);
            }
        }

        // Update localStorage
        if (this.syncQueue.length === 0) {
            localStorage.removeItem('syncQueue');
            this.dashboard.showNotification('Sync Complete', 'All changes have been synchronized.', 'success');
        } else {
            localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
        }
    }

    async syncAllData() {
        if (!this.authToken || !this.isOnline) return;

        try {
            // Save current user data
            await this.saveUserData();

            // Process sync queue
            await this.processSyncQueue();

            // Sync notes
            const localNotes = this.dashboard.userData.notes || [];
            for (const note of localNotes) {
                if (!note.synced) {
                    await this.createNote(note);
                    note.synced = true;
                }
            }

            // Sync projects
            const localProjects = this.dashboard.userData.projects || [];
            for (const project of localProjects) {
                if (!project.synced) {
                    await this.createProject(project);
                    project.synced = true;
                }
            }

            this.dashboard.saveUserData();
            this.dashboard.showNotification('Sync Complete', 'All data synchronized successfully.', 'success');
        } catch (error) {
            console.error('Sync error:', error);
            this.dashboard.showNotification('Sync Failed', 'Some data could not be synchronized.', 'error');
        }
    }

    mergeUserData(localData, serverData) {
        // Intelligent merge strategy - keep the most recent data
        const merged = { ...localData };

        // Merge simple fields
        Object.keys(serverData).forEach(key => {
            if (typeof serverData[key] !== 'object' || serverData[key] === null) {
                merged[key] = serverData[key];
            }
        });

        // Merge completedTasks
        if (serverData.completedTasks) {
            merged.completedTasks = { ...localData.completedTasks, ...serverData.completedTasks };
        }

        // Merge arrays (notes, projects) by ID
        ['notes', 'projects'].forEach(arrayKey => {
            if (serverData[arrayKey] && Array.isArray(serverData[arrayKey])) {
                const localItems = localData[arrayKey] || [];
                const serverItems = serverData[arrayKey];
                const mergedItems = new Map();

                // Add all local items
                localItems.forEach(item => {
                    mergedItems.set(item.id, item);
                });

                // Merge with server items
                serverItems.forEach(item => {
                    const existing = mergedItems.get(item.id);
                    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
                        mergedItems.set(item.id, item);
                    }
                });

                merged[arrayKey] = Array.from(mergedItems.values());
            }
        });

        return merged;
    }

    // External API integrations
    async fetchLeetCodeProfile(username) {
        try {
            // Using a proxy server to avoid CORS issues
            const response = await fetch(`${this.baseURL}/external/leetcode/${username}`);

            if (response.ok) {
                const data = await response.json();
                return {
                    username: data.username,
                    problemsSolved: data.submitStats?.acSubmissionNum?.find(item => item.difficulty === 'All')?.count || 0,
                    ranking: data.ranking
                };
            }
        } catch (error) {
            console.error('LeetCode API error:', error);
        }
        return null;
    }

    async fetchCodeforcesProfile(username) {
        try {
            const response = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'OK' && data.result.length > 0) {
                    const user = data.result[0];
                    return {
                        username: user.handle,
                        rating: user.rating,
                        maxRating: user.maxRating,
                        rank: user.rank
                    };
                }
            }
        } catch (error) {
            console.error('Codeforces API error:', error);
        }
        return null;
    }

    async fetchGitHubProfile(username) {
        try {
            const response = await fetch(`https://api.github.com/users/${username}`);

            if (response.ok) {
                const data = await response.json();
                return {
                    username: data.login,
                    name: data.name,
                    publicRepos: data.public_repos,
                    followers: data.followers,
                    following: data.following,
                    avatarUrl: data.avatar_url
                };
            }
        } catch (error) {
            console.error('GitHub API error:', error);
        }
        return null;
    }

    // Resource fetching with caching
    async loadWeeklyData(weekNumber) {
        const cacheKey = `week_${weekNumber}_data`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const parsedCache = JSON.parse(cached);
                // Check if cache is less than 24 hours old
                if (new Date() - new Date(parsedCache.timestamp) < 86400000) {
                    return parsedCache.data;
                }
            } catch (error) {
                console.error('Cache parse error:', error);
            }
        }

        try {
            const response = await fetch(`timetable/week-${weekNumber.toString().padStart(2, '0')}.json`);
            if (response.ok) {
                const data = await response.json();
                // Cache the data
                localStorage.setItem(cacheKey, JSON.stringify({
                    data,
                    timestamp: new Date().toISOString()
                }));
                return data;
            }
        } catch (error) {
            console.error('Error loading weekly data:', error);
        }
        return null;
    }

    async loadResourcesData() {
        const cacheKey = 'resources_data';
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (error) {
                console.error('Cache parse error:', error);
            }
        }

        try {
            const response = await fetch('resources/dsa_resources.json');
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(cacheKey, JSON.stringify(data));
                return data;
            }
        } catch (error) {
            console.error('Error loading resources data:', error);
        }
        return [];
    }

    async loadPracticeProblems() {
        const cacheKey = 'practice_problems';
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (error) {
                console.error('Cache parse error:', error);
            }
        }

        try {
            const response = await fetch('resources/practice_links.json');
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(cacheKey, JSON.stringify(data));
                return data;
            }
        } catch (error) {
            console.error('Error loading practice problems:', error);
        }
        return [];
    }

    async loadGlossary() {
        const cacheKey = 'glossary_data';
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (error) {
                console.error('Cache parse error:', error);
            }
        }

        try {
            const response = await fetch('resources/glossary.json');
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(cacheKey, JSON.stringify(data));
                return data;
            }
        } catch (error) {
            console.error('Error loading glossary:', error);
        }
        return [];
    }

    // Backup and restore
    async createBackup() {
        const backupData = {
            userData: this.dashboard.userData,
            timestamp: new Date().toISOString(),
            version: '1.1',
            device: navigator.userAgent
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `dsa-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.dashboard.showNotification('Backup Created', 'Your data has been downloaded.', 'success');
    }

    async restoreFromBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);

                    if (backupData.userData && backupData.version) {
                        // Confirm before restoring
                        if (confirm('This will replace your current data. Continue?')) {
                            this.dashboard.userData = {
                                ...this.dashboard.getDefaultUserData(),
                                ...backupData.userData
                            };

                            this.dashboard.saveUserData();
                            this.dashboard.loadDashboard();

                            // Sync to server if authenticated
                            if (this.authToken) {
                                this.syncAllData();
                            }

                            this.dashboard.showNotification('Restore Complete', 'Your data has been restored.', 'success');
                            resolve(backupData);
                        } else {
                            reject(new Error('Restore cancelled'));
                        }
                    } else {
                        reject(new Error('Invalid backup format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('File read error'));
            reader.readAsText(file);
        });
    }

    // Analytics and reporting
    generateAnalyticsReport() {
        const userData = this.dashboard.userData;
        const stats = this.dashboard.calculateStats();

        return {
            generatedAt: new Date().toISOString(),
            summary: {
                totalStudyTime: userData.studyTime,
                currentStreak: userData.streak,
                weeksCompleted: Object.values(userData.weekProgress).filter(p => p >= 100).length,
                totalNotes: userData.notes.length,
                totalProjects: userData.projects.length,
                problemsSolved: userData.problemsSolved || 0
            },
            weeklyProgress: userData.weekProgress,
            achievements: userData.achievements.length,
            projectBreakdown: {
                completed: userData.projects.filter(p => p.status === 'completed').length,
                inProgress: userData.projects.filter(p => p.status === 'in-progress').length,
                planned: userData.projects.filter(p => p.status === 'planned').length
            },
            learningVelocity: this.calculateLearningVelocity(),
            recommendations: this.generateRecommendations(),
            topResources: this.getTopResources()
        };
    }

    calculateLearningVelocity() {
        const userData = this.dashboard.userData;
        const completedTasks = Object.keys(userData.completedTasks).length;
        const daysSinceStart = userData.streak || 1;

        return {
            tasksPerDay: (completedTasks / daysSinceStart).toFixed(2),
            averageStudyTime: (userData.studyTime / daysSinceStart).toFixed(0),
            projectedCompletion: this.calculateProjectedCompletion()
        };
    }

    calculateProjectedCompletion() {
        const userData = this.dashboard.userData;
        const totalTasks = 14 * 15; // Approximate tasks
        const completedTasks = Object.keys(userData.completedTasks).length;
        const remainingTasks = totalTasks - completedTasks;
        const currentVelocity = completedTasks / (userData.streak || 1);

        return currentVelocity > 0 ? Math.ceil(remainingTasks / currentVelocity) : null;
    }

    generateRecommendations() {
        const userData = this.dashboard.userData;
        const recommendations = [];

        // Streak recommendation
        if (userData.streak < 7) {
            recommendations.push({
                type: 'consistency',
                message: 'Try to study daily to build a strong learning habit.',
                action: 'Set a daily reminder',
                priority: 'high'
            });
        }

        // Project recommendation
        const inProgressProjects = userData.projects.filter(p => p.status === 'in-progress').length;
        if (inProgressProjects > 2) {
            recommendations.push({
                type: 'focus',
                message: 'You have many projects in progress. Consider focusing on completing one first.',
                action: 'Prioritize projects',
                priority: 'medium'
            });
        }

        // Note-taking recommendation
        if (userData.notes.length < userData.currentWeek * 2) {
            recommendations.push({
                type: 'documentation',
                message: 'Consider taking more notes to reinforce your learning.',
                action: 'Add notes after each study session',
                priority: 'low'
            });
        }

        // Practice recommendation
        if (userData.problemsSolved < userData.currentWeek * 5) {
            recommendations.push({
                type: 'practice',
                message: 'Solve more practice problems to strengthen your skills.',
                action: 'Try daily coding challenges',
                priority: 'high'
            });
        }

        return recommendations;
    }

    getTopResources() {
        const clicks = this.dashboard.userData.resourceClicks || [];
        const resourceCounts = {};

        clicks.forEach(click => {
            resourceCounts[click.resource] = (resourceCounts[click.resource] || 0) + 1;
        });

        return Object.entries(resourceCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([resource, count]) => ({ resource, count }));
    }

    // Export analytics report
    async exportAnalyticsReport() {
        const report = this.generateAnalyticsReport();
        const csvContent = this.convertReportToCSV(report);

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `dsa-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        this.dashboard.showNotification('Report Exported', 'Analytics report downloaded.', 'success');
    }

    convertReportToCSV(report) {
        let csv = 'DSA Learning Analytics Report\n';
        csv += `Generated: ${report.generatedAt}\n\n`;

        csv += 'Summary\n';
        csv += 'Metric,Value\n';
        Object.entries(report.summary).forEach(([key, value]) => {
            csv += `${key},${value}\n`;
        });

        csv += '\nWeekly Progress\n';
        csv += 'Week,Progress %\n';
        Object.entries(report.weeklyProgress).forEach(([week, progress]) => {
            csv += `Week ${week},${progress}%\n`;
        });

        csv += '\nLearning Velocity\n';
        Object.entries(report.learningVelocity).forEach(([key, value]) => {
            csv += `${key},${value}\n`;
        });

        return csv;
    }
}

// Global functions for authentication
function signIn() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (window.api) {
        window.api.signIn(email, password);
    }
}

function signUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (window.api) {
        window.api.signUp(email, password);
    }
}

function logout() {
    if (window.api) {
        window.api.logout();
    }
}

function showLoginModal() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

// Initialize when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.dashboard) {
            window.api = new APIManager(window.dashboard);

            // Load sync queue from localStorage
            const savedQueue = localStorage.getItem('syncQueue');
            if (savedQueue) {
                try {
                    window.api.syncQueue = JSON.parse(savedQueue);
                } catch (error) {
                    console.error('Error loading sync queue:', error);
                }
            }

            // Auto-sync if authenticated
            if (window.api.authToken && window.api.isOnline) {
                window.api.processSyncQueue();
            }
        }
    }, 100);
});