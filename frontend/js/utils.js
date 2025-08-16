// Utility functions for DSA Learning Dashboard

// API Configuration
const API_BASE_URL = 'https://dsa-8ko1.onrender.com/api'; // Change this to your backend URL
const API_ENDPOINTS = {
    auth: {
        login: '/auth/login',
        register: '/auth/register',
        refresh: '/auth/refresh',
        forgotPassword: '/auth/forgot-password',
        resetPassword: '/auth/reset-password'
    },
    profile: '/profile',
    progress: '/progress',
    streaks: '/streaks',
    calendar: '/calendar',
    pomodoro: '/pomodoro',
    notes: '/notes',
    notifications: '/notifications',
    dashboard: '/dashboard',
    analytics: '/analytics/dashboard',
    roadmap: '/roadmap',
    resources: '/resources',
    search: '/search'
};

// Local Storage Keys
const STORAGE_KEYS = {
    accessToken: 'dsa_access_token',
    refreshToken: 'dsa_refresh_token',
    user: 'dsa_user',
    theme: 'dsa_theme',
    preferences: 'dsa_preferences'
};

// Utility Functions

/**
 * Make authenticated API requests
 */
class APIClient {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem(STORAGE_KEYS.accessToken);
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // Token expired, try to refresh
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    headers.Authorization = `Bearer ${this.token}`;
                    return fetch(url, { ...options, headers });
                } else {
                    // Refresh failed, redirect to login
                    this.logout();
                    return;
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${this.baseURL}${API_ENDPOINTS.auth.refresh}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.token = data.access_token;
                localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }

    logout() {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.user);
        window.location.href = '/';
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem(STORAGE_KEYS.accessToken, token);
    }
}

// Global API client instance
const api = new APIClient();

/**
 * Theme Management
 */
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
        this.applyTheme();
        this.setupToggle();
    }

    applyTheme() {
        if (this.currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem(STORAGE_KEYS.theme, this.currentTheme);
        this.applyTheme();
    }

    setupToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTheme());
        }
    }
}

/**
 * Notification System
 */
class NotificationManager {
    constructor() {
        this.container = this.createContainer();
        this.notifications = [];
    }

    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'fixed top-20 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('translate-x-0', 'opacity-100');
            notification.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `transform translate-x-full opacity-0 transition-all duration-300 max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden`;

        const iconClass = {
            success: 'bi-check-circle text-green-500',
            error: 'bi-x-circle text-red-500',
            warning: 'bi-exclamation-triangle text-yellow-500',
            info: 'bi-info-circle text-blue-500'
        }[type] || 'bi-info-circle text-blue-500';

        notification.innerHTML = `
            <div class="p-4 flex items-center">
                <div class="flex-shrink-0">
                    <i class="bi ${iconClass} text-xl"></i>
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">${message}</p>
                </div>
                <div class="ml-4 flex-shrink-0">
                    <button class="inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" onclick="notificationManager.remove(this.closest('.transform'))">
                        <i class="bi bi-x text-lg"></i>
                    </button>
                </div>
            </div>
        `;

        return notification;
    }

    remove(notification) {
        notification.classList.add('translate-x-full', 'opacity-0');
        notification.classList.remove('translate-x-0', 'opacity-100');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }
        }, 300);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

/**
 * Loading Manager
 */
class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
    }

    show(target, text = 'Loading...') {
        const loader = this.createLoader(text);

        if (typeof target === 'string') {
            target = document.getElementById(target) || document.querySelector(target);
        }

        if (target) {
            target.style.position = 'relative';
            target.appendChild(loader);
            this.activeLoaders.add(loader);
        }

        return loader;
    }

    createLoader(text) {
        const loader = document.createElement('div');
        loader.className = 'absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center z-10';
        loader.innerHTML = `
            <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p class="text-sm text-gray-600 dark:text-gray-400">${text}</p>
            </div>
        `;
        return loader;
    }

    hide(loader) {
        if (loader && loader.parentNode) {
            loader.parentNode.removeChild(loader);
            this.activeLoaders.delete(loader);
        }
    }

    hideAll() {
        this.activeLoaders.forEach(loader => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        });
        this.activeLoaders.clear();
    }
}

/**
 * Modal Manager
 */
class ModalManager {
    constructor() {
        this.activeModals = [];
    }

    open(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Add modal to active list
        this.activeModals.push(modal);

        // Animate in
        setTimeout(() => {
            const content = modal.querySelector('[class*="scale"]');
            if (content) {
                content.classList.add('scale-100');
                content.classList.remove('scale-95');
            }
        }, 10);

        // Setup close handlers
        this.setupCloseHandlers(modal);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    close(modalId) {
        const modal = typeof modalId === 'string'
            ? document.getElementById(modalId)
            : modalId;

        if (!modal) return;

        // Animate out
        const content = modal.querySelector('[class*="scale"]');
        if (content) {
            content.classList.add('scale-95');
            content.classList.remove('scale-100');
        }

        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');

            // Remove from active list
            const index = this.activeModals.indexOf(modal);
            if (index > -1) {
                this.activeModals.splice(index, 1);
            }

            // Restore body scroll if no more modals
            if (this.activeModals.length === 0) {
                document.body.style.overflow = '';
            }
        }, 200);
    }

    closeAll() {
        [...this.activeModals].forEach(modal => this.close(modal));
    }

    setupCloseHandlers(modal) {
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close(modal);
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Close buttons
        const closeButtons = modal.querySelectorAll('[data-modal-close]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.close(modal));
        });
    }
}

