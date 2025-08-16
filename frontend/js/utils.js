// Utility functions for the DSA Learning Dashboard

// API configuration
const API_BASE_URL = 'http://localhost:5000';
const SSE_URL = `${API_BASE_URL}/stream`;

// Token management
class TokenManager {
    static setTokens(accessToken, refreshToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
    }

    static getAccessToken() {
        return localStorage.getItem('access_token');
    }

    static getRefreshToken() {
        return localStorage.getItem('refresh_token');
    }

    static clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
    }

    static isAuthenticated() {
        return !!this.getAccessToken();
    }
}

// API request wrapper
class APIClient {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = TokenManager.getAccessToken();

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                // Token expired, try to refresh
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry the original request
                    config.headers.Authorization = `Bearer ${TokenManager.getAccessToken()}`;
                    return fetch(url, config);
                } else {
                    // Refresh failed, redirect to login
                    this.handleAuthError();
                    return null;
                }
            }

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async refreshToken() {
        const refreshToken = TokenManager.getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                TokenManager.setTokens(data.access_token, refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }

    static handleAuthError() {
        TokenManager.clearTokens();
        showAuthModal();
    }

    static async get(endpoint) {
        const response = await this.request(endpoint);
        return response?.json();
    }

    static async post(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response?.json();
    }

    static async put(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response?.json();
    }

    static async delete(endpoint) {
        const response = await this.request(endpoint, {
            method: 'DELETE'
        });
        return response?.json();
    }
}

// Local storage helpers
class StorageManager {
    static setUser(userData) {
        localStorage.setItem('user_data', JSON.stringify(userData));
    }

    static getUser() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }

    static clearUser() {
        localStorage.removeItem('user_data');
    }

    static setSettings(settings) {
        localStorage.setItem('app_settings', JSON.stringify(settings));
    }

    static getSettings() {
        const settings = localStorage.getItem('app_settings');
        return settings ? JSON.parse(settings) : {
            theme: 'light',
            notifications: true,
            soundEnabled: true
        };
    }
}

// Toast notifications
class ToastManager {
    static show(message, type = 'info', duration = 5000) {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = `toast-${Date.now()}`;

        const toastHtml = `
            <div class="toast align-items-center text-white bg-${this.getBootstrapClass(type)} border-0" 
                 id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi ${this.getIcon(type)} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                            data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: duration });
        toast.show();

        // Remove from DOM after hiding
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    static getBootstrapClass(type) {
        const classes = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'primary'
        };
        return classes[type] || 'primary';
    }

    static getIcon(type) {
        const icons = {
            success: 'bi-check-circle',
            error: 'bi-exclamation-circle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        };
        return icons[type] || 'bi-info-circle';
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static warning(message) {
        this.show(message, 'warning');
    }

    static info(message) {
        this.show(message, 'info');
    }
}

// Loading states
class LoadingManager {
    static show(element, text = 'Loading...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        element.innerHTML = `
            <div class="d-flex justify-content-center align-items-center py-5">
                <div class="spinner-border text-primary me-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span class="text-muted">${text}</span>
            </div>
        `;
    }

    static hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        // This will be replaced by actual content
    }

    static showSkeleton(element, type = 'card') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        let skeletonHtml = '';
        switch (type) {
            case 'card':
                skeletonHtml = `
                    <div class="loading-skeleton" style="height: 200px; border-radius: 12px;"></div>
                `;
                break;
            case 'list':
                skeletonHtml = Array(5).fill().map(() => `
                    <div class="d-flex align-items-center mb-3">
                        <div class="loading-skeleton rounded-circle" style="width: 40px; height: 40px;"></div>
                        <div class="ms-3 flex-grow-1">
                            <div class="loading-skeleton" style="height: 20px; width: 60%; margin-bottom: 8px;"></div>
                            <div class="loading-skeleton" style="height: 16px; width: 40%;"></div>
                        </div>
                    </div>
                `).join('');
                break;
        }

        element.innerHTML = skeletonHtml;
    }
}

// Date/Time utilities
class DateUtils {
    static formatDate(date, format = 'short') {
        const d = new Date(date);

        switch (format) {
            case 'short':
                return d.toLocaleDateString();
            case 'long':
                return d.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'time':
                return d.toLocaleTimeString();
            case 'datetime':
                return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
            case 'relative':
                return this.getRelativeTime(d);
            default:
                return d.toLocaleDateString();
        }
    }

    static getRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    static getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    static formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }
}

// Form utilities
class FormUtils {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePassword(password) {
        return password.length >= 8;
    }

    static serializeForm(form) {
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    }

    static setFormData(form, data) {
        for (const [key, value] of Object.entries(data)) {
            const field = form.querySelector(`[name="${key}"], #${key}`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = value;
                } else {
                    field.value = value;
                }
            }
        }
    }

    static clearForm(form) {
        form.reset();
        form.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        form.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });
    }

    static showFieldError(field, message) {
        field.classList.add('is-invalid');

        // Remove existing error
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }

        // Add new error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }
}

// Animation utilities
class AnimationUtils {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease-in-out`;

        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    }

    static slideUp(element, duration = 300) {
        element.style.transform = 'translateY(100%)';
        element.style.transition = `transform ${duration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.transform = 'translateY(0)';
        });
    }

    static countUp(element, start, end, duration = 1000) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            element.textContent = Math.floor(current);

            if (current >= end) {
                element.textContent = end;
                clearInterval(timer);
            }
        }, 16);
    }
}

// Chart utilities
class ChartUtils {
    static createLineChart(ctx, data, options = {}) {
        return new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                ...options
            }
        });
    }

    static createDoughnutChart(ctx, data, options = {}) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                },
                ...options
            }
        });
    }

    static createBarChart(ctx, data, options = {}) {
        return new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                ...options
            }
        });
    }
}

// Export utilities for use in other files
window.TokenManager = TokenManager;
window.APIClient = APIClient;
window.StorageManager = StorageManager;
window.ToastManager = ToastManager;
window.LoadingManager = LoadingManager;
window.DateUtils = DateUtils;
window.FormUtils = FormUtils;
window.AnimationUtils = AnimationUtils;
window.ChartUtils = ChartUtils;