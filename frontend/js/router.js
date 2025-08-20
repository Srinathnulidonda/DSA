// Client-side Router
const Router = {
    routes: new Map(),
    currentRoute: null,
    beforeEachCallback: null,
    afterEachCallback: null,

    // Initialize router
    init() {
        this.setupRoutes();
        this.setupEventListeners();
        this.handleInitialRoute();
        return this;
    },

    // Setup routes
    setupRoutes() {
        // Public routes
        this.addRoute('/', '/pages/dashboard.html', { requiresAuth: true });
        this.addRoute('/dashboard', '/pages/dashboard.html', { requiresAuth: true });
        this.addRoute('/roadmap', '/pages/roadmap.html', { requiresAuth: true });
        this.addRoute('/calendar', '/pages/calendar.html', { requiresAuth: true });
        this.addRoute('/progress', '/pages/progress.html', { requiresAuth: true });
        this.addRoute('/notes', '/pages/notes.html', { requiresAuth: true });
        this.addRoute('/pomodoro', '/pages/pomodoro.html', { requiresAuth: true });
        this.addRoute('/profile', '/pages/profile.html', { requiresAuth: true });
        this.addRoute('/settings', '/pages/settings.html', { requiresAuth: true });
        this.addRoute('/analytics', '/pages/analytics.html', { requiresAuth: true });
        this.addRoute('/resources', '/pages/resources.html', { requiresAuth: true });
        this.addRoute('/ai-assistant', '/pages/ai-assistant.html', { requiresAuth: true });
        this.addRoute('/search', '/pages/search.html', { requiresAuth: true });

        // Auth routes
        this.addRoute('/auth/login', '/auth/login.html', { requiresAuth: false });
        this.addRoute('/auth/register', '/auth/register.html', { requiresAuth: false });
        this.addRoute('/auth/forgot-password', '/auth/forgot-password.html', { requiresAuth: false });
        this.addRoute('/auth/reset-password', '/auth/reset-password.html', { requiresAuth: false });
    },

    // Add route
    addRoute(path, component, options = {}) {
        this.routes.set(path, {
            component,
            requiresAuth: options.requiresAuth !== false,
            meta: options.meta || {},
            beforeEnter: options.beforeEnter
        });
    },

    // Setup event listeners
    setupEventListeners() {
        // Handle popstate for browser back/forward
        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.pathname, false);
        });

        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');

            if (link && this.isInternalLink(link)) {
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });

        // Handle form submissions with data-spa attribute
        document.addEventListener('submit', (e) => {
            const form = e.target;

            if (form.hasAttribute('data-spa')) {
                e.preventDefault();
                this.handleFormSubmission(form);
            }
        });
    },

    // Check if link is internal
    isInternalLink(link) {
        const href = link.getAttribute('href');

        // Skip external links
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return false;
        }

        // Skip links with target="_blank"
        if (link.getAttribute('target') === '_blank') {
            return false;
        }

        // Skip links with data-no-spa attribute
        if (link.hasAttribute('data-no-spa')) {
            return false;
        }

        return true;
    },

    // Handle initial route
    handleInitialRoute() {
        const path = window.location.pathname;
        this.handleRoute(path, false);
    },

    // Navigate to route
    navigate(path, pushState = true) {
        if (this.currentRoute === path) return;

        this.handleRoute(path, pushState);
    },

    // Handle route
    async handleRoute(path, pushState = true) {
        // Clean path
        path = this.cleanPath(path);

        // Find route
        const route = this.routes.get(path);

        if (!route) {
            this.handle404(path);
            return;
        }

        try {
            // Check authentication
            if (route.requiresAuth && !Auth.isAuthenticated) {
                Auth.redirectToLogin(path);
                return;
            }

            // Redirect authenticated users away from auth pages
            if (!route.requiresAuth && Auth.isAuthenticated) {
                this.navigate('/dashboard');
                return;
            }

            // Run beforeEach callback
            if (this.beforeEachCallback) {
                const shouldContinue = await this.beforeEachCallback(path, this.currentRoute);
                if (shouldContinue === false) return;
            }

            // Run route-specific beforeEnter
            if (route.beforeEnter) {
                const shouldContinue = await route.beforeEnter(path, this.currentRoute);
                if (shouldContinue === false) return;
            }

            // Update URL
            if (pushState) {
                window.history.pushState({ path }, '', path);
            }

            // Load component
            const success = await this.loadRouteComponent(route.component);

            if (success) {
                // Update current route
                const previousRoute = this.currentRoute;
                this.currentRoute = path;

                // Update page title
                this.updatePageTitle(path);

                // Update state
                State.setCurrentRoute(path);

                // Dispatch route change event
                document.dispatchEvent(new CustomEvent(EVENT_TYPES.ROUTE_CHANGED, {
                    detail: {
                        from: previousRoute,
                        to: path,
                        route
                    }
                }));

                // Run afterEach callback
                if (this.afterEachCallback) {
                    this.afterEachCallback(path, previousRoute);
                }
            } else {
                this.handleLoadError(path);
            }

        } catch (error) {
            console.error('Route handling error:', error);
            this.handleLoadError(path);
        }
    },

    // Clean path
    cleanPath(path) {
        // Remove trailing slash except for root
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        // Remove query params for route matching
        const [pathname] = path.split('?');

        return pathname;
    },

    // Load route component
    async loadRouteComponent(componentPath) {
        // Show loading state
        this.showLoadingState();

        try {
            // Load layout if not auth page
            if (!componentPath.includes('/auth/')) {
                await this.ensureLayoutLoaded();
            }

            // Load page component
            const success = await Loader.loadPage(componentPath);

            return success;
        } catch (error) {
            console.error('Error loading route component:', error);
            return false;
        } finally {
            this.hideLoadingState();
        }
    },

    // Ensure layout is loaded
    async ensureLayoutLoaded() {
        const header = document.getElementById('header-container');

        if (!header || !header.children.length) {
            await Loader.loadLayout();
        }
    },

    // Show loading state
    showLoadingState() {
        State.setLoading(true);

        // Show page loading indicator
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = `
                <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                    <div class="text-center">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-muted">Loading page...</p>
                    </div>
                </div>
            `;
        }
    },

    // Hide loading state
    hideLoadingState() {
        State.setLoading(false);
    },

    // Handle 404
    handle404(path) {
        console.warn(`Route not found: ${path}`);

        // Redirect to dashboard if authenticated, login if not
        if (Auth.isAuthenticated) {
            this.navigate('/dashboard');
        } else {
            this.navigate('/auth/login');
        }
    },

    // Handle load error
    handleLoadError(path) {
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = `
                <div class="container py-5">
                    <div class="row justify-content-center">
                        <div class="col-md-6">
                            <div class="text-center">
                                <i class="bi bi-exclamation-triangle text-warning fs-1 mb-3"></i>
                                <h3>Page Load Error</h3>
                                <p class="text-muted mb-4">There was an error loading this page.</p>
                                <button class="btn btn-primary" onclick="location.reload()">
                                    <i class="bi bi-arrow-clockwise me-2"></i>
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        Notifications.error('Failed to load page. Please try again.');
    },

    // Update page title
    updatePageTitle(path) {
        const titles = {
            '/': 'Dashboard - DSA Path',
            '/dashboard': 'Dashboard - DSA Path',
            '/roadmap': 'Learning Roadmap - DSA Path',
            '/calendar': 'Study Calendar - DSA Path',
            '/progress': 'Progress Tracking - DSA Path',
            '/notes': 'Study Notes - DSA Path',
            '/pomodoro': 'Pomodoro Timer - DSA Path',
            '/profile': 'Profile - DSA Path',
            '/settings': 'Settings - DSA Path',
            '/analytics': 'Analytics - DSA Path',
            '/resources': 'Learning Resources - DSA Path',
            '/ai-assistant': 'AI Assistant - DSA Path',
            '/search': 'Search - DSA Path',
            '/auth/login': 'Login - DSA Path',
            '/auth/register': 'Register - DSA Path',
            '/auth/forgot-password': 'Forgot Password - DSA Path',
            '/auth/reset-password': 'Reset Password - DSA Path'
        };

        document.title = titles[path] || 'DSA Path';
    },

    // Handle form submission
    async handleFormSubmission(form) {
        const action = form.getAttribute('action') || form.getAttribute('data-action');
        const method = form.getAttribute('method') || 'GET';

        if (method.toLowerCase() === 'get') {
            // Handle GET forms as navigation
            const formData = new FormData(form);
            const params = new URLSearchParams(formData);
            const url = `${action}?${params.toString()}`;
            this.navigate(url);
        } else {
            // Handle POST forms
            // This would be handled by individual page scripts
            console.log('POST form submission:', { action, method });
        }
    },

    // Route guards
    beforeEach(callback) {
        this.beforeEachCallback = callback;
    },

    afterEach(callback) {
        this.afterEachCallback = callback;
    },

    // Get current route
    getCurrentRoute() {
        return this.currentRoute;
    },

    // Get route params
    getRouteParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};

        for (const [key, value] of urlParams) {
            params[key] = value;
        }

        return params;
    },

    // Replace current route without adding to history
    replace(path) {
        window.history.replaceState({ path }, '', path);
        this.handleRoute(path, false);
    },

    // Go back
    back() {
        window.history.back();
    },

    // Go forward
    forward() {
        window.history.forward();
    },

    // Prefetch route
    async prefetch(path) {
        const route = this.routes.get(this.cleanPath(path));

        if (route) {
            try {
                await Loader.loadComponent(route.component);
                console.log(`Prefetched route: ${path}`);
            } catch (error) {
                console.warn(`Failed to prefetch route: ${path}`, error);
            }
        }
    },

    // Lazy load routes
    setupLazyLoading() {
        // Prefetch routes on hover
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a[href]');

            if (link && this.isInternalLink(link)) {
                const href = link.getAttribute('href');
                this.prefetch(href);
            }
        });
    }
};

// Setup route guards
Router.beforeEach(async (to, from) => {
    // Check if user session is still valid for protected routes
    if (to !== '/auth/login' && Auth.isAuthenticated) {
        const isValid = await Auth.checkAuthStatus();
        if (!isValid) {
            return false; // Will trigger redirect to login
        }
    }

    return true;
});

Router.afterEach((to, from) => {
    // Analytics tracking
    if (window.gtag) {
        gtag('config', 'GA_MEASUREMENT_ID', {
            page_path: to
        });
    }

    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Make available globally
window.Router = Router;