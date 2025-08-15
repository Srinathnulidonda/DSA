// app.js

// API Configuration
const API_BASE_URL = 'https://dsa-8ko1.onrender.com/api';
const AUTH_TOKEN_KEY = 'dsa_auth_token';
const REFRESH_TOKEN_KEY = 'dsa_refresh_token';
const USER_KEY = 'dsa_user';

// Global App State
const AppState = {
    user: null,
    preferences: {
        theme: 'light',
        layout: 'default',
        notifications: true
    },
    currentPage: 'dashboard',
    isLoading: false
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkAuthentication();
    loadUserPreferences();
    initializeTheme();
});

// App Initialization
function initializeApp() {
    // Check if user is logged in
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);

    if (token && user) {
        AppState.user = JSON.parse(user);
        setupAuthenticatedApp();
    } else if (window.location.pathname !== '/login.html' &&
        window.location.pathname !== '/register.html' &&
        window.location.pathname !== '/index.html') {
        window.location.href = '/login.html';
    }

    // Setup axios interceptors
    setupAxiosInterceptors();
}

// Setup Axios Interceptors
function setupAxiosInterceptors() {
    // Request interceptor
    axios.interceptors.request.use(
        config => {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        error => {
            return Promise.reject(error);
        }
    );

    // Response interceptor
    axios.interceptors.response.use(
        response => response,
        async error => {
            const originalRequest = error.config;

            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refresh_token: refreshToken
                    });

                    const { access_token } = response.data;
                    localStorage.setItem(AUTH_TOKEN_KEY, access_token);

                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    return axios(originalRequest);
                } catch (refreshError) {
                    logout();
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
}

// Authentication Check
function checkAuthentication() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const protectedPages = ['dashboard', 'roadmap', 'progress', 'calendar', 'pomodoro', 'notes', 'profile', 'settings'];
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

    if (protectedPages.includes(currentPage) && !token) {
        window.location.href = '/login.html';
    }
}

// Setup Authenticated App
function setupAuthenticatedApp() {
    updateUIWithUserData();
    startActivityTracking();
    setupNotifications();
    loadDashboardData();
}

// Update UI with User Data
function updateUIWithUserData() {
    const userNameElements = document.querySelectorAll('#userName');
    const userAvatarElements = document.querySelectorAll('#userAvatar');

    userNameElements.forEach(el => {
        el.textContent = AppState.user?.username || 'User';
    });

    userAvatarElements.forEach(el => {
        el.src = AppState.user?.avatar_url || `https://ui-avatars.com/api/?name=${AppState.user?.username}&background=3B82F6&color=fff`;
    });
}

// Event Listeners
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('[data-bs-toggle="offcanvas"]');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }

    // Theme switcher
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', toggleTheme);
    }

    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Notification bell
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', loadNotifications);
    }
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('dsa_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    AppState.preferences.theme = savedTheme;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dsa_theme', newTheme);
    AppState.preferences.theme = newTheme;

    // Update user preferences
    updateUserPreferences({ theme: newTheme });
}

// User Preferences
async function loadUserPreferences() {
    try {
        const response = await axios.get(`${API_BASE_URL}/profile`);
        const { preferences } = response.data;

        AppState.preferences = { ...AppState.preferences, ...preferences };
        applyUserPreferences();
    } catch (error) {
        console.error('Failed to load preferences:', error);
    }
}

function applyUserPreferences() {
    // Apply theme
    document.documentElement.setAttribute('data-theme', AppState.preferences.theme);

    // Apply layout
    if (AppState.preferences.layout === 'compact') {
        document.body.classList.add('layout-compact');
    }

    // Apply other preferences
    if (!AppState.preferences.notifications) {
        disableNotifications();
    }
}

async function updateUserPreferences(preferences) {
    try {
        await axios.put(`${API_BASE_URL}/profile`, { preferences });
        showToast('Preferences updated successfully', 'success');
    } catch (error) {
        console.error('Failed to update preferences:', error);
        showToast('Failed to update preferences', 'error');
    }
}

