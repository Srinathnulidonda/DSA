// Notification System
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.sound = new Audio('/assets/sounds/notification.mp3');
        this.queue = [];
        this.init();
    }

    async init() {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return;
        }

        // Get current permission status
        this.permission = Notification.permission;

        // Request permission if not granted
        if (this.permission === 'default') {
            await this.requestPermission();
        }

        // Load notification preferences
        this.loadPreferences();
    }

    async requestPermission() {
        try {
            this.permission = await Notification.requestPermission();
            return this.permission === 'granted';
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return false;
        }
    }

    loadPreferences() {
        const prefs = preferences.getNotifications();
        this.soundEnabled = prefs.sound !== false;
        this.desktopEnabled = prefs.enabled !== false;
    }

    // Show toast notification
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = this.getToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast show align-items-center text-white bg-${this.getBootstrapColor(type)} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        const icon = this.getIcon(type);

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="${icon} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Play sound if enabled
        if (this.soundEnabled && type !== 'info') {
            this.playSound();
        }

        // Auto remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        // Close button handler
        const closeBtn = toast.querySelector('.btn-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });

        return toast;
    }

    // Show desktop notification
    async showDesktop(title, options = {}) {
        if (!this.desktopEnabled || this.permission !== 'granted') {
            return null;
        }

        try {
            const notification = new Notification(title, {
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/icon-72x72.png',
                tag: options.tag || 'dsa-notification',
                requireInteraction: options.requireInteraction || false,
                ...options
            });

            // Handle click
            notification.onclick = () => {
                window.focus();
                if (options.onclick) {
                    options.onclick();
                }
                notification.close();
            };

            return notification;
        } catch (error) {
            console.error('Failed to show desktop notification:', error);
            return null;
        }
    }

    // Show both toast and desktop notification
    show(message, type = 'info', options = {}) {
        // Always show toast
        this.showToast(message, type, options.duration);

        // Show desktop notification if appropriate
        if (options.desktop !== false && document.hidden) {
            this.showDesktop(options.title || 'DSAPath', {
                body: message,
                ...options
            });
        }
    }

    // Play notification sound
    playSound() {
        if (this.soundEnabled) {
            this.sound.play().catch(e => {
                console.log('Could not play notification sound:', e);
            });
        }
    }

    // Get toast container or create one
    getToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            container.style.marginTop = 'var(--topbar-height)';
            document.body.appendChild(container);
        }
        return container;
    }

    // Get Bootstrap color for notification type
    getBootstrapColor(type) {
        const colorMap = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info',
            'primary': 'primary'
        };
        return colorMap[type] || 'secondary';
    }

    // Get icon for notification type
    getIcon(type) {
        const iconMap = {
            'success': 'bi bi-check-circle-fill',
            'error': 'bi bi-x-circle-fill',
            'warning': 'bi bi-exclamation-triangle-fill',
            'info': 'bi bi-info-circle-fill',
            'primary': 'bi bi-star-fill'
        };
        return iconMap[type] || 'bi bi-bell-fill';
    }

    // Notification presets
    success(message, options = {}) {
        this.show(message, 'success', { title: 'Success', ...options });
    }

    error(message, options = {}) {
        this.show(message, 'error', { title: 'Error', ...options });
    }

    warning(message, options = {}) {
        this.show(message, 'warning', { title: 'Warning', ...options });
    }

    info(message, options = {}) {
        this.show(message, 'info', { title: 'Info', ...options });
    }

    // Achievement notification with confetti
    achievement(title, message, options = {}) {
        this.show(message, 'success', {
            title: `🎉 ${title}`,
            duration: 7000,
            requireInteraction: true,
            ...options
        });

        // Trigger confetti if available
        if (window.confetti) {
            window.confetti.start();
        }
    }

    // Streak notification
    streak(days) {
        const messages = [
            { min: 1, max: 3, text: "Great start! Keep it up!" },
            { min: 4, max: 6, text: "You're building momentum!" },
            { min: 7, max: 13, text: "One week streak! Amazing!" },
            { min: 14, max: 29, text: "Two weeks strong! You're unstoppable!" },
            { min: 30, max: 59, text: "One month streak! Incredible dedication!" },
            { min: 60, max: 99, text: "Two months! You're a DSA champion!" },
            { min: 100, max: Infinity, text: "100+ days! Legendary streak!" }
        ];

        const message = messages.find(m => days >= m.min && days <= m.max);

        this.achievement(`${days} Day Streak! 🔥`, message.text, {
            desktop: true,
            requireInteraction: true
        });
    }

    // Study reminder
    reminder(message = "Time for your daily DSA practice!") {
        this.show(message, 'info', {
            title: 'Study Reminder',
            desktop: true,
            duration: 10000,
            onclick: () => {
                window.location.href = '/pages/dashboard';
            }
        });
    }

    // Progress update
    progress(completed, total, topic) {
        const percentage = Math.round((completed / total) * 100);
        this.show(
            `Progress: ${completed}/${total} completed (${percentage}%)`,
            'primary',
            {
                title: `${topic} Progress`,
                desktop: false,
                duration: 3000
            }
        );
    }
}

// Initialize notification manager
const notifications = new NotificationManager();

// Export for global use
window.notifications = notifications;

// Helper functions for common notifications
window.notify = {
    success: (msg, opts) => notifications.success(msg, opts),
    error: (msg, opts) => notifications.error(msg, opts),
    warning: (msg, opts) => notifications.warning(msg, opts),
    info: (msg, opts) => notifications.info(msg, opts),
    achievement: (title, msg, opts) => notifications.achievement(title, msg, opts),
    streak: (days) => notifications.streak(days),
    reminder: (msg) => notifications.reminder(msg),
    progress: (completed, total, topic) => notifications.progress(completed, total, topic)
};