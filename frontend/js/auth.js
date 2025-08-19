// Authentication Handler

class AuthManager {
    constructor() {
        this.user = null;
        this.initialized = false;
    }

    // Initialize auth
    async init() {
        if (this.initialized) return;

        const token = storage.getAccessToken();
        if (token) {
            try {
                await this.loadUser();
                this.initialized = true;
            } catch (error) {
                console.error('Auth init failed:', error);
                this.logout();
            }
        } else {
            this.initialized = true;
        }
    }

    // Load user data
    async loadUser() {
        try {
            const response = await api.getProfile();
            this.user = response.user;
            storage.setUser(response.user);

            // Update preferences
            if (response.preferences) {
                storage.setPreferences(response.preferences);

                // Apply theme
                if (response.preferences.theme) {
                    window.theme.setTheme(response.preferences.theme);
                }
            }

            return this.user;
        } catch (error) {
            console.error('Load user failed:', error);
            throw error;
        }
    }

    // Login
    async login(email, password) {
        try {
            const response = await api.login(email, password);

            // Store tokens
            storage.setAccessToken(response.access_token);
            storage.setRefreshToken(response.refresh_token);

            // Store user data
            this.user = response.user;
            storage.setUser(response.user);

            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    // Register
    async register(email, password, name) {
        try {
            const response = await api.register(email, password, name);

            // Store tokens
            storage.setAccessToken(response.access_token);
            storage.setRefreshToken(response.refresh_token);

            // Store user data
            this.user = response.user;
            storage.setUser(response.user);

            return response;
        } catch (error) {
            console.error('Register failed:', error);
            throw error;
        }
    }

    // Logout
    logout() {
        storage.clearAuth();
        this.user = null;
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
    }

    // Check if authenticated
    isAuthenticated() {
        return !!storage.getAccessToken();
    }

    // Get current user
    getUser() {
        return this.user || storage.getUser();
    }

    // Update user data
    updateUser(userData) {
        this.user = { ...this.user, ...userData };
        storage.setUser(this.user);
    }

    // Check route access
    checkRouteAccess() {
        const publicRoutes = [
            APP_CONFIG.ROUTES.HOME,
            APP_CONFIG.ROUTES.LOGIN,
            APP_CONFIG.ROUTES.REGISTER,
            '/auth/forgot-password.html',
            '/auth/reset-password.html'
        ];

        const currentPath = window.location.pathname;
        const isPublicRoute = publicRoutes.includes(currentPath);

        if (!this.isAuthenticated() && !isPublicRoute) {
            // Redirect to login
            window.location.href = APP_CONFIG.ROUTES.LOGIN;
        } else if (this.isAuthenticated() && (currentPath === APP_CONFIG.ROUTES.LOGIN || currentPath === APP_CONFIG.ROUTES.REGISTER)) {
            // Redirect to dashboard if already logged in
            window.location.href = APP_CONFIG.ROUTES.DASHBOARD;
        }
    }
}

// Create global instance
window.auth = new AuthManager();

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    await auth.init();
    auth.checkRouteAccess();
});