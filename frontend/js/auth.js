// Authentication Management
const Auth = {
    currentUser: null,
    isAuthenticated: false,

    // Initialize auth
    init() {
        this.loadUserFromStorage();
        this.setupTokenRefresh();
        return this;
    },

    // Load user from storage
    loadUserFromStorage() {
        const userData = Storage.auth.getUser();
        const accessToken = Storage.auth.getAccessToken();

        if (userData && accessToken) {
            this.currentUser = userData;
            this.isAuthenticated = true;
            this.dispatchAuthStateChange();
        }
    },

    // Setup automatic token refresh
    setupTokenRefresh() {
        // Refresh token every 50 minutes (tokens expire in 1 hour)
        setInterval(async () => {
            if (this.isAuthenticated) {
                try {
                    await this.refreshToken();
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    this.logout();
                }
            }
        }, 50 * 60 * 1000);
    },

    // Login
    async login(email, password) {
        try {
            const response = await API.auth.login(email, password);

            // Store tokens and user data
            Storage.auth.setTokens(response.access_token, response.refresh_token);
            Storage.auth.setUser(response.user);

            this.currentUser = response.user;
            this.isAuthenticated = true;

            this.dispatchAuthStateChange();

            return {
                success: true,
                user: response.user,
                message: SUCCESS_MESSAGES.LOGIN_SUCCESS
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || ERROR_MESSAGES.SERVER_ERROR
            };
        }
    },

    // Register
    async register(name, email, password) {
        try {
            const response = await API.auth.register(name, email, password);

            // Store tokens and user data
            Storage.auth.setTokens(response.access_token, response.refresh_token);
            Storage.auth.setUser(response.user);

            this.currentUser = response.user;
            this.isAuthenticated = true;

            this.dispatchAuthStateChange();

            return {
                success: true,
                user: response.user,
                message: SUCCESS_MESSAGES.REGISTER_SUCCESS
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || ERROR_MESSAGES.SERVER_ERROR
            };
        }
    },

    // Forgot password
    async forgotPassword(email) {
        try {
            await API.auth.forgotPassword(email);

            return {
                success: true,
                message: 'If the email exists, a reset link has been sent to your inbox.'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || ERROR_MESSAGES.SERVER_ERROR
            };
        }
    },

    // Reset password
    async resetPassword(token, password) {
        try {
            await API.auth.resetPassword(token, password);

            return {
                success: true,
                message: SUCCESS_MESSAGES.PASSWORD_RESET
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || ERROR_MESSAGES.SERVER_ERROR
            };
        }
    },

    // Refresh token
    async refreshToken() {
        try {
            const response = await API.auth.refreshToken();
            Storage.auth.setTokens(response.access_token, response.refresh_token || Storage.auth.getRefreshToken());

            return response;
        } catch (error) {
            this.logout();
            throw error;
        }
    },

    // Logout
    logout() {
        // Clear storage
        Storage.auth.clearTokens();
        Storage.auth.clearUser();

        // Reset state
        this.currentUser = null;
        this.isAuthenticated = false;

        this.dispatchAuthStateChange();

        // Redirect to login
        Router.navigate(ROUTES.LOGIN);

        Notifications.show(SUCCESS_MESSAGES.LOGOUT_SUCCESS, 'info');
    },

    // Get current user
    getUser() {
        return this.currentUser;
    },

    // Check if user is authenticated
    isLoggedIn() {
        return this.isAuthenticated;
    },

    // Get user ID
    getUserId() {
        return this.currentUser ? this.currentUser.id : null;
    },

    // Get user name
    getUserName() {
        return this.currentUser ? this.currentUser.name : null;
    },

    // Get user email
    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    },

    // Get user avatar
    getUserAvatar() {
        return this.currentUser ? this.currentUser.avatar_url : null;
    },

    // Update current user data
    updateUser(userData) {
        if (this.currentUser) {
            this.currentUser = { ...this.currentUser, ...userData };
            Storage.auth.setUser(this.currentUser);
            this.dispatchAuthStateChange();
        }
    },

    // Check if route requires authentication
    requiresAuth(route) {
        const publicRoutes = [
            ROUTES.LOGIN,
            ROUTES.REGISTER,
            ROUTES.FORGOT_PASSWORD,
            ROUTES.RESET_PASSWORD
        ];

        return !publicRoutes.includes(route);
    },

    // Check if user can access route
    canAccessRoute(route) {
        if (this.requiresAuth(route)) {
            return this.isAuthenticated;
        }
        return true;
    },

    // Redirect to login if not authenticated
    redirectToLogin(returnUrl = null) {
        const currentPath = returnUrl || window.location.pathname;
        Router.navigate(`${ROUTES.LOGIN}?return=${encodeURIComponent(currentPath)}`);
    },

    // Handle auth redirect after login
    handleAuthRedirect() {
        const urlParams = Utils.getUrlParams();
        const returnUrl = urlParams.return;

        if (returnUrl && returnUrl !== ROUTES.LOGIN) {
            Router.navigate(decodeURIComponent(returnUrl));
        } else {
            Router.navigate(ROUTES.DASHBOARD);
        }
    },

    // Dispatch auth state change event
    dispatchAuthStateChange() {
        document.dispatchEvent(new CustomEvent(EVENT_TYPES.AUTH_STATE_CHANGED, {
            detail: {
                isAuthenticated: this.isAuthenticated,
                user: this.currentUser
            }
        }));
    },

    // Auto-login check
    async checkAuthStatus() {
        if (!this.isAuthenticated) return false;

        try {
            // Verify token by making a request to profile endpoint
            const userData = await API.user.getProfile();
            this.updateUser(userData.user);
            return true;
        } catch (error) {
            if (error.status === 401) {
                // Try to refresh token
                try {
                    await this.refreshToken();
                    return true;
                } catch (refreshError) {
                    this.logout();
                    return false;
                }
            }
            return false;
        }
    },

    // Session timeout warning
    setupSessionTimeout() {
        let warningShown = false;
        let timeoutId;

        const checkSession = async () => {
            if (!this.isAuthenticated) return;

            try {
                await API.user.getProfile();
                warningShown = false;
            } catch (error) {
                if (error.status === 401 && !warningShown) {
                    warningShown = true;

                    const shouldRefresh = confirm(
                        'Your session is about to expire. Would you like to continue?'
                    );

                    if (shouldRefresh) {
                        try {
                            await this.refreshToken();
                            warningShown = false;
                        } catch (refreshError) {
                            this.logout();
                        }
                    } else {
                        this.logout();
                    }
                }
            }
        };

        // Check session every 5 minutes
        setInterval(checkSession, 5 * 60 * 1000);

        // Reset warning on user activity
        const resetTimeout = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                warningShown = false;
            }, 30 * 60 * 1000); // 30 minutes
        };

        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimeout, true);
        });
    },

    // Password strength checker
    checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;

        let strength;
        if (score < 3) strength = 'weak';
        else if (score < 4) strength = 'medium';
        else strength = 'strong';

        return {
            score,
            strength,
            checks,
            suggestions: this.getPasswordSuggestions(checks)
        };
    },

    getPasswordSuggestions(checks) {
        const suggestions = [];

        if (!checks.length) suggestions.push('Use at least 8 characters');
        if (!checks.lowercase) suggestions.push('Add lowercase letters');
        if (!checks.uppercase) suggestions.push('Add uppercase letters');
        if (!checks.number) suggestions.push('Add numbers');
        if (!checks.special) suggestions.push('Add special characters');

        return suggestions;
    },

    // Two-factor authentication (placeholder for future implementation)
    async enableTwoFactor() {
        // TODO: Implement 2FA
        throw new Error('Two-factor authentication not yet implemented');
    },

    async disableTwoFactor() {
        // TODO: Implement 2FA
        throw new Error('Two-factor authentication not yet implemented');
    },

    // Security logging
    logSecurityEvent(event, details = {}) {
        const logData = {
            event,
            timestamp: new Date().toISOString(),
            userId: this.getUserId(),
            userAgent: navigator.userAgent,
            ip: 'client', // Would need server-side logging for real IP
            ...details
        };

        console.log('Security Event:', logData);

        // In production, send to security monitoring service
        if (process.env.NODE_ENV === 'production') {
            // Send to security service
        }
    }
};

// Initialize auth
Auth.init();

// Listen for auth state changes
document.addEventListener(EVENT_TYPES.AUTH_STATE_CHANGED, (event) => {
    const { isAuthenticated, user } = event.detail;

    // Update UI elements based on auth state
    const authElements = document.querySelectorAll('[data-auth-required]');
    authElements.forEach(element => {
        element.style.display = isAuthenticated ? 'block' : 'none';
    });

    const guestElements = document.querySelectorAll('[data-guest-only]');
    guestElements.forEach(element => {
        element.style.display = isAuthenticated ? 'none' : 'block';
    });

    // Update user info displays
    const userNameElements = document.querySelectorAll('[data-user-name]');
    userNameElements.forEach(element => {
        element.textContent = user ? user.name : '';
    });

    const userEmailElements = document.querySelectorAll('[data-user-email]');
    userEmailElements.forEach(element => {
        element.textContent = user ? user.email : '';
    });

    const userAvatarElements = document.querySelectorAll('[data-user-avatar]');
    userAvatarElements.forEach(element => {
        if (user && user.avatar_url) {
            element.src = user.avatar_url;
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
});

// Setup session timeout
Auth.setupSessionTimeout();

// Make available globally
window.Auth = Auth;