// js/main.js
const API_BASE = 'https://dsa-backend-gj8n.onrender.com';

// Auth functions
async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        window.location.href = '/login';
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            return true;
        } else {
            window.location.href = '/login';
            return false;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        window.location.href = '/login';
        return false;
    }
}

// Axios-like interceptor for fetch
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    let [url, config] = args;

    // Add base URL if not present
    if (url.startsWith('/') && !url.startsWith('http')) {
        url = API_BASE + url;
    }

    // Add auth header if token exists
    const token = localStorage.getItem('access_token');
    if (token && config && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await originalFetch(url, config);

        // Handle 401 errors
        if (response.status === 401 && url.includes(API_BASE)) {
            const refreshed = await refreshToken();
            if (refreshed) {
                // Retry the original request
                if (config && config.headers) {
                    config.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                }
                return originalFetch(url, config);
            }
        }

        return response;
    } catch (error) {
        throw error;
    }
};

// Check auth on all pages except auth pages
function checkAuth() {
    const publicPages = ['/login', '/register', '/forgot-password', '/reset-password', '/'];
    const currentPath = window.location.pathname;

    if (!publicPages.includes(currentPath)) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login';
        }
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('Service worker registration failed:', err);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', checkAuth);