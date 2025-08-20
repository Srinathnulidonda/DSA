// js/main.js
const API_BASE = 'https://dsa-backend-gj8n.onrender.com';

// Auth utilities
const auth = {
    getToken: () => localStorage.getItem('access_token'),
    getRefreshToken: () => localStorage.getItem('refresh_token'),
    getUser: () => JSON.parse(localStorage.getItem('user') || '{}'),

    setTokens: (access, refresh) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },

    setUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
    },

    clear: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    },

    isAuthenticated: () => {
        return !!auth.getToken();
    }
};

// API utilities
const api = {
    headers: () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
    }),

    async request(url, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${url}`, {
                ...options,
                headers: {
                    ...api.headers(),
                    ...options.headers
                }
            });

            if (response.status === 401) {
                // Try to refresh token
                const refreshed = await api.refreshToken();
                if (refreshed) {
                    // Retry original request
                    return api.request(url, options);
                } else {
                    // Redirect to login
                    auth.clear();
                    window.location.href = '/login';
                    return;
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async refreshToken() {
        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getRefreshToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                auth.setTokens(data.access_token, auth.getRefreshToken());
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    },

    get: (url) => api.request(url, { method: 'GET' }),
    post: (url, data) => api.request(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url, data) => api.request(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (url) => api.request(url, { method: 'DELETE' })
};

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
    const publicPages = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
    const currentPath = window.location.pathname;

    if (!publicPages.includes(currentPath) && !auth.isAuthenticated()) {
        window.location.href = '/login';
    }
});

// Global utility functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    const container = document.getElementById('toast-container') || createToastContainer();
    container.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

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

// Export for use in other scripts
window.auth = auth;
window.api = api;
window.showToast = showToast;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.debounce = debounce;