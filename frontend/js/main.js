// js/main.js
const API_BASE = 'https://dsa-backend-gj8n.onrender.com';
let currentUser = null;

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        // Redirect to login if not on auth pages
        if (!window.location.pathname.includes('/auth/') && window.location.pathname !== '/') {
            window.location.href = '/login';
            return false;
        }
    } else {
        currentUser = JSON.parse(user);
        // Auto-refresh token if needed
        refreshTokenIfNeeded();
    }

    return true;
}

// Token refresh
async function refreshTokenIfNeeded() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return;

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
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
}

// API Helper with auto-retry
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    };

    try {
        let response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);

        // If token expired, try to refresh and retry
        if (response.status === 401 && token) {
            await refreshTokenIfNeeded();
            const newToken = localStorage.getItem('access_token');
            if (newToken !== token) {
                mergedOptions.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
            }
        }

        return response;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Component initialization
function initializeComponents() {
    // Sidebar functionality
    initSidebar();

    // Topbar functionality
    initTopbar();

    // Mobile navigation
    initMobileNav();

    // Global search
    initGlobalSearch();

    // Notifications
    initNotifications();

    // User data
    updateUserInfo();
}

// Sidebar initialization
function initSidebar() {
    const toggleBtn = document.getElementById('toggleSidebar');
    const closBtn = document.getElementById('closeSidebar');
    const sidebar = document.getElementById('sidebar');
    const logoutBtn = document.getElementById('logoutBtn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar?.classList.add('show');
            showSidebarOverlay();
        });
    }

    if (closBtn) {
        closBtn.addEventListener('click', () => {
            sidebar?.classList.remove('show');
            hideSidebarOverlay();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Handle sidebar overlay
    function showSidebarOverlay() {
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        overlay.classList.add('show');
        overlay.addEventListener('click', () => {
            sidebar?.classList.remove('show');
            hideSidebarOverlay();
        });
    }

    function hideSidebarOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
}

// Topbar initialization
function initTopbar() {
    const logoutBtnTop = document.getElementById('logoutBtnTop');
    if (logoutBtnTop) {
        logoutBtnTop.addEventListener('click', logout);
    }

    // Update streak display
    updateStreakDisplay();
}

// Mobile navigation initialization
function initMobileNav() {
    const mobileNavItems = document.querySelectorAll('.mobile-nav .nav-item');
    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const href = item.getAttribute('href');
            if (href && !href.startsWith('#')) {
                window.location.href = href;
            }
        });
    });
}

// Global search initialization
function initGlobalSearch() {
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        let searchTimeout;

        globalSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length > 2) {
                searchTimeout = setTimeout(() => {
                    performGlobalSearch(query);
                }, 300);
            }
        });
    }
}

// Notifications initialization
function initNotifications() {
    loadNotifications();

    // Check for new notifications every 30 seconds
    setInterval(loadNotifications, 30000);
}

// Update user info in UI
function updateUserInfo() {
    if (currentUser) {
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const welcomeName = document.getElementById('welcomeName');

        if (userName) userName.textContent = currentUser.name;
        if (welcomeName) welcomeName.textContent = currentUser.name;
        if (userAvatar && currentUser.avatar_url) {
            userAvatar.src = currentUser.avatar_url;
        }
    }
}

// Set active navigation item
function setActiveNavItem(page) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to current page nav items
    document.querySelectorAll(`[data-page="${page}"]`).forEach(item => {
        item.classList.add('active');
    });
}

// Update streak display
async function updateStreakDisplay() {
    try {
        const response = await apiCall('/dashboard');
        if (response.ok) {
            const data = await response.json();
            const streakElement = document.getElementById('streakCount');
            if (streakElement) {
                streakElement.textContent = data.stats.current_streak;

                // Add fire animation if streak > 0
                if (data.stats.current_streak > 0) {
                    streakElement.previousElementSibling.classList.add('streak-fire');
                }
            }
        }
    } catch (error) {
        console.error('Failed to update streak:', error);
    }
}

