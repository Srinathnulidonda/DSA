// Utility Functions for DSA Learning Dashboard

// Global Utility Object
const DSAUtils = {
    // Date and Time Utilities
    formatDate(date, format = 'short') {
        if (!date) return '';

        const d = new Date(date);
        const options = {
            short: {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            },
            long: {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            },
            time: {
                hour: '2-digit',
                minute: '2-digit'
            }
        };

        return d.toLocaleDateString('en-US', options[format] || options.short);
    },

    getTimeAgo(date) {
        if (!date) return '';

        const now = new Date();
        const diffTime = Math.abs(now - new Date(date));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.ceil(diffTime / (1000 * 60));
        const diffSeconds = Math.ceil(diffTime / 1000);

        if (diffSeconds < 60) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} week${Math.ceil(diffDays / 7) > 1 ? 's' : ''} ago`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)} month${Math.ceil(diffDays / 30) > 1 ? 's' : ''} ago`;
        return `${Math.ceil(diffDays / 365)} year${Math.ceil(diffDays / 365) > 1 ? 's' : ''} ago`;
    },

    getDuration(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = end - start;

        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    },

    // String Utilities
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    camelToTitle(str) {
        if (!str) return '';
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },

    truncateText(text, maxLength = 100, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + suffix;
    },

    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    // Number Utilities
    formatNumber(num, decimals = 0) {
        if (isNaN(num)) return '0';
        return Number(num).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    formatPercentage(value, total, decimals = 1) {
        if (!total || total === 0) return '0%';
        const percentage = (value / total) * 100;
        return `${percentage.toFixed(decimals)}%`;
    },

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Array Utilities
    unique(array) {
        return [...new Set(array)];
    },

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];

            if (direction === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });
    },

    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    // Object Utilities
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    },

    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    },

    // DOM Utilities
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);

        // Set attributes
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'textContent') {
                element.textContent = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        // Append children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    },

    addEventListeners(element, events) {
        Object.keys(events).forEach(event => {
            element.addEventListener(event, events[event]);
        });
    },

    // Local Storage Utilities
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Failed to read from localStorage:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Failed to remove from localStorage:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Failed to clear localStorage:', error);
                return false;
            }
        },

        exists(key) {
            return localStorage.getItem(key) !== null;
        }
    },

    // URL Utilities
    getQueryParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    setQueryParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.replaceState({}, '', url);
    },

    removeQueryParam(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        window.history.replaceState({}, '', url);
    },

    // Validation Utilities
    isEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    isURL(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    },

    isValidJSON(string) {
        try {
            JSON.parse(string);
            return true;
        } catch {
            return false;
        }
    },

    // Color Utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    getContrastColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return '#000000';

        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    },

    // Random Utilities
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    // Performance Utilities
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Animation Utilities
    easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },

    animate(duration, callback) {
        const start = performance.now();

        function frame(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            callback(progress);

            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }

        requestAnimationFrame(frame);
    },

    // Error Handling
    tryParseJSON(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            return defaultValue;
        }
    },

    safeExecution(func, errorHandler = null) {
        try {
            return func();
        } catch (error) {
            if (errorHandler) {
                errorHandler(error);
            } else {
                console.error('Safe execution error:', error);
            }
            return null;
        }
    },

    // Device Detection
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    isTablet() {
        return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    },

    isDesktop() {
        return !this.isMobile() && !this.isTablet();
    },

    // Browser Detection
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';

        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        else if (ua.includes('Opera')) browser = 'Opera';

        return {
            name: browser,
            version: this.getBrowserVersion(ua, browser),
            userAgent: ua
        };
    },

    getBrowserVersion(ua, browser) {
        const versionRegex = {
            Chrome: /Chrome\/(\d+)/,
            Firefox: /Firefox\/(\d+)/,
            Safari: /Version\/(\d+)/,
            Edge: /Edge\/(\d+)/,
            Opera: /Opera\/(\d+)/
        };

        const match = ua.match(versionRegex[browser]);
        return match ? match[1] : 'Unknown';
    },

    // Network Utilities
    isOnline() {
        return navigator.onLine;
    },

    onNetworkChange(callback) {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));
    },

    // Theme Utilities
    setTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        this.storage.set('selectedTheme', themeName);
    },

    getTheme() {
        return this.storage.get('selectedTheme', 'light');
    },

    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    }
};

// Notification System
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = 5000, options = {}) {
        const notification = this.create(message, type, options);
        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    create(message, type, options) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible notification-toast`;
        notification.style.cssText = `
            transform: translateX(100%);
            transition: transform 0.3s ease;
            margin-bottom: 0.5rem;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        const icon = this.getIcon(type);

        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${icon} me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" onclick="notificationManager.remove(this.closest('.notification-toast'))"></button>
            </div>
        `;

        // Add custom options
        if (options.title) {
            notification.innerHTML = `
                <div class="d-flex align-items-start">
                    <i class="fas ${icon} me-2 mt-1"></i>
                    <div class="flex-grow-1">
                        <strong>${options.title}</strong><br>
                        ${message}
                    </div>
                    <button type="button" class="btn-close" onclick="notificationManager.remove(this.closest('.notification-toast'))"></button>
                </div>
            `;
        }

        return notification;
    }

    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            primary: 'fa-bell'
        };
        return icons[type] || icons.info;
    }

    remove(notification) {
        if (notification && notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                    this.notifications = this.notifications.filter(n => n !== notification);
                }
            }, 300);
        }
    }

    removeAll() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
    }
}

// Create global instances
const notificationManager = new NotificationManager();

// Global notification function
function showNotification(message, type = 'info', duration = 5000, options = {}) {
    return notificationManager.show(message, type, duration, options);
}

// Loading Manager
class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
        this.overlay = null;
    }

    show(target = 'body', text = 'Loading...') {
        const loader = this.create(text);
        const targetElement = typeof target === 'string' ? document.querySelector(target) : target;

        if (targetElement) {
            targetElement.style.position = 'relative';
            targetElement.appendChild(loader);
            this.activeLoaders.add(loader);
        }

        return loader;
    }

    create(text) {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9998;
            border-radius: inherit;
        `;

        loader.innerHTML = `
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="text-muted">${text}</div>
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
            this.hide(loader);
        });
    }
}

const loadingManager = new LoadingManager();

// Global loading functions
function showLoading(target, text) {
    return loadingManager.show(target, text);
}

function hideLoading(loader) {
    loadingManager.hide(loader);
}

// Make utilities available globally
window.DSAUtils = DSAUtils;
window.notificationManager = notificationManager;
window.showNotification = showNotification;
window.loadingManager = loadingManager;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DSAUtils,
        NotificationManager,
        LoadingManager
    };
}