// Activity Tracking
function startActivityTracking() {
    let activityTimer;
    let lastActivity = Date.now();

    // Track user activity
    document.addEventListener('click', trackActivity);
    document.addEventListener('keypress', trackActivity);
    document.addEventListener('scroll', trackActivity);

    function trackActivity() {
        lastActivity = Date.now();

        if (!activityTimer) {
            activityTimer = setTimeout(() => {
                sendActivityPing();
                activityTimer = null;
            }, 30000); // Send ping every 30 seconds of activity
        }
    }

    async function sendActivityPing() {
        try {
            await axios.post(`${API_BASE_URL}/activity/ping`, {
                page: AppState.currentPage,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to send activity ping:', error);
        }
    }

    // Check for inactivity
    setInterval(() => {
        const inactiveTime = Date.now() - lastActivity;
        if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
            showInactivityWarning();
        }
    }, 60000); // Check every minute
}

// Notifications
async function setupNotifications() {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }

    // Setup WebSocket for real-time notifications
    setupWebSocket();

    // Load initial notifications
    loadNotifications();
}

function setupWebSocket() {
    const ws = new WebSocket(`wss://your-backend.onrender.com/ws`);

    ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({ type: 'auth', token: localStorage.getItem(AUTH_TOKEN_KEY) }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000);
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'notification':
            showNotification(data.notification);
            updateNotificationBadge();
            break;
        case 'achievement':
            showAchievementToast(data.achievement);
            break;
        case 'streak_update':
            updateStreakDisplay(data.streak);
            break;
    }
}

async function loadNotifications() {
    try {
        const response = await axios.get(`${API_BASE_URL}/notifications?unread_only=true`);
        const { notifications, unread_count } = response.data;

        updateNotificationBadge(unread_count);
        displayNotifications(notifications);
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

function showNotification(notification) {
    // Browser notification
    if (Notification.permission === 'granted' && AppState.preferences.notifications) {
        new Notification(notification.title, {
            body: notification.message,
            icon: '/assets/images/logo.svg',
            badge: '/assets/images/badge.svg'
        });
    }

    // In-app notification
    showToast(notification.message, notification.type);
}

// Dashboard Data Loading
async function loadDashboardData() {
    if (AppState.currentPage !== 'dashboard') return;

    try {
        showLoader();

        const [dashboardData, streakData] = await Promise.all([
            axios.get(`${API_BASE_URL}/dashboard`),
            axios.get(`${API_BASE_URL}/streaks`)
        ]);

        updateDashboardUI(dashboardData.data);
        updateStreakDisplay(streakData.data);

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    } finally {
        hideLoader();
    }
}

// Search Functionality
async function handleSearch(event) {
    const query = event.target.value.trim();

    if (query.length < 2) {
        hideSearchResults();
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        displaySearchResults(response.data.results);
    } catch (error) {
        console.error('Search failed:', error);
    }
}

function displaySearchResults(results) {
    const searchResultsContainer = document.getElementById('searchResults');
    if (!searchResultsContainer) return;

    searchResultsContainer.innerHTML = '';

    if (results.resources.length === 0 && results.notes.length === 0 && results.topics.length === 0) {
        searchResultsContainer.innerHTML = '<p class="text-muted p-3">No results found</p>';
        return;
    }

    // Display resources
    if (results.resources.length > 0) {
        searchResultsContainer.innerHTML += '<h6 class="px-3 py-2 text-muted">Resources</h6>';
        results.resources.forEach(resource => {
            searchResultsContainer.innerHTML += `
                <a href="${resource.url}" target="_blank" class="search-result-item d-block px-3 py-2 text-decoration-none">
                    <h6 class="mb-0">${resource.title}</h6>
                    <small class="text-muted">${resource.type}</small>
                </a>
            `;
        });
    }

    // Display notes
    if (results.notes.length > 0) {
        searchResultsContainer.innerHTML += '<h6 class="px-3 py-2 text-muted">Notes</h6>';
        results.notes.forEach(note => {
            searchResultsContainer.innerHTML += `
                <a href="/notes.html?id=${note.id}" class="search-result-item d-block px-3 py-2 text-decoration-none">
                    <h6 class="mb-0">${note.title}</h6>
                    <small class="text-muted">${note.excerpt}</small>
                </a>
            `;
        });
    }

    searchResultsContainer.classList.add('show');
}

// Utility Functions
function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.add('show');
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.remove('show');
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();

    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
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

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(date));
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

// Logout Function
async function logout() {
    try {
        await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/login.html';
    }
}

// Export for use in other modules
window.DSAApp = {
    API_BASE_URL,
    AppState,
    showToast,
    showLoader,
    hideLoader,
    formatDate,
    formatTime,
    logout
};