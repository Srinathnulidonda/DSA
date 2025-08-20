// Component Loader
const Loader = {
    cache: new Map(),
    loadedComponents: new Set(),

    // Load HTML component
    async loadComponent(path) {
        // Check cache first
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${response.status}`);
            }

            const html = await response.text();
            this.cache.set(path, html);
            return html;
        } catch (error) {
            console.error(`Error loading component from ${path}:`, error);
            return null;
        }
    },

    // Load and insert component
    async insertComponent(containerId, componentPath, data = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return false;
        }

        const html = await this.loadComponent(componentPath);
        if (!html) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load component</div>';
            return false;
        }

        // Replace placeholders with data
        const processedHtml = this.processTemplate(html, data);
        container.innerHTML = processedHtml;

        // Initialize any new components
        this.initializeComponents(container);

        return true;
    },

    // Process template with data
    processTemplate(html, data) {
        return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || match;
        });
    },

    // Initialize components in container
    initializeComponents(container) {
        // Initialize Bootstrap components
        const tooltips = container.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(element => {
            new bootstrap.Tooltip(element);
        });

        const popovers = container.querySelectorAll('[data-bs-toggle="popover"]');
        popovers.forEach(element => {
            new bootstrap.Popover(element);
        });

        // Initialize dropdowns
        const dropdowns = container.querySelectorAll('[data-bs-toggle="dropdown"]');
        dropdowns.forEach(element => {
            new bootstrap.Dropdown(element);
        });

        // Highlight code blocks
        Lib.syntax.highlightAll();

        // Initialize lazy loading
        Lib.ui.lazyLoadImages();
    },

    // Load layout components
    async loadLayout() {
        const promises = [
            this.loadHeader(),
            this.loadSidebar(),
            this.loadMobileNav()
        ];

        await Promise.all(promises);
    },

    // Load header
    async loadHeader() {
        const success = await this.insertComponent('header-container', '/components/layout/header.html', {
            userName: Auth.getUserName() || 'User',
            userAvatar: Auth.getUserAvatar() || ''
        });

        if (success) {
            this.setupHeaderEvents();
        }
    },

    // Load sidebar
    async loadSidebar() {
        const success = await this.insertComponent('sidebar-container', '/components/layout/sidebar.html');

        if (success) {
            this.setupSidebarEvents();
        }
    },

    // Load mobile navigation
    async loadMobileNav() {
        const success = await this.insertComponent('mobile-nav-container', '/components/layout/mobile-nav.html');

        if (success) {
            this.setupMobileNavEvents();
        }
    },

    // Setup header events
    setupHeaderEvents() {
        // Search functionality
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            const debouncedSearch = Utils.debounce(async (query) => {
                if (query.length > 2) {
                    try {
                        const results = await API.search.query(query, { limit: 5 });
                        this.showSearchResults(results);
                    } catch (error) {
                        console.error('Search error:', error);
                    }
                } else {
                    this.hideSearchResults();
                }
            }, 300);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                ThemeManager.toggleTheme();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }

        // Profile dropdown
        const profileDropdown = document.getElementById('profile-dropdown');
        if (profileDropdown) {
            // Load user data
            this.updateProfileDropdown();
        }
    },

    // Setup sidebar events
    setupSidebarEvents() {
        // Navigation items
        const navItems = document.querySelectorAll('.sidebar-nav .nav-link');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Collapse/expand sections
        const collapsibleItems = document.querySelectorAll('[data-bs-toggle="collapse"]');
        collapsibleItems.forEach(item => {
            item.addEventListener('click', () => {
                const icon = item.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-chevron-right');
                    icon.classList.toggle('bi-chevron-down');
                }
            });
        });
    },

    // Setup mobile navigation events
    setupMobileNavEvents() {
        const navItems = document.querySelectorAll('.mobile-nav .nav-link');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                e.target.closest('.nav-link').classList.add('active');
            });
        });

        // Hamburger menu
        const hamburgerMenu = document.getElementById('hamburger-menu');
        if (hamburgerMenu) {
            hamburgerMenu.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
    },

    // Show search results
    showSearchResults(results) {
        let resultsContainer = document.getElementById('search-results');

        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'search-results';
            resultsContainer.className = 'position-absolute top-100 start-0 w-100 bg-white border border-top-0 rounded-bottom shadow-lg z-3';
            resultsContainer.style.maxHeight = '300px';
            resultsContainer.style.overflowY = 'auto';

            const searchContainer = document.querySelector('.search-container');
            if (searchContainer) {
                searchContainer.style.position = 'relative';
                searchContainer.appendChild(resultsContainer);
            }
        }

        if (results.resources && results.resources.length > 0) {
            resultsContainer.innerHTML = results.resources.map(resource => `
                <a href="${resource.url}" target="_blank" class="d-block px-3 py-2 text-decoration-none border-bottom">
                    <div class="fw-medium text-dark">${resource.title}</div>
                    <small class="text-muted">${resource.type}</small>
                </a>
            `).join('');
        } else {
            resultsContainer.innerHTML = '<div class="p-3 text-muted">No results found</div>';
        }

        resultsContainer.style.display = 'block';
    },

    // Hide search results
    hideSearchResults() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    },

    // Update profile dropdown
    async updateProfileDropdown() {
        try {
            const profile = await API.user.getProfile();
            const user = profile.user;

            // Update user name
            const userName = document.getElementById('header-user-name');
            if (userName) userName.textContent = user.name;

            // Update avatar
            const userAvatar = document.getElementById('header-user-avatar');
            if (userAvatar && user.avatar_url) {
                userAvatar.src = user.avatar_url;
                userAvatar.style.display = 'block';
            }

            // Update streak display
            const streakDisplay = document.getElementById('header-streak');
            if (streakDisplay) {
                streakDisplay.textContent = `${user.current_streak} day streak`;
            }
        } catch (error) {
            console.error('Error updating profile dropdown:', error);
        }
    },

    // Toggle mobile menu
    toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu-overlay');
        if (menu) {
            menu.classList.toggle('show');
        } else {
            this.createMobileMenuOverlay();
        }
    },

    // Create mobile menu overlay
    createMobileMenuOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'mobile-menu-overlay';
        overlay.className = 'mobile-menu-overlay position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none';
        overlay.style.zIndex = '1055';

        const menu = document.createElement('div');
        menu.className = 'mobile-menu position-absolute top-0 end-0 h-100 bg-white shadow-lg animate-slide-in-right';
        menu.style.width = '280px';

        // Load mobile menu content
        this.loadComponent('/components/layout/mobile-menu.html').then(html => {
            if (html) {
                menu.innerHTML = html;
                this.initializeComponents(menu);
            }
        });

        overlay.appendChild(menu);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeMobileMenu();
            }
        });

        // Show menu
        setTimeout(() => overlay.classList.add('show'), 10);
    },

    // Close mobile menu
    closeMobileMenu() {
        const overlay = document.getElementById('mobile-menu-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    },

    // Load page content
    async loadPage(pagePath, containerId = 'page-content') {
        State.setLoading(true);

        try {
            const success = await this.insertComponent(containerId, pagePath);

            if (success) {
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Update active navigation
                this.updateActiveNavigation(pagePath);

                // Initialize page-specific functionality
                this.initializePage(pagePath);
            }

            return success;
        } catch (error) {
            console.error('Error loading page:', error);
            return false;
        } finally {
            State.setLoading(false);
        }
    },

    // Update active navigation
    updateActiveNavigation(pagePath) {
        // Extract page name from path
        const pageName = pagePath.split('/').pop().replace('.html', '');

        // Update sidebar navigation
        const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-link');
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `/${pageName}` ||
                link.dataset.page === pageName) {
                link.classList.add('active');
            }
        });

        // Update mobile navigation
        const mobileLinks = document.querySelectorAll('.mobile-nav .nav-link');
        mobileLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `/${pageName}` ||
                link.dataset.page === pageName) {
                link.classList.add('active');
            }
        });
    },

    // Initialize page-specific functionality
    initializePage(pagePath) {
        const pageName = pagePath.split('/').pop().replace('.html', '');

        // Page-specific initialization
        switch (pageName) {
            case 'dashboard':
                this.initializeDashboard();
                break;
            case 'roadmap':
                this.initializeRoadmap();
                break;
            case 'notes':
                this.initializeNotes();
                break;
            case 'pomodoro':
                this.initializePomodoro();
                break;
            case 'ai-assistant':
                this.initializeAIAssistant();
                break;
            default:
                // Generic page initialization
                this.initializeGenericPage();
        }
    },

    // Initialize dashboard
    initializeDashboard() {
        // Load dashboard data
        this.loadDashboardData();
    },

    // Initialize roadmap
    initializeRoadmap() {
        // Load roadmap data
        this.loadRoadmapData();
    },

    // Initialize notes
    initializeNotes() {
        // Setup markdown editor
        const noteEditor = document.getElementById('note-editor');
        if (noteEditor) {
            Lib.markdown.createEditor('note-editor', {
                preview: true,
                minHeight: '300px'
            });
        }
    },

    // Initialize pomodoro
    initializePomodoro() {
        // Setup timer functionality
        this.setupPomodoroTimer();
    },

    // Initialize AI assistant
    initializeAIAssistant() {
        // Setup chat functionality
        this.setupAIChat();
    },

    // Initialize generic page
    initializeGenericPage() {
        // Common initialization for all pages
        Lib.syntax.addCopyButtons();
        Components.tooltip.init();
    },

    // Load dashboard data
    async loadDashboardData() {
        try {
            const dashboard = await API.dashboard.get();
            State.setDashboard(dashboard);

            // Update dashboard components with real data
            this.updateDashboardComponents(dashboard);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            Notifications.handleApiError(error, 'Loading dashboard');
        }
    },

    // Load roadmap data
    async loadRoadmapData() {
        try {
            const [roadmap, progress] = await Promise.all([
                API.resources.getRoadmap(),
                API.progress.get()
            ]);

            State.setRoadmap(roadmap.roadmap);
            State.setProgress(progress.progress);

            // Update roadmap components with real data
            this.updateRoadmapComponents(roadmap.roadmap, progress.progress);
        } catch (error) {
            console.error('Error loading roadmap data:', error);
            Notifications.handleApiError(error, 'Loading roadmap');
        }
    },

    // Update dashboard components
    updateDashboardComponents(dashboard) {
        // Update stats cards
        this.updateStatsCards(dashboard.stats);

        // Update charts
        this.updateDashboardCharts(dashboard);

        // Update recent activity
        this.updateRecentActivity(dashboard);
    },

    // Update roadmap components
    updateRoadmapComponents(roadmap, progress) {
        // Update week cards
        this.updateWeekCards(roadmap, progress);

        // Update progress indicators
        this.updateProgressIndicators(progress);
    },

    // Update stats cards
    updateStatsCards(stats) {
        const elements = {
            'current-streak': stats.current_streak,
            'total-time': Utils.formatDuration(stats.total_study_time),
            'completion-rate': `${stats.completion_percentage.toFixed(1)}%`,
            'weekly-time': Utils.formatDuration(stats.study_time_last_7_days)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    },

    // Update dashboard charts
    updateDashboardCharts(dashboard) {
        // Progress chart
        if (document.getElementById('progress-chart')) {
            Lib.charts.createProgressChart('progress-chart', {
                completed: dashboard.stats.completed_days,
                total: dashboard.stats.total_days
            });
        }

        // Streak chart
        if (document.getElementById('streak-chart')) {
            const streakData = this.generateStreakData(dashboard.weekly_progress);
            Lib.charts.createStreakChart('streak-chart', streakData);
        }
    },

    // Generate streak data for chart
    generateStreakData(weeklyProgress) {
        const labels = [];
        const values = [];

        Object.entries(weeklyProgress).forEach(([week, data]) => {
            labels.push(`Week ${week}`);
            values.push(data.completed);
        });

        return { labels, values };
    },

    // Setup pomodoro timer
    setupPomodoroTimer() {
        // Timer will be initialized by the page-specific script
        console.log('Pomodoro timer setup ready');
    },

    // Setup AI chat
    setupAIChat() {
        // AI chat will be initialized by the page-specific script
        console.log('AI chat setup ready');
    },

    // Clear cache
    clearCache() {
        this.cache.clear();
        this.loadedComponents.clear();
    },

    // Preload critical components
    async preloadComponents() {
        const criticalComponents = [
            '/components/layout/header.html',
            '/components/layout/sidebar.html',
            '/components/layout/mobile-nav.html'
        ];

        const promises = criticalComponents.map(path => this.loadComponent(path));
        await Promise.all(promises);
    }
};

// Make available globally
window.Loader = Loader;