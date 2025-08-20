// Utility Functions for DSA Path Application

const Utils = {
    // DOM Utilities
    dom: {
        /**
         * Query selector with null check
         */
        $(selector, context = document) {
            return context.querySelector(selector);
        },

        /**
         * Query selector all
         */
        $$(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        },

        /**
         * Create element with attributes and content
         */
        createElement(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);

            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else {
                    element.setAttribute(key, value);
                }
            });

            if (content) {
                element.textContent = content;
            }

            return element;
        },

        /**
         * Add event listener with cleanup
         */
        on(element, event, handler, options = {}) {
            element.addEventListener(event, handler, options);
            return () => element.removeEventListener(event, handler, options);
        },

        /**
         * Show element with animation
         */
        show(element, animation = 'fade-in') {
            element.classList.remove('d-none', 'hidden');
            element.classList.add('animate-' + animation);
        },

        /**
         * Hide element with animation
         */
        hide(element, animation = 'fade-out') {
            element.classList.add('animate-' + animation);
            setTimeout(() => {
                element.classList.add('d-none');
                element.classList.remove('animate-' + animation);
            }, 300);
        },

        /**
         * Toggle element visibility
         */
        toggle(element, show = null) {
            const isHidden = element.classList.contains('d-none') || element.classList.contains('hidden');

            if (show === null) {
                if (isHidden) {
                    this.show(element);
                } else {
                    this.hide(element);
                }
            } else if (show) {
                this.show(element);
            } else {
                this.hide(element);
            }
        }
    },

    // String Utilities
    string: {
        /**
         * Capitalize first letter
         */
        capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        /**
         * Convert to kebab-case
         */
        kebabCase(str) {
            return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        },

        /**
         * Convert to camelCase
         */
        camelCase(str) {
            return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        },

        /**
         * Truncate string with ellipsis
         */
        truncate(str, length = 100, suffix = '...') {
            if (str.length <= length) return str;
            return str.substring(0, length - suffix.length) + suffix;
        },

        /**
         * Generate random string
         */
        random(length = 10) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        /**
         * Generate URL-safe slug
         */
        slugify(str) {
            return str
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        },

        /**
         * Highlight search terms in text
         */
        highlight(text, searchTerm) {
            if (!searchTerm) return text;
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            return text.replace(regex, '<mark class="search-highlight">$1</mark>');
        }
    },

    // Array Utilities
    array: {
        /**
         * Remove duplicates from array
         */
        unique(arr) {
            return [...new Set(arr)];
        },

        /**
         * Group array by key
         */
        groupBy(arr, key) {
            return arr.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        },

        /**
         * Sort array by multiple keys
         */
        sortBy(arr, ...keys) {
            return arr.sort((a, b) => {
                for (const key of keys) {
                    let aVal = a[key];
                    let bVal = b[key];

                    if (typeof aVal === 'string') {
                        aVal = aVal.toLowerCase();
                        bVal = bVal.toLowerCase();
                    }

                    if (aVal < bVal) return -1;
                    if (aVal > bVal) return 1;
                }
                return 0;
            });
        },

        /**
         * Chunk array into smaller arrays
         */
        chunk(arr, size) {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        },

        /**
         * Shuffle array
         */
        shuffle(arr) {
            const shuffled = [...arr];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }
    },

    // Date Utilities
    date: {
        /**
         * Format date to readable string
         */
        format(date, format = 'YYYY-MM-DD') {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');

            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day)
                .replace('HH', hours)
                .replace('mm', minutes)
                .replace('ss', seconds);
        },

        /**
         * Get relative time string
         */
        relative(date) {
            const now = new Date();
            const then = new Date(date);
            const diff = now - then;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const weeks = Math.floor(days / 7);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);

            if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
            if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
            if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
            if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            return 'Just now';
        },

        /**
         * Check if date is today
         */
        isToday(date) {
            const today = new Date();
            const checkDate = new Date(date);
            return today.toDateString() === checkDate.toDateString();
        },

        /**
         * Get week number
         */
        getWeekNumber(date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
            const week1 = new Date(d.getFullYear(), 0, 4);
            return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        },

        /**
         * Add days to date
         */
        addDays(date, days) {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }
    },

    // Number Utilities
    number: {
        /**
         * Format number with commas
         */
        format(num, decimals = 0) {
            return num.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        },

        /**
         * Convert to percentage
         */
        toPercent(num, decimals = 1) {
            return (num * 100).toFixed(decimals) + '%';
        },

        /**
         * Clamp number between min and max
         */
        clamp(num, min, max) {
            return Math.min(Math.max(num, min), max);
        },

        /**
         * Generate random number between min and max
         */
        random(min = 0, max = 1) {
            return Math.random() * (max - min) + min;
        },

        /**
         * Round to specified decimal places
         */
        round(num, decimals = 0) {
            const factor = Math.pow(10, decimals);
            return Math.round(num * factor) / factor;
        }
    },

    // Time Utilities
    time: {
        /**
         * Format seconds to MM:SS or HH:MM:SS
         */
        formatDuration(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        },

        /**
         * Parse duration string to seconds
         */
        parseDuration(duration) {
            const parts = duration.split(':').map(Number);
            if (parts.length === 2) {
                return parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
            return 0;
        },

        /**
         * Debounce function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function
         */
        throttle(func, limit) {
            let inThrottle;
            return function () {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    },

    // URL Utilities
    url: {
        /**
         * Parse query parameters
         */
        parseQuery(search = window.location.search) {
            const params = new URLSearchParams(search);
            const result = {};
            for (const [key, value] of params) {
                result[key] = value;
            }
            return result;
        },

        /**
         * Build query string
         */
        buildQuery(params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    searchParams.append(key, value);
                }
            });
            return searchParams.toString();
        },

        /**
         * Get base URL
         */
        getBase() {
            return `${window.location.protocol}//${window.location.host}`;
        },

        /**
         * Join URL parts
         */
        join(...parts) {
            return parts
                .map(part => part.replace(/^\/+|\/+$/g, ''))
                .filter(Boolean)
                .join('/');
        }
    },

    // Browser Utilities
    browser: {
        /**
         * Copy text to clipboard
         */
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return successful;
                } catch (err) {
                    document.body.removeChild(textArea);
                    return false;
                }
            }
        },

        /**
         * Download file from URL
         */
        download(url, filename) {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        /**
         * Get device type
         */
        getDeviceType() {
            const width = window.innerWidth;
            if (width < 576) return 'mobile';
            if (width < 768) return 'tablet';
            if (width < 992) return 'laptop';
            return 'desktop';
        },

        /**
         * Check if mobile device
         */
        isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },

        /**
         * Check if touch device
         */
        isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },

        /**
         * Scroll to element
         */
        scrollTo(element, options = {}) {
            const defaultOptions = {
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            };

            if (typeof element === 'string') {
                element = document.querySelector(element);
            }

            if (element) {
                element.scrollIntoView({ ...defaultOptions, ...options });
            }
        }
    },

    // Validation Utilities
    validation: {
        /**
         * Validate email
         */
        isValidEmail(email) {
            return VALIDATION_RULES.EMAIL.PATTERN.test(email);
        },

        /**
         * Validate password
         */
        isValidPassword(password) {
            const rules = VALIDATION_RULES.PASSWORD;

            if (password.length < rules.MIN_LENGTH) return false;
            if (rules.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) return false;
            if (rules.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) return false;
            if (rules.REQUIRE_NUMBER && !/\d/.test(password)) return false;
            if (rules.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

            return true;
        },

        /**
         * Sanitize HTML
         */
        sanitizeHtml(html) {
            const temp = document.createElement('div');
            temp.textContent = html;
            return temp.innerHTML;
        },

        /**
         * Validate file type
         */
        isValidFileType(file, allowedTypes) {
            return allowedTypes.includes(file.type);
        },

        /**
         * Validate file size
         */
        isValidFileSize(file, maxSize) {
            return file.size <= maxSize;
        }
    },

    // Animation Utilities
    animation: {
        /**
         * Animate element with CSS classes
         */
        animate(element, animation, duration = 300) {
            return new Promise((resolve) => {
                element.classList.add(`animate-${animation}`);

                const handleAnimationEnd = () => {
                    element.classList.remove(`animate-${animation}`);
                    element.removeEventListener('animationend', handleAnimationEnd);
                    resolve();
                };

                element.addEventListener('animationend', handleAnimationEnd);

                // Fallback timeout
                setTimeout(() => {
                    handleAnimationEnd();
                }, duration);
            });
        },

        /**
         * Create confetti effect
         */
        confetti(options = {}) {
            const defaults = {
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            };

            const config = { ...defaults, ...options };

            for (let i = 0; i < config.particleCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.backgroundColor = this.getRandomColor();
                confetti.style.width = Math.random() * 10 + 5 + 'px';
                confetti.style.height = confetti.style.width;

                document.body.appendChild(confetti);

                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                }, 3000);
            }
        },

        /**
         * Get random color
         */
        getRandomColor() {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
    },

    // Error Handling
    error: {
        /**
         * Log error with context
         */
        log(error, context = '') {
            console.error(`[DSA Path Error] ${context}:`, error);

            // In production, you might want to send errors to a logging service
            if (process.env.NODE_ENV === 'production') {
                // Send to error tracking service
            }
        },

        /**
         * Handle API errors
         */
        handleApiError(error) {
            if (error.response) {
                const status = error.response.status;
                switch (status) {
                    case 401:
                        return ERROR_MESSAGES.UNAUTHORIZED;
                    case 403:
                        return ERROR_MESSAGES.FORBIDDEN;
                    case 404:
                        return ERROR_MESSAGES.NOT_FOUND;
                    case 422:
                        return ERROR_MESSAGES.VALIDATION_ERROR;
                    case 500:
                        return ERROR_MESSAGES.SERVER_ERROR;
                    default:
                        return ERROR_MESSAGES.UNKNOWN_ERROR;
                }
            } else if (error.request) {
                return ERROR_MESSAGES.NETWORK_ERROR;
            } else {
                return ERROR_MESSAGES.UNKNOWN_ERROR;
            }
        }
    }
};

// Export Utils for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}