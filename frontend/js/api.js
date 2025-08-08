// API Service with Real-time functionality
class APIService {
    constructor() {
        this.baseURL = 'https://dsa-nfyt.onrender.com';
        this.token = null;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.eventSource = null;
        this.websocket = null;
        this.isOnline = navigator.onLine;
        this.pendingRequests = [];

        // Real-time event handlers
        this.eventHandlers = {
            'progress-update': [],
            'achievement-unlock': [],
            'streak-update': [],
            'note-update': [],
            'calendar-update': []
        };

        this.initializeRealTime();
        this.setupNetworkMonitoring();
    }

    // Authentication Methods
    setAuthToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
        this.initializeRealTime(); // Reinitialize with new token
    }

    getAuthToken() {
        if (!this.token) {
            this.token = localStorage.getItem('authToken');
        }
        return this.token;
    }

    clearAuthToken() {
        this.token = null;
        localStorage.removeItem('authToken');
        this.closeRealTimeConnections();
    }

    // Real-time Setup
    initializeRealTime() {
        if (!this.getAuthToken()) return;

        // Initialize Server-Sent Events for real-time updates
        this.setupServerSentEvents();

        // Initialize WebSocket for real-time collaboration
        this.setupWebSocket();
    }

    setupServerSentEvents() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        const token = this.getAuthToken();
        if (!token) return;

        this.eventSource = new EventSource(`${this.baseURL}/api/realtime/events?token=${token}`);

        this.eventSource.onopen = () => {
            console.log('✅ Real-time events connected');
        };

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleRealTimeEvent(data);
            } catch (error) {
                console.error('Error parsing SSE data:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            // Attempt reconnection after delay
            setTimeout(() => {
                if (this.isOnline && this.getAuthToken()) {
                    this.setupServerSentEvents();
                }
            }, 5000);
        };

        // Listen for specific events
        this.eventSource.addEventListener('progress-update', (event) => {
            const data = JSON.parse(event.data);
            this.triggerEventHandlers('progress-update', data);
        });

        this.eventSource.addEventListener('achievement-unlock', (event) => {
            const data = JSON.parse(event.data);
            this.triggerEventHandlers('achievement-unlock', data);
        });

        this.eventSource.addEventListener('streak-update', (event) => {
            const data = JSON.parse(event.data);
            this.triggerEventHandlers('streak-update', data);
        });
    }

    setupWebSocket() {
        if (this.websocket) {
            this.websocket.close();
        }

        const token = this.getAuthToken();
        if (!token) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsURL = `${wsProtocol}//${this.baseURL.replace(/^https?:\/\//, '')}/ws?token=${token}`;

        this.websocket = new WebSocket(wsURL);

        this.websocket.onopen = () => {
            console.log('✅ WebSocket connected');
        };

        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket data:', error);
            }
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            // Attempt reconnection
            setTimeout(() => {
                if (this.isOnline && this.getAuthToken()) {
                    this.setupWebSocket();
                }
            }, 5000);
        };
    }

    closeRealTimeConnections() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }

    handleRealTimeEvent(data) {
        const { type, payload } = data;

        switch (type) {
            case 'progress-update':
                this.invalidateCache('progress');
                this.triggerEventHandlers('progress-update', payload);
                break;
            case 'achievement-unlock':
                this.invalidateCache('achievements');
                this.triggerEventHandlers('achievement-unlock', payload);
                break;
            case 'streak-update':
                this.invalidateCache('user-stats');
                this.triggerEventHandlers('streak-update', payload);
                break;
            case 'note-update':
                this.invalidateCache('notes');
                this.triggerEventHandlers('note-update', payload);
                break;
            case 'calendar-update':
                this.invalidateCache('calendar-events');
                this.triggerEventHandlers('calendar-update', payload);
                break;
        }
    }

    handleWebSocketMessage(data) {
        const { type, payload } = data;

        switch (type) {
            case 'live-study-session':
                this.handleLiveStudySession(payload);
                break;
            case 'collaborative-notes':
                this.handleCollaborativeNotes(payload);
                break;
            case 'real-time-chat':
                this.handleRealTimeChat(payload);
                break;
        }
    }

    // Event Handler Management
    addEventListener(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }

    removeEventListener(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    triggerEventHandlers(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Network Monitoring
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('📶 Network connection restored');
            this.initializeRealTime();
            this.processPendingRequests();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📵 Network connection lost');
            this.closeRealTimeConnections();
        });
    }

    // HTTP Request Methods
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : ''
            }
        };

        const requestOptions = { ...defaultOptions, ...options };
        if (requestOptions.headers.Authorization === 'Bearer ') {
            delete requestOptions.headers.Authorization;
        }

        // Check cache first for GET requests
        if (options.method === 'GET' || !options.method) {
            const cachedData = this.getFromCache(endpoint);
            if (cachedData) {
                return cachedData;
            }
        }

        // If offline, add to pending requests
        if (!this.isOnline && options.method !== 'GET') {
            return this.addToPendingRequests(endpoint, requestOptions);
        }

        try {
            const response = await this.makeRequestWithRetry(url, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Cache GET requests
            if (!options.method || options.method === 'GET') {
                this.setCache(endpoint, data);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);

            // For GET requests, try to return cached data as fallback
            if (!options.method || options.method === 'GET') {
                const cachedData = this.getFromCache(endpoint, true); // Get even expired cache
                if (cachedData) {
                    console.log('Returning cached data as fallback');
                    return cachedData;
                }
            }

            throw error;
        }
    }

    async makeRequestWithRetry(url, options, attempt = 1) {
        try {
            return await fetch(url, options);
        } catch (error) {
            if (attempt < this.retryAttempts) {
                console.log(`Request failed, retrying... (${attempt}/${this.retryAttempts})`);
                await this.delay(this.retryDelay * attempt);
                return this.makeRequestWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cache Management
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getFromCache(key, ignoreExpiry = false) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (!ignoreExpiry && Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    invalidateCache(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    // Offline Request Management
    addToPendingRequests(endpoint, options) {
        const request = { endpoint, options, timestamp: Date.now() };
        this.pendingRequests.push(request);

        // Store in localStorage for persistence
        localStorage.setItem('pendingAPIRequests', JSON.stringify(this.pendingRequests));

        return Promise.resolve({ pending: true, message: 'Request queued for when online' });
    }

    async processPendingRequests() {
        const storedRequests = localStorage.getItem('pendingAPIRequests');
        if (storedRequests) {
            this.pendingRequests = JSON.parse(storedRequests);
        }

        console.log(`Processing ${this.pendingRequests.length} pending requests...`);

        const results = [];
        for (const request of this.pendingRequests) {
            try {
                const result = await this.request(request.endpoint, request.options);
                results.push({ success: true, result });
            } catch (error) {
                console.error('Failed to process pending request:', error);
                results.push({ success: false, error });
            }
        }

        this.pendingRequests = [];
        localStorage.removeItem('pendingAPIRequests');

        return results;
    }

    // API Endpoint Methods

    // Authentication
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearAuthToken();
        }
    }

    // User Data
    async getUserStats() {
        return this.request('/api/user/stats');
    }

    async updateUserPreferences(preferences) {
        return this.request('/api/user/preferences', {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
    }

    async getUserPreferences() {
        return this.request('/api/user/preferences');
    }

    // Progress Tracking
    async getProgress(week = null) {
        const endpoint = week ? `/api/progress?week=${week}` : '/api/progress';
        return this.request(endpoint);
    }

    async updateProgress(progressData) {
        const result = await this.request('/api/progress', {
            method: 'POST',
            body: JSON.stringify(progressData)
        });

        // Emit real-time update
        this.emitRealTimeUpdate('progress-update', progressData);

        return result;
    }

    // Notes Management
    async getNotes(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/api/notes?${queryParams}` : '/api/notes';
        return this.request(endpoint);
    }

    async createNote(noteData) {
        const result = await this.request('/api/notes', {
            method: 'POST',
            body: JSON.stringify(noteData)
        });

        this.emitRealTimeUpdate('note-update', { action: 'create', note: result });
        return result;
    }

    async updateNote(noteId, noteData) {
        const result = await this.request(`/api/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify(noteData)
        });

        this.emitRealTimeUpdate('note-update', { action: 'update', noteId, note: noteData });
        return result;
    }

    async deleteNote(noteId) {
        const result = await this.request(`/api/notes/${noteId}`, {
            method: 'DELETE'
        });

        this.emitRealTimeUpdate('note-update', { action: 'delete', noteId });
        return result;
    }

    // Calendar Events
    async getCalendarEvents(startDate = null, endDate = null) {
        const params = new URLSearchParams();
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);

        const endpoint = params.toString() ? `/api/calendar?${params}` : '/api/calendar';
        return this.request(endpoint);
    }

    async createCalendarEvent(eventData) {
        const result = await this.request('/api/calendar', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });

        this.emitRealTimeUpdate('calendar-update', { action: 'create', event: result });
        return result;
    }

    async updateCalendarEvent(eventId, eventData) {
        const result = await this.request(`/api/calendar/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });

        this.emitRealTimeUpdate('calendar-update', { action: 'update', eventId, event: eventData });
        return result;
    }

    async deleteCalendarEvent(eventId) {
        const result = await this.request(`/api/calendar/${eventId}`, {
            method: 'DELETE'
        });

        this.emitRealTimeUpdate('calendar-update', { action: 'delete', eventId });
        return result;
    }

    // Roadmap Data
    async getRoadmap(week = null) {
        const endpoint = week ? `/api/roadmap?week=${week}` : '/api/roadmap';
        return this.request(endpoint);
    }

    async getRoadmapOverview() {
        return this.request('/api/roadmap/weeks');
    }

    async getDayDetails(week, day) {
        return this.request(`/api/roadmap/day/${week}/${day}`);
    }

    // Achievements
    async getAchievements() {
        return this.request('/api/achievements');
    }

    // Practice Platforms
    async getPracticePlatforms(category = null) {
        const endpoint = category ? `/api/practice?category=${category}` : '/api/practice';
        return this.request(endpoint);
    }

    // Review Topics
    async getReviewTopics() {
        return this.request('/api/review');
    }

    // Search
    async search(query) {
        return this.request(`/api/search?q=${encodeURIComponent(query)}`);
    }

    // Analytics
    async getAnalytics() {
        return this.request('/api/analytics');
    }

    // Leaderboard
    async getLeaderboard() {
        return this.request('/api/leaderboard');
    }

    // Daily Quote
    async getDailyQuote() {
        return this.request('/api/quotes/daily');
    }

    // Data Export/Import
    async exportData() {
        return this.request('/api/export');
    }

    async importData(data) {
        return this.request('/api/import', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Real-time Emission
    emitRealTimeUpdate(event, data) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'emit',
                event,
                data
            }));
        }
    }

    // Real-time Handlers
    handleLiveStudySession(data) {
        // Handle live study session updates
        console.log('Live study session update:', data);
    }

    handleCollaborativeNotes(data) {
        // Handle collaborative notes updates
        console.log('Collaborative notes update:', data);
    }

    handleRealTimeChat(data) {
        // Handle real-time chat messages
        console.log('Real-time chat message:', data);
    }

    // Health Check
    async healthCheck() {
        return this.request('/health');
    }

    // Utility Methods
    isConnected() {
        return this.isOnline && (
            (this.eventSource && this.eventSource.readyState === EventSource.OPEN) ||
            (this.websocket && this.websocket.readyState === WebSocket.OPEN)
        );
    }

    getConnectionStatus() {
        return {
            online: this.isOnline,
            eventSource: this.eventSource ? this.eventSource.readyState : null,
            websocket: this.websocket ? this.websocket.readyState : null,
            pendingRequests: this.pendingRequests.length
        };
    }
}