// js/main.js
const API_BASE = 'https://dsa-backend-gj8n.onrender.com';

// Global state management
const AppState = {
    user: null,
    preferences: {},
    isAuthenticated: false,
    currentPage: null,
    notifications: []
};

// Authentication utilities
const Auth = {
    async checkAuth() {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                AppState.user = data.user;
                AppState.preferences = data.preferences || {};
                AppState.isAuthenticated = true;
                return true;
            } else if (response.status === 401) {
                // Try to refresh token
                return await this.refreshToken();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }

        return false;
    },

    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.access_token);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    },

    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        AppState.user = null;
        AppState.isAuthenticated = false;
        window.location.href = '/login';
    }
};

// API utilities
const API = {
    async request(url, options = {}) {
        const token = localStorage.getItem('accessToken');

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const response = await fetch(`${API_BASE}${url}`, { ...defaultOptions, ...options });

        if (response.status === 401) {
            // Try to refresh token
            if (await Auth.refreshToken()) {
                // Retry request with new token
                const newToken = localStorage.getItem('accessToken');
                options.headers = { ...options.headers, 'Authorization': `Bearer ${newToken}` };
                return fetch(`${API_BASE}${url}`, { ...defaultOptions, ...options });
            } else {
                Auth.logout();
            }
        }

        return response;
    },

    async get(url) {
        return this.request(url, { method: 'GET' });
    },

    async post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(url) {
        return this.request(url, { method: 'DELETE' });
    }
};

// Toast notification system
const Toast = {
    show(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toastContainer') || this.createContainer();
        const toastId = `toast-${Date.now()}`;

        const toastHtml = `
            <div class="toast ${type} animate-slide-down" role="alert" id="${toastId}">
                <div class="toast-body d-flex align-items-center">
                    ${this.getIcon(type)}
                    <div class="ms-2">${message}</div>
                    <button type="button" class="btn-close btn-close-white ms-auto" onclick="Toast.hide('${toastId}')"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement, { delay: duration });
        bsToast.show();

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    },

    hide(toastId) {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
            const bsToast = bootstrap.Toast.getInstance(toastElement);
            bsToast.hide();
        }
    },

    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle text-white"></i>',
            error: '<i class="fas fa-exclamation-circle text-white"></i>',
            warning: '<i class="fas fa-exclamation-triangle text-white"></i>',
            info: '<i class="fas fa-info-circle text-white"></i>'
        };
        return icons[type] || icons.info;
    },

    createContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1100';
        document.body.appendChild(container);
        return container;
    }
};

// Loading states
const Loading = {
    show(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">${message}</span>
                </div>
                <p class="text-muted">${message}</p>
            </div>
        `;
    },

    hide(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    },

    skeleton(containerId, count = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let skeletons = '';
        for (let i = 0; i < count; i++) {
            skeletons += `
                <div class="loading-card mb-3">
                    <div class="loading-skeleton loading-text long mb-2"></div>
                    <div class="loading-skeleton loading-text medium mb-2"></div>
                    <div class="loading-skeleton loading-text short"></div>
                </div>
            `;
        }

        container.innerHTML = skeletons;
    }
};

// Modal utilities
const Modal = {
    show(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    },

    hide(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
    },

    confirm(title, message, onConfirm, onCancel) {
        const modalHtml = `
            <div class="modal fade" id="confirmModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmBtn">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing confirm modal if any
        const existingModal = document.getElementById('confirmModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalElement = document.getElementById('confirmModal');
        const modal = new bootstrap.Modal(modalElement);

        document.getElementById('confirmBtn').addEventListener('click', () => {
            modal.hide();
            if (onConfirm) onConfirm();
        });

        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
            if (onCancel) onCancel();
        });

        modal.show();
    }
};

// Form utilities
const Form = {
    getData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    },

    validate(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        form.classList.add('was-validated');
        return form.checkValidity();
    },

    reset(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            form.classList.remove('was-validated');
        }
    },

    setErrors(formId, errors) {
        Object.keys(errors).forEach(field => {
            const input = document.querySelector(`#${formId} [name="${field}"]`);
            if (input) {
                input.classList.add('is-invalid');
                const feedback = input.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.textContent = errors[field];
                }
            }
        });
    }
};

// Storage utilities
const Storage = {
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        localStorage.clear();
    }
};

// Date utilities
const DateUtils = {
    format(date, format = 'short') {
        const d = new Date(date);

        if (format === 'short') {
            return d.toLocaleDateString();
        } else if (format === 'long') {
            return d.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (format === 'time') {
            return d.toLocaleTimeString();
        } else if (format === 'datetime') {
            return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
        }

        return d.toString();
    },

    relative(date) {
        const now = new Date();
        const d = new Date(date);
        const diff = now - d;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    },

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    startOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
};

// Analytics utilities
const Analytics = {
    track(event, properties = {}) {
        // In a real implementation, this would send to analytics service
        console.log('Analytics event:', event, properties);

        // Store locally for now
        const events = Storage.get('analytics_events') || [];
        events.push({
            event,
            properties,
            timestamp: new Date().toISOString(),
            user: AppState.user?.id
        });
        Storage.set('analytics_events', events);
    },

    pageView(page) {
        this.track('page_view', { page });
    },

    timing(category, variable, time) {
        this.track('timing', { category, variable, time });
    }
};

// Navigation utilities
const Navigation = {
    setActivePage(page) {
        AppState.currentPage = page;

        // Update sidebar
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Update mobile navigation
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Track page view
        Analytics.pageView(page);
    },

    updateBreadcrumb(items) {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (!breadcrumb) return;

        let html = '';
        items.forEach((item, index) => {
            if (index === items.length - 1) {
                html += `<li class="breadcrumb-item active">${item.text}</li>`;
            } else {
                html += `<li class="breadcrumb-item"><a href="${item.link}">${item.text}</a></li>`;
            }
        });

        breadcrumb.innerHTML = html;
    }
};

// Theme utilities
const Theme = {
    init() {
        const savedTheme = Storage.get('theme') || 'light';
        this.apply(savedTheme);
    },

    apply(theme) {
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${theme}-theme`);
        Storage.set('theme', theme);
    },

    toggle() {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.apply(newTheme);
    }
};

// Export utilities
const Export = {
    json(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.download(blob, filename);
    },

    csv(data, filename) {
        const csv = this.arrayToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        this.download(blob, filename);
    },

    download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    arrayToCSV(data) {
        if (!data.length) return '';

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
        ].join('\n');

        return csv;
    }
};

// Validation utilities
const Validation = {
    email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    password(password) {
        return password.length >= 6;
    },

    url(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    required(value) {
        return value !== null && value !== undefined && value !== '';
    }
};

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle utility
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    Theme.init();

    // Check if user is authenticated on protected pages
    const protectedPages = ['dashboard', 'roadmap', 'calendar', 'progress', 'notes', 'pomodoro', 'profile', 'settings', 'analytics'];
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';

    if (protectedPages.includes(currentPage)) {
        Auth.checkAuth().then(isAuthenticated => {
            if (!isAuthenticated) {
                window.location.href = '/login';
            }
        });
    }
});

// Export for use in other scripts
window.DSAApp = {
    API,
    Auth,
    Toast,
    Loading,
    Modal,
    Form,
    Storage,
    DateUtils,
    Analytics,
    Navigation,
    Theme,
    Export,
    Validation,
    debounce,
    throttle,
    AppState
};