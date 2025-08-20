// Authentication Management for DSA Path Application

const Auth = {
    // Current user state
    currentUser: null,
    isAuthenticated: false,

    // Event listeners for auth state changes
    listeners: {
        login: [],
        logout: [],
        authChange: []
    },

    /**
     * Initialize authentication
     */
    init() {
        // Check for existing token
        const token = Storage.token.getAccessToken();
        const userData = Storage.user.getUserData();

        if (token && userData) {
            this.currentUser = userData;
            this.isAuthenticated = true;
            this.notifyListeners('authChange', this.currentUser);
        }

        // Set up automatic token refresh
        this.setupTokenRefresh();
    },

    /**
     * Login user
     */
    async login(email, password, rememberMe = false) {
        try {
            const response = await ApiMethods.auth.login(email, password);

            this.currentUser = response.user;
            this.isAuthenticated = true;

            // If remember me is not checked, use session storage for tokens
            if (!rememberMe) {
                Storage.session.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
                Storage.session.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
                Storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                Storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            }

            this.notifyListeners('login', this.currentUser);
            this.notifyListeners('authChange', this.currentUser);

            Notifications.show('Welcome back!', 'success');

            return response;
        } catch (error) {
            const message = Utils.error.handleApiError(error);
            Notifications.show(message, 'error');
            throw error;
        }
    },

    /**
     * Register new user
     */
    async register(userData) {
        try {
            const response = await ApiMethods.auth.register(userData);

            this.currentUser = response.user;
            this.isAuthenticated = true;

            this.notifyListeners('login', this.currentUser);
            this.notifyListeners('authChange', this.currentUser);

            Notifications.show('Account created successfully!', 'success');

            return response;
        } catch (error) {
            const message = Utils.error.handleApiError(error);
            Notifications.show(message, 'error');
            throw error;
        }
    },

    /**
     * Logout user
     */
    logout() {
        // Clear all auth data
        Storage.token.clearTokens();
        Storage.user.clearUserData();
        Storage.session.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        Storage.session.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

        this.currentUser = null;
        this.isAuthenticated = false;

        this.notifyListeners('logout');
        this.notifyListeners('authChange', null);

        Notifications.show('Logged out successfully', 'info');

        // Redirect to login
        Router.navigate(ROUTES.LOGIN);
    },

    /**
     * Forgot password
     */
    async forgotPassword(email) {
        try {
            await ApiMethods.auth.forgotPassword(email);
            Notifications.show('Password reset link sent to your email', 'success');
            return true;
        } catch (error) {
            const message = Utils.error.handleApiError(error);
            Notifications.show(message, 'error');
            throw error;
        }
    },

    /**
     * Reset password
     */
    async resetPassword(token, password) {
        try {
            await ApiMethods.auth.resetPassword(token, password);
            Notifications.show('Password reset successful', 'success');
            return true;
        } catch (error) {
            const message = Utils.error.handleApiError(error);
            Notifications.show(message, 'error');
            throw error;
        }
    },

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        try {
            const response = await ApiMethods.profile.update(updates);

            this.currentUser = response.user;
            this.notifyListeners('authChange', this.currentUser);

            Notifications.show('Profile updated successfully', 'success');

            return response;
        } catch (error) {
            const message = Utils.error.handleApiError(error);
            Notifications.show(message, 'error');
            throw error;
        }
    },

    /**
     * Upload user avatar
     */
    async uploadAvatar(file) {
        try {
            // Validate file
            const validation = Validators.file.validateImage(file);
            if (!validation.isValid) {
                Notifications.show(validation.errors[0], 'error');
                return;
            }

            const response = await ApiMethods.profile.uploadAvatar(file);

            this.currentUser.avatar_url = response.avatar_url;
            Storage.user.updateUserData(this.currentUser);
            this.notifyListeners('authChange', this.currentUser);

            Notifications.show('Avatar updated successfully', 'success');

            return response;
        } catch (error) {
            const message = Utils.error.handleApiError(error);
            Notifications.show(message, 'error');
            throw error;
        }
    },

    /**
     * Get user token (from storage or session)
     */
    getToken() {
        return Storage.token.getAccessToken() || Storage.session.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * Check if user is authenticated
     */
    isLoggedIn() {
        return this.isAuthenticated && this.getToken();
    },

    /**
     * Require authentication (for protected routes)
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            Router.navigate(ROUTES.LOGIN);
            return false;
        }
        return true;
    },

    /**
     * Setup automatic token refresh
     */
    setupTokenRefresh() {
        setInterval(async () => {
            if (this.isAuthenticated) {
                try {
                    await API.refreshToken();
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    this.logout();
                }
            }
        }, APP_CONFIG.TOKEN_REFRESH_INTERVAL);
    },

    /**
     * Add event listener
     */
    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    },

    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    },

    /**
     * Notify listeners of auth events
     */
    notifyListeners(event, data = null) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Auth event listener error:', error);
                }
            });
        }
    },

    /**
     * Update UI based on auth state
     */
    updateUI() {
        const isLoggedIn = this.isLoggedIn();

        // Update user info in header
        const userNameElement = Utils.dom.$('#user-name');
        const userAvatarElement = Utils.dom.$('#user-avatar');

        if (isLoggedIn && this.currentUser) {
            if (userNameElement) {
                userNameElement.textContent = this.currentUser.name;
            }

            if (userAvatarElement) {
                userAvatarElement.src = this.currentUser.avatar_url || '/assets/icons/default-avatar.svg';
                userAvatarElement.alt = this.currentUser.name;
            }
        }

        // Show/hide auth-required elements
        const authRequiredElements = Utils.dom.$$('[data-auth-required]');
        authRequiredElements.forEach(element => {
            if (isLoggedIn) {
                element.classList.remove('d-none');
            } else {
                element.classList.add('d-none');
            }
        });

        // Show/hide guest-only elements
        const guestOnlyElements = Utils.dom.$$('[data-guest-only]');
        guestOnlyElements.forEach(element => {
            if (isLoggedIn) {
                element.classList.add('d-none');
            } else {
                element.classList.remove('d-none');
            }
        });
    },

    /**
     * Handle form submissions
     */
    setupForms() {
        // Login form
        const loginForm = Utils.dom.$('#login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(loginForm);
                const email = formData.get('email');
                const password = formData.get('password');
                const rememberMe = formData.get('remember') === 'on';

                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Signing in...';

                    await this.login(email, password, rememberMe);

                    // Redirect to dashboard or intended page
                    const redirect = Utils.url.parseQuery().redirect || ROUTES.DASHBOARD;
                    Router.navigate(redirect);

                } catch (error) {
                    // Error already handled in login method
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }

        // Register form
        const registerForm = Utils.dom.$('#register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(registerForm);
                const userData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password')
                };

                const submitBtn = registerForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating account...';

                    await this.register(userData);

                    // Redirect to dashboard
                    Router.navigate(ROUTES.DASHBOARD);

                } catch (error) {
                    // Error already handled in register method
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }

        // Forgot password form
        const forgotForm = Utils.dom.$('#forgot-password-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(forgotForm);
                const email = formData.get('email');

                const submitBtn = forgotForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Sending...';

                    await this.forgotPassword(email);

                } catch (error) {
                    // Error already handled in forgotPassword method
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }

        // Reset password form
        const resetForm = Utils.dom.$('#reset-password-form');
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(resetForm);
                const password = formData.get('password');
                const token = Utils.url.parseQuery().token;

                if (!token) {
                    Notifications.show('Invalid reset link', 'error');
                    return;
                }

                const submitBtn = resetForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Resetting...';

                    await this.resetPassword(token, password);

                    // Redirect to login
                    Router.navigate(ROUTES.LOGIN);

                } catch (error) {
                    // Error already handled in resetPassword method
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }
    }
};

// Export Auth for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}