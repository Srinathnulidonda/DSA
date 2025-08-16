// Authentication functionality

class AuthManager {
    constructor() {
        this.currentUser = storage.get(STORAGE_KEYS.user);
        this.init();
    }

    init() {
        // Check if user is authenticated
        if (!this.isAuthenticated() && !this.isOnAuthPage()) {
            this.redirectToLogin();
            return;
        }

        if (this.isAuthenticated() && this.isOnAuthPage()) {
            this.redirectToDashboard();
            return;
        }

        this.setupAuthForms();
        this.loadUserData();
    }

    isAuthenticated() {
        return !!localStorage.getItem(STORAGE_KEYS.accessToken);
    }

    isOnAuthPage() {
        return window.location.pathname === '/' ||
            window.location.pathname === '/index.html' ||
            window.location.pathname.includes('login') ||
            window.location.pathname.includes('register');
    }

    redirectToLogin() {
        window.location.href = '/';
    }

    redirectToDashboard() {
        window.location.href = '/dashboard.html';
    }

    setupAuthForms() {
        this.setupLoginForm();
        this.setupRegisterForm();
        this.setupForgotPasswordForm();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        const validator = new FormValidator(loginForm, {
            loginEmail: [
                { type: 'required', message: 'Email or username is required' }
            ],
            loginPassword: [
                { type: 'required', message: 'Password is required' }
            ]
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validator.validate()) {
                return;
            }

            const formData = new FormData(loginForm);
            const loginData = {
                login: document.getElementById('loginEmail').value.trim(),
                password: document.getElementById('loginPassword').value
            };

            await this.handleLogin(loginData);
        });
    }

    setupRegisterForm() {
        const registerForm = document.getElementById('registerForm');
        if (!registerForm) return;

        const validator = new FormValidator(registerForm, {
            registerUsername: [
                { type: 'required', message: 'Username is required' },
                { type: 'minLength', value: 3, message: 'Username must be at least 3 characters' }
            ],
            registerEmail: [
                { type: 'required', message: 'Email is required' },
                { type: 'email', message: 'Please enter a valid email' }
            ],
            registerPassword: [
                { type: 'required', message: 'Password is required' },
                { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' }
            ],
            confirmPassword: [
                { type: 'required', message: 'Please confirm your password' },
                { type: 'match', field: 'registerPassword', message: 'Passwords do not match' }
            ]
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validator.validate()) {
                return;
            }

            const agreeTerms = document.getElementById('agreeTerms');
            if (!agreeTerms.checked) {
                notificationManager.error('Please agree to the Terms of Service and Privacy Policy');
                return;
            }

            const registerData = {
                username: document.getElementById('registerUsername').value.trim(),
                email: document.getElementById('registerEmail').value.trim().toLowerCase(),
                password: document.getElementById('registerPassword').value
            };

            await this.handleRegister(registerData);
        });
    }

    setupForgotPasswordForm() {
        const forgotPasswordBtn = document.querySelector('a[href="#"]');
        if (forgotPasswordBtn && forgotPasswordBtn.textContent.includes('Forgot password')) {
            forgotPasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordModal();
            });
        }
    }

    async handleLogin(loginData) {
        const loadingState = document.getElementById('loadingState');
        const loginForm = document.getElementById('loginForm');

        try {
            // Show loading state
            loginForm.classList.add('hidden');
            loadingState.classList.remove('hidden');

            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Store tokens and user data
            localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
            localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));

            // Update API client token
            api.setToken(data.access_token);
            this.currentUser = data.user;

            notificationManager.success('Login successful! Redirecting...');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            notificationManager.error(error.message || 'Login failed. Please try again.');

            // Hide loading state
            loadingState.classList.add('hidden');
            loginForm.classList.remove('hidden');
        }
    }

    async handleRegister(registerData) {
        const loadingState = document.getElementById('loadingState');
        const registerForm = document.getElementById('registerForm');

        try {
            // Show loading state
            registerForm.classList.add('hidden');
            loadingState.classList.remove('hidden');

            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.register}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Store tokens and user data
            localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
            localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));

            // Update API client token
            api.setToken(data.access_token);
            this.currentUser = data.user;

            notificationManager.success('Registration successful! Welcome to DSA Learning!');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);

        } catch (error) {
            console.error('Registration error:', error);
            notificationManager.error(error.message || 'Registration failed. Please try again.');

            // Hide loading state
            loadingState.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    }

    showForgotPasswordModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('forgotPasswordModal');
        if (!modal) {
            modal = this.createForgotPasswordModal();
            document.body.appendChild(modal);
        }

        modalManager.open('forgotPasswordModal');
    }

    createForgotPasswordModal() {
        const modal = document.createElement('div');
        modal.id = 'forgotPasswordModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 scale-95 transition-transform duration-200">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="bi bi-envelope text-blue-600 dark:text-blue-400 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Forgot Password?</h3>
                    <p class="text-gray-600 dark:text-gray-400">Enter your email address and we'll send you a link to reset your password.</p>
                </div>
                
                <form id="forgotPasswordForm" class="space-y-4">
                    <div>
                        <label for="forgotEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                        <input type="email" id="forgotEmail" name="email" required 
                               class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                               placeholder="Enter your email">
                    </div>
                    
                    <div class="flex space-x-3 pt-4">
                        <button type="button" data-modal-close class="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button type="submit" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            Send Reset Link
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Setup form handler
        const form = modal.querySelector('#forgotPasswordForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword(form);
        });

        return modal;
    }

    async handleForgotPassword(form) {
        const email = form.querySelector('#forgotEmail').value.trim();

        if (!email) {
            notificationManager.error('Please enter your email address');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.forgotPassword}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send reset email');
            }

            notificationManager.success('Reset link sent! Check your email.');
            modalManager.close('forgotPasswordModal');

        } catch (error) {
            console.error('Forgot password error:', error);
            notificationManager.error(error.message || 'Failed to send reset email');
        }
    }

    async loadUserData() {
        if (!this.isAuthenticated()) return;

        try {
            const userData = await api.get(API_ENDPOINTS.profile);
            this.currentUser = userData.user;
            storage.set(STORAGE_KEYS.user, userData.user);
            this.updateUserInterface();
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Update user name displays
        const userNameElements = document.querySelectorAll('#userName, #welcomeUserName');
        userNameElements.forEach(el => {
            el.textContent = this.currentUser.username;
        });

        // Update avatar
        const avatarElements = document.querySelectorAll('#userAvatar');
        avatarElements.forEach(el => {
            if (this.currentUser.avatar_url) {
                el.src = this.currentUser.avatar_url;
            } else {
                el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.username)}&background=3b82f6&color=fff`;
            }
        });
    }

    logout() {
        // Clear all stored data
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.preferences);

        // Redirect to login
        window.location.href = '/';
    }

    setupLogoutHandlers() {
        const logoutBtns = document.querySelectorAll('#logoutBtn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const authManager = new AuthManager();
    authManager.setupLogoutHandlers();

    // Make available globally
    window.authManager = authManager;
});