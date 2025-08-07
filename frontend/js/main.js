// Main Application Logic
class DSALearningApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.roadmapData = null;
        this.userProgress = {};
        this.userNotes = [];
        this.calendarEvents = [];
        this.achievements = [];
        this.userStats = {};
        this.isLoading = false;

        // Initialize services
        this.api = new APIService();
        this.storage = new LocalStorageService();
        this.auth = new AuthenticationService();
        this.notes = new NotesService();

        // Bind methods
        this.handleRouteChange = this.handleRouteChange.bind(this);
        this.handleResize = this.handleResize.bind(this);

        // Initialize event listeners
        this.initializeEventListeners();

        console.log('🚀 DSA Learning App Initialized');
    }

    async init() {
        try {
            this.showLoading();

            // Check authentication status
            const isAuthenticated = await this.auth.checkAuthStatus();

            if (isAuthenticated) {
                await this.initializeApp();
            } else {
                this.showAuthModal();
            }

        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showNotification('Failed to initialize app', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    async initializeApp() {
        try {
            // Load user data
            await this.loadUserData();

            // Load roadmap data
            await this.loadRoadmapData();

            // Initialize UI components
            await this.initializeUI();

            // Set up routing
            this.initializeRouting();

            // Load initial page
            await this.loadPage(this.getInitialPage());

            // Start periodic data sync
            this.startDataSync();

            console.log('✅ App fully initialized');

        } catch (error) {
            console.error('❌ App initialization error:', error);
            this.showNotification('Error loading app data', 'danger');
        }
    }

    initializeEventListeners() {
        // Window events
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));

        // Route change events
        window.addEventListener('popstate', this.handleRouteChange);

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Theme change
        document.addEventListener('click', (e) => {
            if (e.target.matches('.theme-toggle, .theme-toggle *')) {
                this.toggleTheme();
            }
        });

        // Search functionality
        document.addEventListener('input', (e) => {
            if (e.target.matches('.search-input')) {
                this.handleSearch(e.target.value);
            }
        });

        // Progress tracking
        document.addEventListener('change', (e) => {
            if (e.target.matches('.completion-checkbox')) {
                this.handleTopicCompletion(e.target);
            }
        });

        // Note actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.note-edit-btn')) {
                this.editNote(e.target.dataset.noteId);
            } else if (e.target.matches('.note-delete-btn')) {
                this.deleteNote(e.target.dataset.noteId);
            }
        });

        // Calendar events
        document.addEventListener('click', (e) => {
            if (e.target.matches('.calendar-day')) {
                this.handleCalendarDayClick(e.target);
            }
        });
    }

    async loadUserData() {
        try {
            // Load user stats
            this.userStats = await this.api.getUserStats();

            // Load user progress
            this.userProgress = await this.api.getProgress();

            // Load user notes
            this.userNotes = await this.api.getNotes();

            // Load achievements
            this.achievements = await this.api.getAchievements();

            // Load calendar events
            this.calendarEvents = await this.api.getCalendarEvents();

            console.log('✅ User data loaded successfully');

        } catch (error) {
            console.error('❌ Error loading user data:', error);

            // Try to load from local storage as fallback
            this.userStats = this.storage.get('userStats') || {};
            this.userProgress = this.storage.get('userProgress') || {};
            this.userNotes = this.storage.get('userNotes') || [];
            this.achievements = this.storage.get('achievements') || [];
            this.calendarEvents = this.storage.get('calendarEvents') || [];
        }
    }

    async loadRoadmapData() {
        try {
            this.roadmapData = await this.api.getRoadmap();
            this.storage.set('roadmapData', this.roadmapData);
            console.log('✅ Roadmap data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading roadmap data:', error);
            // Load from local storage as fallback
            this.roadmapData = this.storage.get('roadmapData');
        }
    }

    async initializeUI() {
        // Load navbar
        await this.loadComponent('navbar');

        // Load sidebar (desktop)
        if (window.innerWidth >= 992) {
            await this.loadComponent('sidebar');
        }

        // Load bottom navigation (mobile)
        if (window.innerWidth < 992) {
            await this.loadComponent('bottomNav');
        }

        // Initialize theme
        this.initializeTheme();

        // Initialize tooltips and popovers
        this.initializeBootstrapComponents();

        // Set up periodic updates
        this.setupPeriodicUpdates();

        console.log('✅ UI components initialized');
    }

    initializeRouting() {
        // Handle initial route
        const path = window.location.pathname;
        const page = this.getPageFromPath(path);
        this.currentPage = page;

        // Set up navigation event listeners
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[data-page]')) {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateTo(page);
            }
        });
    }

    async loadPage(page) {
        try {
            this.showPageLoading();

            // Update current page
            this.currentPage = page;

            // Update URL
            const url = this.getUrlForPage(page);
            window.history.pushState({ page }, '', url);

            // Update navigation state
            this.updateNavigationState(page);

            // Load page content
            await this.loadPageContent(page);

            // Update page title
            this.updatePageTitle(page);

            console.log(`✅ Page loaded: ${page}`);

        } catch (error) {
            console.error(`❌ Error loading page ${page}:`, error);
            this.showNotification('Error loading page', 'danger');
        } finally {
            this.hidePageLoading();
        }
    }

    async loadPageContent(page) {
        const contentContainer = document.getElementById('pageContent');

        switch (page) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'roadmap':
                await this.loadRoadmap();
                break;
            case 'progress':
                await this.loadProgress();
                break;
            case 'calendar':
                await this.loadCalendar();
                break;
            case 'notes':
                await this.loadNotes();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'profile':
                await this.loadProfile();
                break;
            case 'achievements':
                await this.loadAchievements();
                break;
            case 'settings':
                await this.loadSettings();
                break;
            case 'search':
                await this.loadSearch();
                break;
            case 'review':
                await this.loadReview();
                break;
            default:
                await this.loadDashboard();
        }
    }

    async loadDashboard() {
        const content = await this.loadTemplate('dashboard');
        document.getElementById('pageContent').innerHTML = content;

        // Initialize dashboard components
        await this.initializeDashboardComponents();
    }

    async initializeDashboardComponents() {
        // Load motivational quote
        await this.loadDailyQuote();

        // Update progress statistics
        this.updateProgressStats();

        // Load recent activities
        this.loadRecentActivities();

        // Initialize progress charts
        this.initializeProgressCharts();

        // Load upcoming events
        this.loadUpcomingEvents();

        // Initialize streak information
        this.updateStreakInfo();
    }

    async loadDailyQuote() {
        try {
            const quote = await this.api.getDailyQuote();
            const quoteElement = document.querySelector('.motivational-quote');
            const authorElement = document.querySelector('.motivational-author');

            if (quoteElement && authorElement) {
                quoteElement.textContent = quote.quote;
                authorElement.textContent = `— ${quote.author}`;

                // Add animation
                quoteElement.parentElement.classList.add('fade-in');
            }
        } catch (error) {
            console.error('Error loading daily quote:', error);
        }
    }

    updateProgressStats() {
        const stats = this.calculateProgressStats();

        // Update overall progress
        const overallProgress = document.querySelector('.overall-progress');
        if (overallProgress) {
            this.updateProgressBar(overallProgress, stats.overallPercentage);
        }

        // Update stats cards
        this.updateStatsCard('completed-topics', stats.completedTopics);
        this.updateStatsCard('total-time', stats.totalTime);
        this.updateStatsCard('current-streak', stats.currentStreak);
        this.updateStatsCard('current-level', stats.currentLevel);
    }

    calculateProgressStats() {
        const completedTopics = this.userProgress.filter(p => p.completed).length;
        const totalTopics = this.getTotalTopicsCount();
        const overallPercentage = totalTopics ? (completedTopics / totalTopics) * 100 : 0;
        const totalTime = this.userProgress.reduce((sum, p) => sum + (p.time_spent || 0), 0);

        return {
            completedTopics,
            totalTopics,
            overallPercentage: Math.round(overallPercentage),
            totalTime: Math.round(totalTime),
            currentStreak: this.userStats.current_streak || 0,
            currentLevel: this.userStats.level || 1
        };
    }

    getTotalTopicsCount() {
        if (!this.roadmapData) return 0;

        return Object.values(this.roadmapData).reduce((total, week) => {
            return total + Object.keys(week.days).length;
        }, 0);
    }

    updateStatsCard(id, value) {
        const element = document.querySelector(`[data-stat="${id}"]`);
        if (element) {
            element.textContent = value;
            element.classList.add('bounce-in');
        }
    }

    updateProgressBar(element, percentage) {
        const progressFill = element.querySelector('.progress-bar-fill');
        const progressText = element.querySelector('.progress-percentage');

        if (progressFill && progressText) {
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${percentage}%`;

            // Add animation
            progressFill.classList.add('progress-animation');
        }
    }

    loadRecentActivities() {
        const recentActivities = this.getRecentActivities();
        const container = document.querySelector('.recent-activities');

        if (container && recentActivities.length > 0) {
            container.innerHTML = recentActivities.map(activity => `
                <div class="activity-item fade-in delay-${activity.index * 100}">
                    <div class="activity-icon">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    getRecentActivities() {
        const activities = [];

        // Add recent progress updates
        this.userProgress
            .filter(p => p.updated_at)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 5)
            .forEach((progress, index) => {
                activities.push({
                    index,
                    icon: progress.completed ? 'fas fa-check-circle text-success' : 'fas fa-clock text-warning',
                    title: `${progress.completed ? 'Completed' : 'Studied'} ${progress.topic}`,
                    time: this.formatRelativeTime(progress.updated_at)
                });
            });

        // Add recent notes
        this.userNotes
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3)
            .forEach((note, index) => {
                activities.push({
                    index: activities.length,
                    icon: 'fas fa-sticky-note text-info',
                    title: `Added note: ${note.topic}`,
                    time: this.formatRelativeTime(note.created_at)
                });
            });

        return activities.slice(0, 8);
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString();
    }

    initializeProgressCharts() {
        // Weekly progress chart
        this.initializeWeeklyChart();

        // Time distribution chart
        this.initializeTimeChart();

        // Difficulty distribution chart
        this.initializeDifficultyChart();
    }

    initializeWeeklyChart() {
        const canvas = document.getElementById('weeklyProgressChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.getWeeklyProgressData();

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Topics Completed',
                    data: data.values,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    getWeeklyProgressData() {
        const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'];
        const values = weeks.map(week => {
            const weekKey = week.toLowerCase().replace(' ', '_');
            return this.userProgress.filter(p => p.week === weekKey && p.completed).length;
        });

        return { labels: weeks, values };
    }

    initializeTimeChart() {
        const canvas = document.getElementById('timeDistributionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.getTimeDistributionData();

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'rgb(99, 102, 241)',
                        'rgb(139, 92, 246)',
                        'rgb(6, 182, 212)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    getTimeDistributionData() {
        const categories = {
            'Arrays & Strings': 0,
            'Linked Lists': 0,
            'Trees & Graphs': 0,
            'Dynamic Programming': 0,
            'Other Topics': 0
        };

        this.userProgress.forEach(progress => {
            const topic = progress.topic.toLowerCase();
            if (topic.includes('array') || topic.includes('string')) {
                categories['Arrays & Strings'] += progress.time_spent || 0;
            } else if (topic.includes('linked') || topic.includes('list')) {
                categories['Linked Lists'] += progress.time_spent || 0;
            } else if (topic.includes('tree') || topic.includes('graph')) {
                categories['Trees & Graphs'] += progress.time_spent || 0;
            } else if (topic.includes('dynamic') || topic.includes('dp')) {
                categories['Dynamic Programming'] += progress.time_spent || 0;
            } else {
                categories['Other Topics'] += progress.time_spent || 0;
            }
        });

        return {
            labels: Object.keys(categories),
            values: Object.values(categories)
        };
    }

    loadUpcomingEvents() {
        const upcomingEvents = this.getUpcomingEvents();
        const container = document.querySelector('.upcoming-events');

        if (container) {
            if (upcomingEvents.length > 0) {
                container.innerHTML = upcomingEvents.map((event, index) => `
                    <div class="event-item slide-in-up delay-${index * 100}">
                        <div class="event-date">
                            <div class="event-day">${event.day}</div>
                            <div class="event-month">${event.month}</div>
                        </div>
                        <div class="event-content">
                            <div class="event-title">${event.title}</div>
                            <div class="event-time">${event.time}</div>
                        </div>
                        <div class="event-type">
                            <span class="badge bg-${event.type === 'study' ? 'primary' : 'success'}">${event.type}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-calendar-alt text-muted fa-3x mb-3"></i>
                        <p class="text-muted">No upcoming events</p>
                    </div>
                `;
            }
        }
    }

    getUpcomingEvents() {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return this.calendarEvents
            .filter(event => {
                const eventDate = new Date(event.date);
                return eventDate >= now && eventDate <= nextWeek;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5)
            .map(event => {
                const date = new Date(event.date);
                return {
                    title: event.title,
                    day: date.getDate(),
                    month: date.toLocaleDateString('en', { month: 'short' }),
                    time: event.time || 'All day',
                    type: event.type || 'study'
                };
            });
    }

    updateStreakInfo() {
        const currentStreak = this.userStats.current_streak || 0;
        const totalStreak = this.userStats.total_streak || 0;

        const currentStreakEl = document.querySelector('.current-streak-number');
        const totalStreakEl = document.querySelector('.total-streak-number');

        if (currentStreakEl) {
            currentStreakEl.textContent = currentStreak;
            if (currentStreak > 0) {
                currentStreakEl.parentElement.classList.add('streak-fire');
            }
        }

        if (totalStreakEl) {
            totalStreakEl.textContent = totalStreak;
        }
    }

    // Navigation methods
    navigateTo(page) {
        this.loadPage(page);
    }

    handleRouteChange() {
        const page = this.getPageFromPath(window.location.pathname);
        if (page !== this.currentPage) {
            this.loadPage(page);
        }
    }

    getPageFromPath(path) {
        const segments = path.split('/').filter(s => s);
        return segments[0] || 'dashboard';
    }

    getUrlForPage(page) {
        return page === 'dashboard' ? '/' : `/${page}`;
    }

    getInitialPage() {
        return this.getPageFromPath(window.location.pathname);
    }

    updateNavigationState(page) {
        // Update sidebar navigation
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Update bottom navigation
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
    }

    updatePageTitle(page) {
        const titles = {
            'dashboard': 'Dashboard - DSA Learning Platform',
            'roadmap': 'Learning Roadmap - DSA Learning Platform',
            'progress': 'Progress Tracking - DSA Learning Platform',
            'calendar': 'Calendar - DSA Learning Platform',
            'notes': 'My Notes - DSA Learning Platform',
            'analytics': 'Analytics - DSA Learning Platform',
            'profile': 'Profile - DSA Learning Platform',
            'achievements': 'Achievements - DSA Learning Platform',
            'settings': 'Settings - DSA Learning Platform',
            'search': 'Search - DSA Learning Platform',
            'review': 'Review - DSA Learning Platform'
        };

        document.title = titles[page] || 'DSA Learning Platform';
    }

    // Component loading methods
    async loadComponent(componentName) {
        try {
            const component = await this.loadTemplate(componentName);
            const targetElement = document.getElementById(componentName);

            if (targetElement) {
                targetElement.innerHTML = component;
                await this.initializeComponentLogic(componentName);
            }
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
        }
    }

    async loadTemplate(templateName) {
        try {
            const response = await fetch(`components/${templateName}.html`);
            if (!response.ok) {
                throw new Error(`Template not found: ${templateName}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return this.getDefaultTemplate(templateName);
        }
    }

    getDefaultTemplate(templateName) {
        const templates = {
            navbar: `
                <div class="container-fluid">
                    <a class="navbar-brand" href="#" data-page="dashboard">
                        <i class="fas fa-code"></i>
                        DSA Learning
                    </a>
                    <div class="navbar-nav ms-auto d-flex flex-row align-items-center">
                        <div class="search-container me-3">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" class="form-control search-input" placeholder="Search topics, notes..." />
                        </div>
                        <button class="theme-toggle me-3" title="Toggle Theme">
                            <i class="fas fa-sun"></i>
                            <i class="fas fa-moon"></i>
                        </button>
                        <div class="navbar-profile">
                            <img src="https://via.placeholder.com/40" alt="Profile" class="profile-avatar">
                            <div class="profile-info">
                                <div class="profile-name">User</div>
                                <div class="profile-level">Level 1</div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            sidebar: `
                <nav class="sidebar-nav">
                    <a href="#" class="nav-link active" data-page="dashboard">
                        <i class="fas fa-home"></i>
                        Dashboard
                    </a>
                    <a href="#" class="nav-link" data-page="roadmap">
                        <i class="fas fa-road"></i>
                        Roadmap
                    </a>
                    <a href="#" class="nav-link" data-page="progress">
                        <i class="fas fa-chart-line"></i>
                        Progress
                    </a>
                    <a href="#" class="nav-link" data-page="calendar">
                        <i class="fas fa-calendar"></i>
                        Calendar
                    </a>
                    <a href="#" class="nav-link" data-page="notes">
                        <i class="fas fa-sticky-note"></i>
                        Notes
                    </a>
                    <a href="#" class="nav-link" data-page="analytics">
                        <i class="fas fa-chart-bar"></i>
                        Analytics
                    </a>
                    <a href="#" class="nav-link" data-page="achievements">
                        <i class="fas fa-trophy"></i>
                        Achievements
                    </a>
                    <a href="#" class="nav-link" data-page="review">
                        <i class="fas fa-redo"></i>
                        Review
                    </a>
                    <a href="#" class="nav-link" data-page="profile">
                        <i class="fas fa-user"></i>
                        Profile
                    </a>
                    <a href="#" class="nav-link" data-page="settings">
                        <i class="fas fa-cog"></i>
                        Settings
                    </a>
                </nav>
            `,
            bottomNav: `
                <a href="#" class="bottom-nav-item active" data-page="dashboard">
                    <i class="fas fa-home"></i>
                    <span>Home</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="roadmap">
                    <i class="fas fa-road"></i>
                    <span>Roadmap</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="progress">
                    <i class="fas fa-chart-line"></i>
                    <span>Progress</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="calendar">
                    <i class="fas fa-calendar"></i>
                    <span>Calendar</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="notes">
                    <i class="fas fa-sticky-note"></i>
                    <span>Notes</span>
                </a>
            `
        };

        return templates[templateName] || '';
    }

    async initializeComponentLogic(componentName) {
        switch (componentName) {
            case 'navbar':
                this.initializeNavbar();
                break;
            case 'sidebar':
                this.initializeSidebar();
                break;
            case 'bottomNav':
                this.initializeBottomNav();
                break;
        }
    }

    initializeNavbar() {
        // Update profile information
        const profileName = document.querySelector('.profile-name');
        const profileLevel = document.querySelector('.profile-level');

        if (profileName && this.userStats.user_info) {
            profileName.textContent = this.userStats.user_info.display_name || 'User';
        }

        if (profileLevel && this.userStats.level) {
            profileLevel.textContent = `Level ${this.userStats.level}`;
        }
    }

    initializeSidebar() {
        // Add progress indicators to sidebar items
        const progressIndicators = this.calculateSidebarProgress();

        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            const page = link.dataset.page;
            if (progressIndicators[page]) {
                const indicator = document.createElement('span');
                indicator.className = 'progress-indicator';
                indicator.textContent = progressIndicators[page];
                link.appendChild(indicator);
            }
        });
    }

    calculateSidebarProgress() {
        return {
            'roadmap': `${this.calculateProgressStats().overallPercentage}%`,
            'notes': this.userNotes.length,
            'achievements': this.achievements.length
        };
    }

    initializeBottomNav() {
        // Add badge indicators for mobile navigation
        this.updateBottomNavBadges();
    }

    updateBottomNavBadges() {
        const badges = {
            'notes': this.userNotes.filter(note => note.review_needed).length,
            'calendar': this.getUpcomingEvents().length
        };

        Object.entries(badges).forEach(([page, count]) => {
            const navItem = document.querySelector(`.bottom-nav-item[data-page="${page}"]`);
            if (navItem && count > 0) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-danger position-absolute top-0 start-100 translate-middle';
                badge.textContent = count > 99 ? '99+' : count;
                navItem.style.position = 'relative';
                navItem.appendChild(badge);
            }
        });
    }

    // Theme management
    initializeTheme() {
        const savedTheme = this.storage.get('theme') || 'auto';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        if (theme === 'auto') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', systemTheme);
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        this.storage.set('theme', theme);
    }

    // Event handlers
    handleResize() {
        const width = window.innerWidth;

        // Toggle sidebar/bottom nav based on screen size
        if (width >= 992) {
            this.showSidebar();
            this.hideBottomNav();
        } else {
            this.hideSidebar();
            this.showBottomNav();
        }

        // Refresh charts if visible
        this.refreshCharts();
    }

    showSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('d-none');
            sidebar.classList.add('d-lg-block');
        }
    }

    hideSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('d-none');
        }
    }

    showBottomNav() {
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) {
            bottomNav.classList.remove('d-none');
            bottomNav.classList.add('d-lg-none');
        }
    }

    hideBottomNav() {
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) {
            bottomNav.classList.add('d-none');
        }
    }

    refreshCharts() {
        // Refresh any visible charts
        if (Chart.instances.length > 0) {
            Chart.instances.forEach(chart => {
                chart.resize();
            });
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            });
        }

        // Arrow keys for navigation (when not in input)
        if (!e.target.matches('input, textarea') && !e.ctrlKey && !e.metaKey) {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateToPreviousPage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateToNextPage();
                    break;
            }
        }
    }

    navigateToPreviousPage() {
        const pages = ['dashboard', 'roadmap', 'progress', 'calendar', 'notes', 'analytics'];
        const currentIndex = pages.indexOf(this.currentPage);
        if (currentIndex > 0) {
            this.navigateTo(pages[currentIndex - 1]);
        }
    }

    navigateToNextPage() {
        const pages = ['dashboard', 'roadmap', 'progress', 'calendar', 'notes', 'analytics'];
        const currentIndex = pages.indexOf(this.currentPage);
        if (currentIndex < pages.length - 1) {
            this.navigateTo(pages[currentIndex + 1]);
        }
    }

    handleBeforeUnload(e) {
        // Save any unsaved data
        this.saveUnsavedData();

        // Show warning if there's unsaved work
        if (this.hasUnsavedWork()) {
            e.preventDefault();
            e.returnValue = '';
        }
    }

    saveUnsavedData() {
        // Save current state to local storage
        this.storage.set('userProgress', this.userProgress);
        this.storage.set('userNotes', this.userNotes);
        this.storage.set('calendarEvents', this.calendarEvents);
    }

    hasUnsavedWork() {
        // Check if there are any unsaved changes
        return false; // Implement based on your needs
    }

    handleOnline() {
        this.showNotification('Connection restored', 'success');
        this.syncData();
    }

    handleOffline() {
        this.showNotification('Working offline', 'warning');
    }

    // Search functionality
    async handleSearch(query) {
        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }

        try {
            const results = await this.api.search(query);
            this.showSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            // Fallback to local search
            const localResults = this.performLocalSearch(query);
            this.showSearchResults(localResults);
        }
    }

    performLocalSearch(query) {
        const results = {
            notes: [],
            roadmap: [],
            resources: []
        };

        const searchTerm = query.toLowerCase();

        // Search notes
        results.notes = this.userNotes.filter(note =>
            note.content.toLowerCase().includes(searchTerm) ||
            note.topic.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        ).slice(0, 5);

        // Search roadmap
        if (this.roadmapData) {
            Object.entries(this.roadmapData).forEach(([weekKey, weekData]) => {
                Object.entries(weekData.days).forEach(([dayKey, dayData]) => {
                    if (dayData.topic.toLowerCase().includes(searchTerm) ||
                        dayData.activities.toLowerCase().includes(searchTerm)) {
                        results.roadmap.push({
                            week: weekKey,
                            day: dayKey,
                            topic: dayData.topic,
                            activities: dayData.activities,
                            week_title: weekData.title
                        });
                    }
                });
            });
        }

        results.roadmap = results.roadmap.slice(0, 5);

        return results;
    }

    showSearchResults(results) {
        // Implementation for showing search results
        console.log('Search results:', results);
    }

    hideSearchResults() {
        // Implementation for hiding search results
    }

    // Progress tracking
    async handleTopicCompletion(checkbox) {
        const { week, day, topic } = checkbox.dataset;
        const completed = checkbox.checked;

        try {
            await this.api.updateProgress({
                week,
                day,
                topic,
                completed,
                time_spent: completed ? 1 : 0 // Default time
            });

            // Update local data
            const progressIndex = this.userProgress.findIndex(p =>
                p.week === week && p.day === day
            );

            if (progressIndex >= 0) {
                this.userProgress[progressIndex].completed = completed;
            } else {
                this.userProgress.push({
                    week,
                    day,
                    topic,
                    completed,
                    time_spent: completed ? 1 : 0,
                    updated_at: new Date().toISOString()
                });
            }

            // Update UI
            this.updateProgressStats();

            // Show completion animation
            if (completed) {
                this.showTopicCompletionAnimation(checkbox);
                this.checkForAchievements();
            }

        } catch (error) {
            console.error('Error updating progress:', error);
            checkbox.checked = !completed; // Revert on error
            this.showNotification('Failed to update progress', 'danger');
        }
    }

    showTopicCompletionAnimation(element) {
        element.closest('.day-card').classList.add('topic-complete');

        // Show celebration
        this.showNotification('🎉 Topic completed!', 'success');
    }

    async checkForAchievements() {
        try {
            const newAchievements = await this.api.getAchievements();
            const previousCount = this.achievements.length;

            if (newAchievements.length > previousCount) {
                const earnedAchievements = newAchievements.slice(previousCount);
                earnedAchievements.forEach(achievement => {
                    this.showAchievementModal(achievement);
                });
                this.achievements = newAchievements;
            }
        } catch (error) {
            console.error('Error checking achievements:', error);
        }
    }

    showAchievementModal(achievement) {
        const modal = document.getElementById('motivationalModal');
        const title = document.getElementById('motivationalTitle');
        const message = document.getElementById('motivationalMessage');

        if (modal && title && message) {
            title.textContent = achievement.title;
            message.textContent = achievement.description;

            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();

            // Add confetti effect
            this.showConfetti();
        }
    }

    showConfetti() {
        // Simple confetti implementation
        const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confettiContainer.appendChild(confetti);
        }

        setTimeout(() => {
            confettiContainer.remove();
        }, 3000);
    }

    // Data synchronization
    startDataSync() {
        // Sync data every 5 minutes
        setInterval(() => {
            this.syncData();
        }, 5 * 60 * 1000);

        // Sync on visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.syncData();
            }
        });
    }

    async syncData() {
        if (navigator.onLine) {
            try {
                // Sync user data
                await this.loadUserData();

                // Update UI if on relevant pages
                if (this.currentPage === 'dashboard') {
                    this.updateProgressStats();
                }

                console.log('✅ Data synced successfully');
            } catch (error) {
                console.error('❌ Data sync failed:', error);
            }
        }
    }

    // Utility methods
    initializeBootstrapComponents() {
        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Initialize popovers
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });
    }

    setupPeriodicUpdates() {
        // Update time displays every minute
        setInterval(() => {
            this.updateTimeDisplays();
        }, 60 * 1000);

        // Update motivational quote daily
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const msUntilMidnight = tomorrow.getTime() - now.getTime();

        setTimeout(() => {
            this.loadDailyQuote();
            // Then update every 24 hours
            setInterval(() => {
                this.loadDailyQuote();
            }, 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }

    updateTimeDisplays() {
        document.querySelectorAll('[data-time]').forEach(element => {
            const timeString = element.dataset.time;
            element.textContent = this.formatRelativeTime(timeString);
        });
    }

    showLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                document.getElementById('app').classList.remove('d-none');
            }, 500);
        }
    }

    showPageLoading() {
        const pageContent = document.getElementById('pageContent');
        if (pageContent) {
            pageContent.innerHTML = `
                <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                    <div class="loading-spinner"></div>
                </div>
            `;
        }
    }

    hidePageLoading() {
        // Page loading is hidden when content is loaded
    }

    showNotification(message, type = 'info', duration = 5000) {
        const toast = document.getElementById('notificationToast');
        const toastMessage = document.getElementById('toastMessage');

        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = `toast bg-${type} text-white`;

            const toastInstance = new bootstrap.Toast(toast, {
                delay: duration
            });
            toastInstance.show();
        }
    }

    showAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            const modalInstance = new bootstrap.Modal(authModal);
            modalInstance.show();
        }
    }

    // Authentication event handlers
    onAuthSuccess(user) {
        this.currentUser = user;
        this.initializeApp();
    }

    onAuthError(error) {
        console.error('Authentication error:', error);
        this.showNotification('Authentication failed', 'danger');
    }

    async logout() {
        try {
            await this.auth.logout();
            this.currentUser = null;
            this.showAuthModal();
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Logout failed', 'danger');
        }
    }
}

// Initialize Firebase
function initializeFirebase() {
    const firebaseConfig = {
        // Your Firebase configuration
        apiKey: "your-api-key",
        authDomain: "your-auth-domain",
        projectId: "your-project-id",
        storageBucket: "your-storage-bucket",
        messagingSenderId: "your-messaging-sender-id",
        appId: "your-app-id"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    console.log('✅ Firebase initialized');
}

// Global utility functions
window.openNoteModal = function () {
    // Implementation for opening note modal
    console.log('Opening note modal...');
};

window.openEventModal = function () {
    // Implementation for opening event modal
    console.log('Opening event modal...');
};

window.markTopicComplete = function () {
    // Implementation for marking topic complete
    console.log('Marking topic complete...');
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSALearningApp;
}