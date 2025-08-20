// Client-side Router for DSA Path Application

const Router = {
    // Route definitions
    routes: {
        '/': '/pages/dashboard.html',
        '/pages/dashboard': '/pages/dashboard.html',
        '/pages/roadmap': '/pages/roadmap.html',
        '/pages/calendar': '/pages/calendar.html',
        '/pages/progress': '/pages/progress.html',
        '/pages/notes': '/pages/notes.html',
        '/pages/pomodoro': '/pages/pomodoro.html',
        '/pages/resources': '/pages/resources.html',
        '/pages/ai-assistant': '/pages/ai-assistant.html',
        '/pages/analytics': '/pages/analytics.html',
        '/pages/search': '/pages/search.html',
        '/pages/profile': '/pages/profile.html',
        '/pages/settings': '/pages/settings.html',
        '/auth/login': '/auth/login.html',
        '/auth/register': '/auth/register.html',
        '/auth/forgot-password': '/auth/forgot-password.html',
        '/auth/reset-password': '/auth/reset-password.html'
    },

    // Protected routes that require authentication
    protectedRoutes: [
        '/pages/dashboard',
        '/pages/roadmap',
        '/pages/calendar',
        '/pages/progress',
        '/pages/notes',
        '/pages/pomodoro',
        '/pages/resources',
        '/pages/ai-assistant',
        '/pages/analytics',
        '/pages/search',
        '/pages/profile',
        '/pages/settings'
    ],

    // Current route
    currentRoute: null,

    /**
     * Initialize router
     */
    init() {
        // Handle initial page load
        this.handleInitialRoute();

        // Listen for popstate events (back/forward navigation)
        window.addEventListener('popstate', (e) => {
            this.navigate(window.location.pathname, false);
        });
    },

    /**
     * Handle initial route on page load
     */
    handleInitialRoute() {
        const path = window.location.pathname;
        this.navigate(path, false);
    },

    /**
     * Navigate to a route
     */
    async navigate(path, pushState = true) {
        try {
            // Normalize path
            const normalizedPath = this.normalizePath(path);

            // Check if route exists
            if (!this.routes[normalizedPath]) {
                this.navigate('/pages/dashboard');
                return;
            }

            // Check authentication for protected routes
            if (this.isProtectedRoute(normalizedPath) && !Auth.isLoggedIn()) {
                this.redirectToLogin(normalizedPath);
                return;
            }

            // Redirect authenticated users away from auth pages
            if (this.isAuthRoute(normalizedPath) && Auth.isLoggedIn()) {
                this.navigate('/pages/dashboard');
                return;
            }

            // Update browser history
            if (pushState) {
                history.pushState({ path: normalizedPath }, '', normalizedPath);
            }

            // Update current route
            this.currentRoute = normalizedPath;

            // Load the page
            const filePath = this.routes[normalizedPath];
            await Loader.loadPage(filePath);

            // Update state
            State.setState('app.currentPage', normalizedPath);

        } catch (error) {
            console.error('Navigation error:', error);
            Notifications.error('Failed to load page');
        }
    },

    /**
     * Normalize path (remove trailing slashes, etc.)
     */
    normalizePath(path) {
        // Remove trailing slash except for root
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        // Default to dashboard for root
        if (path === '/') {
            return '/pages/dashboard';
        }

        return path;
    },

    /**
     * Check if route is protected
     */
    isProtectedRoute(path) {
        return this.protectedRoutes.includes(path);
    },

    /**
     * Check if route is auth-related
     */
    isAuthRoute(path) {
        return path.startsWith('/auth/');
    },

    /**
     * Redirect to login with return URL
     */
    redirectToLogin(returnUrl) {
        const loginUrl = `/auth/login?redirect=${encodeURIComponent(returnUrl)}`;
        this.navigate(loginUrl);
    },

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    },

    /**
     * Check if current route matches
     */
    isCurrentRoute(path) {
        return this.currentRoute === this.normalizePath(path);
    },

    /**
     * Go back in history
     */
    goBack() {
        history.back();
    },

    /**
     * Go forward in history
     */
    goForward() {
        history.forward();
    },

    /**
     * Replace current route
     */
    replace(path) {
        const normalizedPath = this.normalizePath(path);
        history.replaceState({ path: normalizedPath }, '', normalizedPath);
        this.currentRoute = normalizedPath;
    }
};

// Export Router for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}