// Global search functionality
async function performGlobalSearch(query) {
    try {
        const response = await apiCall(`/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const results = await response.json();
            showSearchResults(results);
        }
    } catch (error) {
        console.error('Search failed:', error);
    }
}

// Show search results (implement dropdown or modal)
function showSearchResults(results) {
    // This would show search results in a dropdown
    console.log('Search results:', results);
}

// Load notifications
async function loadNotifications() {
    try {
        const response = await apiCall('/notifications?per_page=5');
        if (response.ok) {
            const data = await response.json();
            updateNotificationUI(data.notifications);
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

// Update notification UI
function updateNotificationUI(notifications) {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');

    if (badge) {
        const unreadCount = notifications.filter(n => !n.is_read).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    if (list) {
        if (notifications.length === 0) {
            list.innerHTML = '<div class="dropdown-item text-muted">No new notifications</div>';
        } else {
            list.innerHTML = notifications.map(notification => `
                <div class="dropdown-item ${notification.is_read ? '' : 'fw-bold'}" 
                     onclick="markNotificationRead('${notification.id}')">
                    <div class="d-flex justify-content-between">
                        <span>${notification.title}</span>
                        <small class="text-muted">${formatDistanceToNow(notification.created_at)}</small>
                    </div>
                    <small class="text-muted">${notification.message}</small>
                </div>
            `).join('');
        }
    }
}

// Mark notification as read
async function markNotificationRead(notificationId) {
    try {
        await apiCall(`/notifications/${notificationId}/read`, { method: 'POST' });
        loadNotifications(); // Refresh notifications
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

// Logout functionality
async function logout() {
    try {
        // Clear local storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        // Redirect to login
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if API call fails
        window.location.href = '/login';
    }
}

// Utility functions
function formatDistanceToNow(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
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

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    // Add to toast container or create one
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        container.removeChild(toast);
    });
}

// Error handling
function showError(message, details = null) {
    console.error('Error:', message, details);
    showToast(message, 'danger');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showInfo(message) {
    showToast(message, 'info');
}

// Loading states
function showLoading(element) {
    if (element) {
        element.innerHTML = `
            <div class="d-flex justify-content-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }
}

function hideLoading() {
    // Remove any loading spinners
    document.querySelectorAll('.spinner-border').forEach(spinner => {
        const parent = spinner.closest('.d-flex');
        if (parent) {
            parent.remove();
        }
    });
}

// Confetti animation for achievements
function showConfetti() {
    const colors = ['#f0c040', '#4CAF50', '#2196F3', '#FF9800', '#E91E63'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
        }, i * 10);
    }
}

function createConfettiPiece(color) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = color;
    confetti.style.animationDelay = Math.random() * 3 + 's';

    document.body.appendChild(confetti);

    setTimeout(() => {
        document.body.removeChild(confetti);
    }, 3000);
}

// Intersection Observer for animations
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// Local storage helpers
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function getFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Failed to get from localStorage:', error);
        return defaultValue;
    }
}

// Debounce function
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

// Theme management
function initTheme() {
    const savedTheme = getFromLocalStorage('theme', 'light');
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveToLocalStorage('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalSearch');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape to close modals/dropdowns
        if (e.key === 'Escape') {
            // Close sidebar on mobile
            const sidebar = document.getElementById('sidebar');
            if (sidebar?.classList.contains('show')) {
                sidebar.classList.remove('show');
                hideSidebarOverlay();
            }
        }
    });
}

// Performance monitoring
function initPerformanceMonitoring() {
    // Log page load time
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
    });

    // Monitor API response times
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
        const start = performance.now();
        return originalFetch.apply(this, args).then(response => {
            const end = performance.now();
            console.log(`API call to ${args[0]} took ${(end - start).toFixed(2)}ms`);
            return response;
        });
    };
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initKeyboardShortcuts();
    initScrollAnimations();

    if (process.env.NODE_ENV === 'development') {
        initPerformanceMonitoring();
    }
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for use in other files
window.DSAApp = {
    API_BASE,
    checkAuth,
    apiCall,
    showToast,
    showError,
    showSuccess,
    showInfo,
    showConfetti,
    formatDate,
    formatTime,
    formatDistanceToNow,
    saveToLocalStorage,
    getFromLocalStorage,
    debounce,
    toggleTheme
};