/**
 * Form Validation
 */
class FormValidator {
    constructor(form, rules) {
        this.form = typeof form === 'string' ? document.getElementById(form) : form;
        this.rules = rules;
        this.errors = {};
    }

    validate() {
        this.errors = {};
        let isValid = true;

        for (const field in this.rules) {
            const input = this.form.querySelector(`[name="${field}"]`) ||
                this.form.querySelector(`#${field}`);

            if (!input) continue;

            const value = input.value.trim();
            const fieldRules = this.rules[field];

            for (const rule of fieldRules) {
                if (!this.validateRule(value, rule)) {
                    this.errors[field] = rule.message;
                    isValid = false;
                    break;
                }
            }
        }

        this.displayErrors();
        return isValid;
    }

    validateRule(value, rule) {
        switch (rule.type) {
            case 'required':
                return value.length > 0;
            case 'minLength':
                return value.length >= rule.value;
            case 'maxLength':
                return value.length <= rule.value;
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'pattern':
                return new RegExp(rule.value).test(value);
            case 'match':
                const matchInput = this.form.querySelector(`[name="${rule.field}"]`);
                return matchInput && value === matchInput.value.trim();
            default:
                return true;
        }
    }

    displayErrors() {
        // Clear previous errors
        this.form.querySelectorAll('.error-message').forEach(el => el.remove());
        this.form.querySelectorAll('.border-red-500').forEach(el => {
            el.classList.remove('border-red-500');
        });

        // Display new errors
        for (const field in this.errors) {
            const input = this.form.querySelector(`[name="${field}"]`) ||
                this.form.querySelector(`#${field}`);

            if (input) {
                input.classList.add('border-red-500');

                const errorElement = document.createElement('p');
                errorElement.className = 'error-message text-red-500 text-sm mt-1';
                errorElement.textContent = this.errors[field];

                input.parentNode.appendChild(errorElement);
            }
        }
    }

    clearErrors() {
        this.errors = {};
        this.displayErrors();
    }
}

/**
 * Date and Time Utilities
 */
const dateUtils = {
    formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    },

    formatTime(date, format = '24h') {
        const d = new Date(date);

        if (format === '12h') {
            return d.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }

        return d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    },

    formatRelative(date) {
        const now = new Date();
        const target = new Date(date);
        const diffMs = now - target;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

        return `${Math.floor(diffDays / 365)} years ago`;
    },

    isToday(date) {
        const today = new Date();
        const target = new Date(date);

        return today.getDate() === target.getDate() &&
            today.getMonth() === target.getMonth() &&
            today.getFullYear() === target.getFullYear();
    },

    getDaysInWeek(date) {
        const target = new Date(date);
        const day = target.getDay();
        const diff = target.getDate() - day;

        const week = [];
        for (let i = 0; i < 7; i++) {
            const weekDay = new Date(target.setDate(diff + i));
            week.push(new Date(weekDay));
        }

        return week;
    }
};

/**
 * Storage Utilities
 */
const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from storage:', error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to storage:', error);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from storage:', error);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }
};

/**
 * Mobile Utilities
 */
const mobileUtils = {
    isMobile() {
        return window.innerWidth <= 768;
    },

    setupMobileMenu() {
        const menuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenu = document.getElementById('mobileMenu');

        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }
    },

    setupBottomNav() {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
        const navItems = document.querySelectorAll('.mobile-nav a');

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && href.includes(currentPage)) {
                item.classList.add('text-blue-600', 'dark:text-blue-400');
                item.classList.remove('text-gray-400');
            }
        });
    }
};

/**
 * Initialize global instances
 */
const themeManager = new ThemeManager();
const notificationManager = new NotificationManager();
const loadingManager = new LoadingManager();
const modalManager = new ModalManager();

// Initialize mobile utilities
document.addEventListener('DOMContentLoaded', () => {
    mobileUtils.setupMobileMenu();
    mobileUtils.setupBottomNav();
});

// Export for use in other scripts
window.api = api;
window.themeManager = themeManager;
window.notificationManager = notificationManager;
window.loadingManager = loadingManager;
window.modalManager = modalManager;
window.FormValidator = FormValidator;
window.dateUtils = dateUtils;
window.storage = storage;
window.mobileUtils = mobileUtils;
window.STORAGE_KEYS = STORAGE_KEYS;