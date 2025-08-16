// Authentication management for DSA Learning Dashboard

class AuthManager {
    static currentUser = null;
    static authModal = null;
    static isLoginMode = true;

    static init() {
        this.authModal = new bootstrap.Modal(document.getElementById('authModal'));
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    static setupEventListeners() {
        // Toggle between login/register
        document.getElementById('toggleAuth').addEventListener('click', this.toggleAuthMode.bind(this));

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
        document.getElementById('registerForm').addEventListener('submit', this.handleRegister.bind(this));

        // Modal events
        document.getElementById('authModal').addEventListener('hidden.bs.modal', () => {
            this.clearForms();
        });
    }

    static async checkAuthStatus() {
        if (TokenManager.isAuthenticated()) {
            try {
                const userData = await this.getCurrentUser();
                if (userData) {
                    this.setCurrentUser(userData.user);
                    this.hideAuthModal();
                    await this.initializeApp();
                    return;
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        this.showAuthModal();
    }

    static async getCurrentUser() {
        try {
            return await APIClient.get('/profile');
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    static toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;

        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const toggleButton = document.getElementById('toggleAuth');
        const modalTitle = document.querySelector('#authModal .modal-title');

        if (this.isLoginMode) {
            loginForm.classList.remove('d-none');
            registerForm.classList.add('d-none');
            modalTitle.textContent = 'Welcome Back';
            toggleButton.innerHTML = 'Don\'t have an account? <span class="fw-bold">Sign up</span>';
        } else {
            loginForm.classList.add('d-none');
            registerForm.classList.remove('d-none');
            modalTitle.textContent = 'Create Account';
            toggleButton.innerHTML = 'Already have an account? <span class="fw-bold">Sign in</span>';
        }

        this.clearForms();
    }

    static async handleLogin(event) {
        event.preventDefault();

        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const spinner = document.getElementById('loginSpinner');

        const formData = {
            login: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value
        };

        // Validation
        if (!formData.login || !formData.password) {
            ToastManager.error('Please fill in all fields');
            return;
        }

        try {
            this.setButtonLoading(submitBtn, spinner, true);

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                TokenManager.setTokens(data.access_token, data.refresh_token);
                this.setCurrentUser(data.user);
                this.hideAuthModal();
                await this.initializeApp();
                ToastManager.success(`Welcome back, ${data.user.username}!`);
            } else {
                ToastManager.error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            ToastManager.error('Network error. Please try again.');
        } finally {
            this.setButtonLoading(submitBtn, spinner, false);
        }
    }

    static async handleRegister(event) {
        event.preventDefault();

        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const spinner = document.getElementById('registerSpinner');

        const formData = {
            email: document.getElementById('registerEmail').value.trim(),
            username: document.getElementById('registerUsername').value.trim(),
            password: document.getElementById('registerPassword').value
        };

        // Validation
        if (!formData.email || !formData.username || !formData.password) {
            ToastManager.error('Please fill in all fields');
            return;
        }

        if (!FormUtils.validateEmail(formData.email)) {
            ToastManager.error('Please enter a valid email address');
            return;
        }

        if (!FormUtils.validatePassword(formData.password)) {
            ToastManager.error('Password must be at least 8 characters long');
            return;
        }

        try {
            this.setButtonLoading(submitBtn, spinner, true);

            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                TokenManager.setTokens(data.access_token, data.refresh_token);
                this.setCurrentUser(data.user);
                this.hideAuthModal();
                await this.initializeApp();
                ToastManager.success(`Welcome to DSA Prep, ${data.user.username}!`);
            } else {
                ToastManager.error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            ToastManager.error('Network error. Please try again.');
        } finally {
            this.setButtonLoading(submitBtn, spinner, false);
        }
    }

    static setButtonLoading(button, spinner, loading) {
        if (loading) {
            button.disabled = true;
            spinner.classList.remove('d-none');
        } else {
            button.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    static setCurrentUser(userData) {
        this.currentUser = userData;
        StorageManager.setUser(userData);
        this.updateUserUI();
    }

    static updateUserUI() {
        if (!this.currentUser) return;

        const userName = document.getElementById('userName');
        const dashboardUserName = document.getElementById('dashboardUserName');
        const userAvatar = document.getElementById('userAvatar');

        if (userName) userName.textContent = this.currentUser.username;
        if (dashboardUserName) dashboardUserName.textContent = this.currentUser.username;
        if (userAvatar) {
            userAvatar.src = this.currentUser.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.username)}&background=3B82F6&color=fff`;
        }

        // Update greeting
        const greetingText = document.getElementById('greetingText');
        if (greetingText) {
            greetingText.textContent = DateUtils.getGreeting();
        }
    }

    static showAuthModal() {
        document.getElementById('loadingScreen').classList.add('d-none');
        document.getElementById('app').classList.add('d-none');
        this.authModal.show();
    }

    static hideAuthModal() {
        this.authModal.hide();
        document.getElementById('loadingScreen').classList.add('d-none');
        document.getElementById('app').classList.remove('d-none');
    }

    static async initializeApp() {
        try {
            // Initialize the main dashboard
            await DashboardManager.init();

            // Load initial data
            await this.loadInitialData();

            // Set up real-time updates
            this.setupRealtimeUpdates();

        } catch (error) {
            console.error('App initialization failed:', error);
            ToastManager.error('Failed to initialize app. Please refresh.');
        }
    }

    static async loadInitialData() {
        try {
            // Load dashboard data
            await DashboardManager.loadDashboardData();

            // Load roadmap
            await RoadmapManager.loadRoadmap();

            // Load user progress
            await ProgressManager.loadProgress();

            // Load notifications
            await NotificationManager.loadNotifications();

        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    static setupRealtimeUpdates() {
        // Set up Server-Sent Events for real-time updates
        if (typeof EventSource !== 'undefined') {
            const eventSource = new EventSource(`${SSE_URL}?token=${TokenManager.getAccessToken()}`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleRealtimeUpdate(data);
                } catch (error) {
                    console.error('Failed to parse SSE data:', error);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                eventSource.close();
            };
        }
    }

    static handleRealtimeUpdate(data) {
        switch (data.type) {
            case 'streak_update':
                StreakManager.updateStreakDisplay(data.streak);
                break;
            case 'achievement':
                AchievementManager.showAchievement(data.achievement);
                break;
            case 'notification':
                NotificationManager.addNotification(data.notification);
                break;
            default:
                console.log('Unknown realtime update:', data);
        }
    }

    static clearForms() {
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();

        // Clear any validation states
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
    }

    static async logout() {
        try {
            // Clear tokens and user data
            TokenManager.clearTokens();
            StorageManager.clearUser();

            // Reset app state
            this.currentUser = null;

            // Show auth modal
            this.showAuthModal();

            ToastManager.info('You have been logged out');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    static getCurrentUser() {
        return this.currentUser || StorageManager.getUser();
    }
}

// Password reset functionality
class PasswordResetManager {
    static async requestReset(email) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                ToastManager.success('Password reset link sent to your email');
                return true;
            } else {
                ToastManager.error(data.message || 'Failed to send reset link');
                return false;
            }
        } catch (error) {
            console.error('Password reset request failed:', error);
            ToastManager.error('Network error. Please try again.');
            return false;
        }
    }

    static async resetPassword(token, newPassword) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                ToastManager.success('Password reset successful');
                return true;
            } else {
                ToastManager.error(data.message || 'Password reset failed');
                return false;
            }
        } catch (error) {
            console.error('Password reset failed:', error);
            ToastManager.error('Network error. Please try again.');
            return false;
        }
    }
}

// Profile management
class ProfileManager {
    static async loadProfile() {
        try {
            const profileData = await APIClient.get('/profile');
            if (profileData) {
                this.populateProfileForm(profileData);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            ToastManager.error('Failed to load profile data');
        }
    }

    static populateProfileForm(data) {
        document.getElementById('profileName').textContent = data.user.username;
        document.getElementById('profileEmail').textContent = data.user.email;
        document.getElementById('profileUsername').value = data.user.username;
        document.getElementById('profileEmailInput').value = data.user.email;

        // Populate preferences
        if (data.preferences) {
            document.getElementById('profileDailyGoal').value = data.preferences.daily_goal_minutes;
            document.getElementById('profileLanguage').value = data.preferences.preferred_language;
            document.getElementById('profileTheme').value = data.preferences.theme;
            document.getElementById('profileTimezone').value = data.preferences.timezone;
            document.getElementById('emailNotifications').checked = data.preferences.email_notifications;
            document.getElementById('pushNotifications').checked = data.preferences.push_notifications;
        }

        // Update avatar
        const avatar = document.getElementById('profileAvatar');
        if (avatar) {
            avatar.src = data.user.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=3B82F6&color=fff`;
        }
    }

    static async updateProfile(formData) {
        try {
            const response = await APIClient.put('/profile', {
                username: formData.username,
                preferences: {
                    daily_goal_minutes: parseInt(formData.daily_goal_minutes),
                    preferred_language: formData.preferred_language,
                    theme: formData.theme,
                    timezone: formData.timezone,
                    email_notifications: formData.email_notifications,
                    push_notifications: formData.push_notifications
                }
            });

            if (response) {
                ToastManager.success('Profile updated successfully');

                // Update current user data
                const currentUser = AuthManager.getCurrentUser();
                if (currentUser) {
                    currentUser.username = formData.username;
                    StorageManager.setUser(currentUser);
                    AuthManager.updateUserUI();
                }

                return true;
            }
        } catch (error) {
            console.error('Profile update failed:', error);
            ToastManager.error('Failed to update profile');
            return false;
        }
    }

    static async uploadAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch(`${API_BASE_URL}/profile/upload-avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TokenManager.getAccessToken()}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                ToastManager.success('Avatar updated successfully');

                // Update avatar in UI
                const avatars = document.querySelectorAll('[id$="Avatar"], [id$="avatar"]');
                avatars.forEach(avatar => {
                    avatar.src = data.avatar_url;
                });

                // Update user data
                const currentUser = AuthManager.getCurrentUser();
                if (currentUser) {
                    currentUser.avatar_url = data.avatar_url;
                    StorageManager.setUser(currentUser);
                }

                return true;
            } else {
                ToastManager.error(data.message || 'Avatar upload failed');
                return false;
            }
        } catch (error) {
            console.error('Avatar upload failed:', error);
            ToastManager.error('Failed to upload avatar');
            return false;
        }
    }
}

// Global functions for HTML onclick handlers
window.logout = () => AuthManager.logout();
window.AuthManager = AuthManager;
window.PasswordResetManager = PasswordResetManager;
window.ProfileManager = ProfileManager;