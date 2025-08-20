// Main Application Entry Point for DSA Path

const App = {
    // Application state
    isInitialized: false,
    isOnline: navigator.onLine,

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing DSA Path Application...');

            // Show loading screen
            this.showLoadingScreen();

            // Initialize core systems
            await this.initCore();

            // Initialize UI
            await this.initUI();

            // Initialize services
            await this.initServices();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize routing
            this.initRouting();

            // Hide loading screen and show app
            this.hideLoadingScreen();

            this.isInitialized = true;
            console.log('✅ Application initialized successfully');

            // Show welcome message for new users
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showInitializationError(error);
        }
    },

    /**
     * Initialize core systems
     */
    async initCore() {
        // Initialize storage
        Storage.init();

        // Initialize state management
        State.init();

        // Initialize authentication
        Auth.init();

        // Initialize theme system
        Theme.init();

        // Wait for critical resources
        await this.waitForCriticalResources();
    },

    /**
     * Initialize UI systems
     */
    async initUI() {
        // Initialize notifications
        Notifications.init();

        // Initialize components
        this.initializeComponents();

        // Setup global UI event listeners
        this.setupGlobalUIEvents();

        // Initialize tooltips and other Bootstrap components
        this.initializeBootstrapComponents();
    },

    /**
     * Initialize services
     */
    async initServices() {
        // Initialize library extensions
        Lib.markdown.init();
        Lib.charts.init();
        Lib.timer.init();
        Lib.audio.init();

        // Preload common pages for better performance
        if (Auth.isLoggedIn()) {
            await this.preloadPages();
        }
    },

    /**
     * Wait for critical resources to load
     */
    async waitForCriticalResources() {
        // Wait for fonts to load
        if (document.fonts) {
            await document.fonts.ready;
        }

        // Wait for essential images to load
        const criticalImages = Utils.dom.$$('img[data-critical]');
        const imagePromises = Array.from(criticalImages).map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if image fails
                }
            });
        });

        await Promise.all(imagePromises);
    },

    /**
     * Initialize components
     */
    initializeComponents() {
        // Initialize sidebar toggle
        this.initSidebarToggle();

        // Initialize theme toggle
        this.initThemeToggle();

        // Initialize search
        this.initGlobalSearch();

        // Initialize notifications dropdown
        this.initNotificationsDropdown();

        // Initialize user menu
        this.initUserMenu();
    },

    /**
     * Initialize sidebar toggle
     */
    initSidebarToggle() {
        const toggleBtn = Utils.dom.$('#sidebar-toggle');
        const sidebar = Utils.dom.$('#sidebar');
        const overlay = Utils.dom.$('#sidebar-overlay');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');

                // Add overlay for mobile
                if (Utils.browser.isMobile() && sidebar.classList.contains('active')) {
                    this.createSidebarOverlay();
                }
            });
        }
    },

    /**
     * Create sidebar overlay for mobile
     */
    createSidebarOverlay() {
        let overlay = Utils.dom.$('#sidebar-overlay');

        if (!overlay) {
            overlay = Utils.dom.createElement('div', {
                id: 'sidebar-overlay',
                className: 'sidebar-overlay'
            });

            overlay.addEventListener('click', () => {
                const sidebar = Utils.dom.$('#sidebar');
                if (sidebar) {
                    sidebar.classList.remove('active');
                }
                overlay.remove();
            });

            document.body.appendChild(overlay);
        }
    },

    /**
     * Initialize theme toggle
     */
    initThemeToggle() {
        const toggleBtn = Utils.dom.$('#theme-toggle');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                Theme.toggle();
            });
        }
    },

    /**
     * Initialize global search
     */
    initGlobalSearch() {
        const searchInput = Utils.dom.$('#global-search');
        const searchBtn = Utils.dom.$('#search-btn');

        if (searchInput) {
            // Debounced search suggestions
            const debouncedSearch = Utils.time.debounce(async (query) => {
                if (query.length >= 2) {
                    await this.showSearchSuggestions(query);
                } else {
                    this.hideSearchSuggestions();
                }
            }, 300);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });

            // Handle search button click
            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    this.performSearch(searchInput.value);
                });
            }
        }
    },

    /**
     * Show search suggestions
     */
    async showSearchSuggestions(query) {
        try {
            const results = await State.search(query, 1, 'all');

            // Create or update suggestions dropdown
            let dropdown = Utils.dom.$('#search-suggestions');

            if (!dropdown) {
                dropdown = Utils.dom.createElement('div', {
                    id: 'search-suggestions',
                    className: 'search-suggestions dropdown-menu show'
                });

                const searchInput = Utils.dom.$('#global-search');
                searchInput.parentNode.appendChild(dropdown);
            }

            // Populate suggestions
            const suggestions = [];

            // Add resource suggestions
            if (results.resources) {
                results.resources.slice(0, 3).forEach(resource => {
                    suggestions.push({
                        type: 'resource',
                        title: resource.title,
                        icon: 'fas fa-book',
                        url: resource.url
                    });
                });
            }

            // Add roadmap suggestions
            if (results.roadmap) {
                results.roadmap.slice(0, 2).forEach(week => {
                    suggestions.push({
                        type: 'roadmap',
                        title: `Week ${week.week}: ${week.title}`,
                        icon: 'fas fa-map',
                        url: `/pages/roadmap?week=${week.week}`
                    });
                });
            }

            dropdown.innerHTML = suggestions.map(suggestion => `
        <a class="dropdown-item" href="${suggestion.url}">
          <i class="${suggestion.icon} me-2"></i>
          ${suggestion.title}
        </a>
      `).join('') || '<div class="dropdown-item text-muted">No suggestions found</div>';

        } catch (error) {
            console.error('Search suggestions error:', error);
        }
    },

    /**
     * Hide search suggestions
     */
    hideSearchSuggestions() {
        const dropdown = Utils.dom.$('#search-suggestions');
        if (dropdown) {
            dropdown.remove();
        }
    },

    /**
     * Perform search
     */
    performSearch(query) {
        if (query.trim()) {
            Router.navigate(`/pages/search?q=${encodeURIComponent(query.trim())}`);
            this.hideSearchSuggestions();
        }
    },

    /**
     * Initialize notifications dropdown
     */
    initNotificationsDropdown() {
        const notificationBtn = Utils.dom.$('[data-bs-toggle="dropdown"][aria-label="Notifications"]');

        if (notificationBtn) {
            notificationBtn.addEventListener('click', async () => {
                await this.loadNotifications();
            });
        }
    },

    /**
     * Load and display notifications
     */
    async loadNotifications() {
        try {
            const container = Utils.dom.$('#notification-list');
            if (!container) return;

            Components.loading.overlay(container, true);

            const response = await ApiMethods.notifications.getAll(1, 10);
            const notifications = response.notifications || [];

            if (notifications.length === 0) {
                container.innerHTML = `
          <div class="text-center py-4 text-gray-500">
            <i class="fas fa-bell-slash fs-3 mb-2"></i>
            <p class="mb-0">No notifications</p>
          </div>
        `;
            } else {
                container.innerHTML = notifications.map(notification => `
          <div class="dropdown-item ${notification.is_read ? '' : 'bg-light'}" 
               onclick="Notifications.markAsRead('${notification.id}')">
            <div class="d-flex">
              <div class="flex-grow-1">
                <h6 class="mb-1">${notification.title}</h6>
                <p class="mb-1 text-muted small">${notification.message}</p>
                <small class="text-muted">${Utils.date.relative(notification.created_at)}</small>
              </div>
              ${!notification.is_read ? '<div class="bg-primary rounded-circle" style="width: 8px; height: 8px;"></div>' : ''}
            </div>
          </div>
        `).join('');
            }

        } catch (error) {
            console.error('Failed to load notifications:', error);
            const container = Utils.dom.$('#notification-list');
            if (container) {
                container.innerHTML = '<div class="dropdown-item text-danger">Failed to load notifications</div>';
            }
        } finally {
            const container = Utils.dom.$('#notification-list');
            if (container) {
                Components.loading.overlay(container, false);
            }
        }
    },

    /**
     * Initialize user menu
     */
    initUserMenu() {
        const logoutBtn = Utils.dom.$('#logout-btn');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }
    },

    /**
     * Setup global UI event listeners
     */
    setupGlobalUIEvents() {
        // Handle click outside to close dropdowns
        document.addEventListener('click', (e) => {
            const searchSuggestions = Utils.dom.$('#search-suggestions');
            const searchInput = Utils.dom.$('#global-search');

            if (searchSuggestions && !searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                this.hideSearchSuggestions();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Handle window resize
        window.addEventListener('resize', Utils.time.throttle(() => {
            this.handleWindowResize();
        }, 250));

        // Handle online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            State.setState('app.isOnline', true);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            State.setState('app.isOnline', false);
        });
    },

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = Utils.dom.$('#global-search');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape to close modals, dropdowns, etc.
        if (e.key === 'Escape') {
            this.handleEscapeKey();
        }
    },

    /**
     * Handle escape key press
     */
    handleEscapeKey() {
        // Close search suggestions
        this.hideSearchSuggestions();

        // Close mobile sidebar
        const sidebar = Utils.dom.$('#sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            const overlay = Utils.dom.$('#sidebar-overlay');
            if (overlay) overlay.remove();
        }

        // Close mobile drawer
        const drawer = Utils.dom.$('#mobile-drawer');
        if (drawer && drawer.classList.contains('active')) {
            drawer.classList.remove('active');
        }
    },

    /**
     * Handle window resize
     */
    handleWindowResize() {
        const deviceType = Utils.browser.getDeviceType();
        State.setState('app.deviceType', deviceType);

        // Close mobile sidebar on resize to desktop
        if (deviceType === 'desktop') {
            const sidebar = Utils.dom.$('#sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
            }

            const overlay = Utils.dom.$('#sidebar-overlay');
            if (overlay) overlay.remove();
        }
    },

    /**
     * Initialize Bootstrap components
     */
    initializeBootstrapComponents() {
        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        // Initialize popovers
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    },

    /**
     * Setup main event listeners
     */
    setupEventListeners() {
        // Authentication state changes
        Auth.addEventListener('login', (user) => {
            this.onUserLogin(user);
        });

        Auth.addEventListener('logout', () => {
            this.onUserLogout();
        });

        // State changes
        State.subscribe('app.isOnline', (isOnline) => {
            this.handleNetworkChange(isOnline);
        });
    },

    /**
     * Handle user login
     */
    async onUserLogin(user) {
        // Update UI
        Auth.updateUI();

        // Load user data
        await State.loadUserData();

        // Preload pages
        await this.preloadPages();

        // Navigate to dashboard if on auth page
        if (Router.isCurrentRoute('/auth/login') || Router.isCurrentRoute('/auth/register')) {
            Router.navigate('/pages/dashboard');
        }
    },

    /**
     * Handle user logout
     */
    onUserLogout() {
        // Clear state
        State.clear();

        // Clear page cache
        Loader.clearCache();

        // Update UI
        Auth.updateUI();

        // Navigate to login
        Router.navigate('/auth/login');
    },

    /**
     * Handle network change
     */
    handleNetworkChange(isOnline) {
        if (isOnline) {
            Notifications.success('Connection restored');
            // Retry failed requests if any
        } else {
            Notifications.warning('No internet connection');
        }
    },

    /**
     * Initialize routing
     */
    initRouting() {
        Router.init();
    },

    /**
     * Preload common pages
     */
    async preloadPages() {
        const commonPages = [
            '/pages/dashboard.html',
            '/pages/roadmap.html',
            '/pages/progress.html',
            '/pages/notes.html'
        ];

        await Loader.preloadPages(commonPages);
    },

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = Utils.dom.$('#loading-screen');
        const app = Utils.dom.$('#app');

        if (loadingScreen) {
            loadingScreen.classList.remove('d-none');
        }

        if (app) {
            app.classList.add('hidden');
        }
    },

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = Utils.dom.$('#loading-screen');
        const app = Utils.dom.$('#app');

        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.classList.add('d-none');
                }, 300);
            }

            if (app) {
                app.classList.remove('hidden');
                app.classList.add('fade-in');
            }
        }, 100);
    },

    /**
     * Show initialization error
     */
    showInitializationError(error) {
        const loadingScreen = Utils.dom.$('#loading-screen');

        if (loadingScreen) {
            loadingScreen.innerHTML = `
        <div class="text-center">
          <i class="fas fa-exclamation-triangle text-danger fa-3x mb-3"></i>
          <h3 class="text-danger">Application Error</h3>
          <p class="text-muted mb-3">Failed to initialize the application</p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            <i class="fas fa-refresh me-2"></i>Reload Application
          </button>
        </div>
      `;
        }
    },

    /**
     * Show welcome message for new users
     */
    showWelcomeMessage() {
        const isNewUser = !Storage.getItem('app_welcomed');

        if (isNewUser && Auth.isLoggedIn()) {
            setTimeout(() => {
                Notifications.info('Welcome to DSA Path! Start your learning journey with our structured roadmap.', {
                    duration: 8000
                });

                Storage.setItem('app_welcomed', true);
            }, 2000);
        }
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
} else {
    App.init();
}

// Export App for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}