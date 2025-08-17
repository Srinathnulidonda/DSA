// API Configuration
const API_BASE = 'https://dsa-backend-gj8n.onrender.com';

// Authentication Check
async function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../auth/login.html';
        return false;
    }

    // Verify token is still valid
    try {
        const response = await fetchWithAuth(`${API_BASE}/profile`);
        if (!response.ok) {
            if (response.status === 401) {
                // Try to refresh token
                const refreshSuccess = await refreshAccessToken();
                if (!refreshSuccess) {
                    window.location.href = '../auth/login.html';
                    return false;
                }
            }
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '../auth/login.html';
        return false;
    }
}

// Fetch with Authentication
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('access_token');

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    return fetch(url, { ...options, ...defaultOptions });
}

// Refresh Access Token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
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
            localStorage.setItem('access_token', data.access_token);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toastColors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: toastColors[type] || toastColors.info,
        color: 'white',
        iconColor: 'white'
    });
}

// Format Time
function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

// Find Current Week
function findCurrentWeek(weeklyProgress) {
    for (let i = 1; i <= 14; i++) {
        if (weeklyProgress[i] && weeklyProgress[i].percentage < 100) {
            return { week: i, ...weeklyProgress[i] };
        }
    }
    return null;
}

// Motivational Quotes
const motivationalQuotes = [
    "The expert in anything was once a beginner.",
    "Every line of code is a step towards mastery.",
    "Debugging is like being a detective in a crime movie where you're also the murderer.",
    "The only way to learn programming is by writing programs.",
    "Code is like humor. When you have to explain it, it's bad.",
    "First, solve the problem. Then, write the code.",
    "Experience is the name everyone gives to their mistakes.",
    "The best way to predict the future is to implement it.",
    "Simplicity is the soul of efficiency.",
    "Make it work, make it right, make it fast."
];

function loadMotivationalQuote() {
    const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    const quoteElement = document.getElementById('motivationalQuote');
    if (quoteElement) {
        quoteElement.textContent = `"${quote}"`;
    }
}

// Sidebar Toggle
document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 992 &&
                !sidebar.contains(e.target) &&
                !sidebarToggle.contains(e.target) &&
                sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
    }

    // Set active nav item
    setActiveNavItem();
});

// Set Active Navigation Item
function setActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

    // Desktop sidebar
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(currentPage)) {
            link.classList.add('active');
        }
    });

    // Mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').includes(currentPage)) {
            item.classList.add('active');
        }
    });
}

// Debounce Function
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

// Local Storage Helpers
const storage = {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },

    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }
};

// Network Status
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
    isOnline = true;
    showToast('Back online!', 'success');
});

window.addEventListener('offline', () => {
    isOnline = false;
    showToast('No internet connection', 'warning');
});

// Export functions for use in other scripts
window.DSAUtils = {
    checkAuth,
    fetchWithAuth,
    showToast,
    formatTime,
    formatDate,
    storage,
    debounce,
    API_BASE
};