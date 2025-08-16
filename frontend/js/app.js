// Main application initialization and shared functionality

class DSALearningApp {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        // Check authentication status
        await this.checkAuth();

        // Initialize global components
        this.setupGlobalEventListeners();
        this.setupServiceWorker();
        this.setupNotificationPermissions();

        // Initialize page-specific functionality
        this.initializePage();

        this.isInitialized = true;
        console.log('DSA Learning App initialized');
    }

    async checkAuth() {
        const token = localStorage.getItem(STORAGE_KEYS.accessToken);
        if (!token) {
            if (!this.isOnAuthPage()) {
                window.location.href = '/';
            }
            return;
        }

        try {
            // Verify token and get user data
            const userData = await api.get(API_ENDPOINTS.profile);
            this.currentUser = userData.user;
            storage.set(STORAGE_KEYS.user, userData.user);

            // Update UI with user data
            this.updateUserInterface();

        } catch (error) {
            console.error('Auth check failed:', error);
            // Token might be expired, try to refresh
            const refreshed = await api.refreshToken();
            if (!refreshed) {
                // Refresh failed, redirect to login
                localStorage.clear();
                if (!this.isOnAuthPage()) {
                    window.location.href = '/';
                }
            }
        }
    }

    isOnAuthPage() {
        const path = window.location.pathname;
        return path === '/' || path === '/index.html' || path.includes('login') || path.includes('register');
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Update user name displays
        const userNameElements = document.querySelectorAll('#userName, #welcomeUserName, #profileName');
        userNameElements.forEach(el => {
            if (el) el.textContent = this.currentUser.username;
        });

        // Update email displays
        const emailElements = document.querySelectorAll('#profileEmail');
        emailElements.forEach(el => {
            if (el) el.textContent = this.currentUser.email;
        });

        // Update avatar
        const avatarElements = document.querySelectorAll('#userAvatar, #profileAvatar');
        avatarElements.forEach(el => {
            if (el) {
                if (this.currentUser.avatar_url) {
                    el.src = this.currentUser.avatar_url;
                } else {
                    el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.username)}&background=3b82f6&color=fff&size=128`;
                }
            }
        });

        // Update join date if available
        const joinDateEl = document.getElementById('joinDate');
        if (joinDateEl && this.currentUser.created_at) {
            const joinDate = new Date(this.currentUser.created_at);
            joinDateEl.textContent = joinDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        }
    }

    setupGlobalEventListeners() {
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenu = document.getElementById('mobileMenu');

        if (mobileMenuToggle && mobileMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }

        // Profile dropdown
        const profileToggle = document.getElementById('profileToggle');
        const profileDropdown = document.getElementById('profileDropdown');

        if (profileToggle && profileDropdown) {
            profileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!profileDropdown.contains(e.target) && !profileToggle.contains(e.target)) {
                    profileDropdown.classList.add('hidden');
                }
            });
        }

        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.performGlobalSearch(globalSearch.value);
                }
            });

            // Mobile search
            const mobileSearchInput = document.getElementById('mobileSearchInput');
            if (mobileSearchInput) {
                mobileSearchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.performGlobalSearch(mobileSearchInput.value);
                    }
                });
            }
        }

        // Logout functionality
        const logoutBtns = document.querySelectorAll('#logoutBtn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });

        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-modal-close')) {
                const modal = e.target.closest('[id*="Modal"]');
                if (modal) {
                    modalManager.close(modal);
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window resize handler for responsive adjustments
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Online/offline status
        window.addEventListener('online', () => {
            notificationManager.success('Connection restored');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            notificationManager.warning('You are offline. Some features may be limited.');
        });
    }

    async performGlobalSearch(query) {
        if (!query.trim()) return;

        try {
            loadingManager.show('#searchResults', 'Searching...');
            const results = await api.get(`${API_ENDPOINTS.search}?q=${encodeURIComponent(query)}`);

            // Display search results (implement based on your needs)
            console.log('Search results:', results);

            // For now, just show a notification
            notificationManager.info(`Found ${results.results?.resources?.length || 0} resources`);

        } catch (error) {
            console.error('Search failed:', error);
            notificationManager.error('Search failed. Please try again.');
        } finally {
            loadingManager.hideAll();
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalSearch') || document.getElementById('mobileSearchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            modalManager.closeAll();
        }

        // Alt + 1-5 for navigation (desktop only)
        if (e.altKey && !mobileUtils.isMobile()) {
            const num = parseInt(e.key);
            const navLinks = {
                1: 'dashboard.html',
                2: 'roadmap.html',
                3: 'progress.html',
                4: 'calendar.html',
                5: 'profile.html'
            };

            if (navLinks[num]) {
                e.preventDefault();
                window.location.href = navLinks[num];
            }
        }
    }

    handleResize() {
        // Adjust layouts for different screen sizes
        if (mobileUtils.isMobile()) {
            // Mobile-specific adjustments
            document.body.classList.add('mobile-layout');
        } else {
            document.body.classList.remove('mobile-layout');
        }

        // Update charts if they exist
        if (window.Chart) {
            Chart.helpers.each(Chart.instances, (instance) => {
                instance.resize();
            });
        }
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    async setupNotificationPermissions() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't ask immediately, wait for user interaction
            const preferences = storage.get(STORAGE_KEYS.preferences) || {};
            if (preferences.notificationsRequested !== true) {
                setTimeout(() => {
                    this.requestNotificationPermission();
                }, 30000); // Wait 30 seconds
            }
        }
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            const preferences = storage.get(STORAGE_KEYS.preferences) || {};
            preferences.notificationsRequested = true;
            preferences.notificationsEnabled = permission === 'granted';
            storage.set(STORAGE_KEYS.preferences, preferences);

            if (permission === 'granted') {
                notificationManager.success('Notifications enabled! You\'ll get reminders for your study sessions.');
            }
        } catch (error) {
            console.error('Notification permission request failed:', error);
        }
    }

    showNotification(title, options = {}) {
        const preferences = storage.get(STORAGE_KEYS.preferences) || {};
        if (!preferences.notificationsEnabled) return;

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/badge-72x72.png',
                ...options
            });
        }
    }

    initializePage() {
        const currentPage = this.getCurrentPage();

        // Initialize page-specific functionality
        switch (currentPage) {
            case 'dashboard':
                this.initDashboard();
                break;
            case 'roadmap':
                this.initRoadmap();
                break;
            case 'progress':
                this.initProgress();
                break;
            case 'calendar':
                this.initCalendar();
                break;
            case 'notes':
                this.initNotes();
                break;
            case 'pomodoro':
                this.initPomodoro();
                break;
            case 'profile':
                this.initProfile();
                break;
            case 'analytics':
                this.initAnalytics();
                break;
        }

        // Update active navigation
        this.updateActiveNavigation(currentPage);
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('dashboard') || path === '/') return 'dashboard';
        if (path.includes('roadmap')) return 'roadmap';
        if (path.includes('progress')) return 'progress';
        if (path.includes('calendar')) return 'calendar';
        if (path.includes('notes')) return 'notes';
        if (path.includes('pomodoro')) return 'pomodoro';
        if (path.includes('profile')) return 'profile';
        if (path.includes('analytics')) return 'analytics';
        return 'dashboard';
    }

    updateActiveNavigation(currentPage) {
        // Update desktop navigation
        const navLinks = document.querySelectorAll('nav a[href*=".html"]');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes(currentPage)) {
                link.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-300');
                link.classList.add('border-blue-500', 'text-gray-900', 'dark:text-white');
            } else {
                link.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-300');
                link.classList.remove('border-blue-500', 'text-gray-900', 'dark:text-white');
            }
        });

        // Update mobile navigation
        const mobileNavLinks = document.querySelectorAll('.mobile-nav a, nav[class*="bottom"] a');
        mobileNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes(currentPage)) {
                link.classList.remove('text-gray-400');
                link.classList.add('text-blue-600', 'dark:text-blue-400');
            } else {
                link.classList.add('text-gray-400');
                link.classList.remove('text-blue-600', 'dark:text-blue-400');
            }
        });
    }

    // Page initialization methods (to be overridden by page-specific managers)
    initDashboard() {
        // Handled by DashboardManager
    }

    initRoadmap() {
        // Handled by RoadmapManager
    }

    initProgress() {
        // Handled by ProgressManager
    }

    initCalendar() {
        // Handled by CalendarManager
    }

    initNotes() {
        // Handled by NotesManager
    }

    initPomodoro() {
        // Handled by PomodoroManager
    }

    initProfile() {
        // Handled by ProfileManager
    }

    initAnalytics() {
        // Handled by AnalyticsManager
    }

    async syncOfflineData() {
        // Sync any offline data when connection is restored
        const offlineData = storage.get('offlineData') || [];
        if (offlineData.length === 0) return;

        try {
            for (const data of offlineData) {
                await api.post(data.endpoint, data.payload);
            }

            storage.remove('offlineData');
            notificationManager.success('Offline data synced successfully');

        } catch (error) {
            console.error('Offline data sync failed:', error);
            notificationManager.error('Failed to sync offline data');
        }
    }

    storeOfflineData(endpoint, payload) {
        const offlineData = storage.get('offlineData') || [];
        offlineData.push({
            endpoint,
            payload,
            timestamp: Date.now()
        });
        storage.set('offlineData', offlineData);
    }

    logout() {
        // Clear all local data
        localStorage.clear();
        sessionStorage.clear();

        // Clear any running timers or intervals
        if (window.pomodoroManager && window.pomodoroManager.timer) {
            window.pomodoroManager.stopTimer();
        }

        // Show goodbye message
        notificationManager.info('You have been logged out. See you soon!');

        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }

    // Utility methods
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    formatDate(date, format = 'medium') {
        const d = new Date(date);
        const options = {
            short: { month: 'short', day: 'numeric' },
            medium: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
        };

        return d.toLocaleDateString('en-US', options[format] || options.medium);
    }

    calculateProgress(completed, total) {
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dsaApp = new DSALearningApp();
});

// Export for use in other scripts
window.DSALearningApp = DSALearningApp;