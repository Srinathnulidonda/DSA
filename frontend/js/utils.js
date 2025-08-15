// utils.js - Utility functions

// Date and Time utilities
const DateUtils = {
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    },

    formatTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(new Date(date));
    },

    formatDateTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(new Date(date));
    },

    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    },

    getRelativeTime(date) {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const daysDiff = Math.round((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));

        if (Math.abs(daysDiff) < 1) {
            const hoursDiff = Math.round((new Date(date) - new Date()) / (1000 * 60 * 60));
            if (Math.abs(hoursDiff) < 1) {
                const minutesDiff = Math.round((new Date(date) - new Date()) / (1000 * 60));
                return rtf.format(minutesDiff, 'minute');
            }
            return rtf.format(hoursDiff, 'hour');
        }
        return rtf.format(daysDiff, 'day');
    },

    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }
};

// String utilities
const StringUtils = {
    truncate(str, length = 50, suffix = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length).trim() + suffix;
    },

    slugify(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    capitalizeWords(str) {
        return str.replace(/\b\w/g, char => char.toUpperCase());
    },

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Number utilities
const NumberUtils = {
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    },

    formatCompact(num) {
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short'
        }).format(num);
    },

    formatPercentage(num, decimals = 0) {
        return `${num.toFixed(decimals)}%`;
    },

    clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

// Array utilities
const ArrayUtils = {
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    unique(array) {
        return [...new Set(array)];
    },

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            if (!groups[group]) groups[group] = [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            if (order === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }
};

// Storage utilities
const StorageUtils = {
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },

    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage error:', e);
            return defaultValue;
        }
    },

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    }
};

// Validation utilities
const ValidationUtils = {
    isEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    isUsername(username) {
        const re = /^[a-zA-Z0-9_]{3,20}$/;
        return re.test(username);
    },

    isStrongPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    },

    sanitizeInput(input) {
        return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
};

// Browser utilities
const BrowserUtils = {
    copyToClipboard(text) {
        return navigator.clipboard.writeText(text);
    },

    share(data) {
        if (navigator.share) {
            return navigator.share(data);
        } else {
            throw new Error('Web Share API not supported');
        }
    },

    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    setQueryParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.pushState({}, '', url);
    },

    removeQueryParam(param) {
        const url = new URL(window.location);
        url.searchParams.delete(param);
        window.history.pushState({}, '', url);
    },

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    isOnline() {
        return navigator.onLine;
    },

    vibrate(pattern = 200) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
};

// Animation utilities
const AnimationUtils = {
    fadeIn(element, duration = 300) {
        element.style.opacity = 0;
        element.style.display = 'block';

        const start = performance.now();

        const animate = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    },

    fadeOut(element, duration = 300) {
        const start = performance.now();
        const initialOpacity = parseFloat(window.getComputedStyle(element).opacity);

        const animate = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = initialOpacity * (1 - progress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };

        requestAnimationFrame(animate);
    },

    slideDown(element, duration = 300) {
        element.style.height = '0px';
        element.style.overflow = 'hidden';
        element.style.display = 'block';

        const targetHeight = element.scrollHeight;
        const start = performance.now();

        const animate = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.height = `${targetHeight * progress}px`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = '';
                element.style.overflow = '';
            }
        };

        requestAnimationFrame(animate);
    },

    slideUp(element, duration = 300) {
        const initialHeight = element.offsetHeight;
        const start = performance.now();

        element.style.height = `${initialHeight}px`;
        element.style.overflow = 'hidden';

        const animate = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.height = `${initialHeight * (1 - progress)}px`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            }
        };

        requestAnimationFrame(animate);
    }
};

// Export utilities
window.Utils = {
    Date: DateUtils,
    String: StringUtils,
    Number: NumberUtils,
    Array: ArrayUtils,
    Storage: StorageUtils,
    Validation: ValidationUtils,
    Browser: BrowserUtils,
    Animation: AnimationUtils
};