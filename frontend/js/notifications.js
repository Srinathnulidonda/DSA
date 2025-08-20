// Notification System for DSA Path Application

const Notifications = {
    // Container for notifications
    container: null,

    // Active notifications
    active: new Map(),

    // Default settings
    defaults: {
        duration: 5000,
        position: 'top-end',
        showProgress: true,
        allowDismiss: true,
        maxVisible: 5
    },

    /**
     * Initialize notification system
     */
    init() {
        this.createContainer();
        this.setupStyles();
        this.loadNotifications();
    },

    /**
     * Create notification container
     */
    createContainer() {
        this.container = Utils.dom.$('#toast-container');

        if (!this.container) {
            this.container = Utils.dom.createElement('div', {
                id: 'toast-container',
                className: 'toast-container position-fixed top-0 end-0 p-3',
                style: 'z-index: 1100;'
            });

            document.body.appendChild(this.container);
        }
    },

    /**
     * Show notification
     */
    show(message, type = 'info', options = {}) {
        const config = { ...this.defaults, ...options };
        const id = Utils.string.random(8);

        // Limit number of visible notifications
        if (this.active.size >= config.maxVisible) {
            const oldest = this.active.keys().next().value;
            this.hide(oldest);
        }

        const notification = this.create(id, message, type, config);
        this.container.appendChild(notification);

        // Store reference
        this.active.set(id, notification);

        // Show with animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-hide if duration is set
        if (config.duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, config.duration);
        }

        return id;
    },

    /**
     * Create notification element
     */
    create(id, message, type, config) {
        const toast = Utils.dom.createElement('div', {
            id: `toast-${id}`,
            className: `toast toast-custom toast-${type}`,
            role: 'alert',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });

        const header = Utils.dom.createElement('div', {
            className: 'toast-header'
        });

        // Icon
        const icon = Utils.dom.createElement('i', {
            className: `${this.getTypeIcon(type)} me-2`
        });

        // Title
        const title = Utils.dom.createElement('strong', {
            className: 'me-auto'
        }, this.getTypeTitle(type));

        // Timestamp
        const time = Utils.dom.createElement('small', {}, 'now');

        // Close button
        let closeBtn = null;
        if (config.allowDismiss) {
            closeBtn = Utils.dom.createElement('button', {
                type: 'button',
                className: 'btn-close',
                'aria-label': 'Close'
            });

            closeBtn.addEventListener('click', () => {
                this.hide(id);
            });
        }

        header.appendChild(icon);
        header.appendChild(title);
        header.appendChild(time);
        if (closeBtn) header.appendChild(closeBtn);

        // Body
        const body = Utils.dom.createElement('div', {
            className: 'toast-body'
        }, message);

        // Progress bar
        let progress = null;
        if (config.showProgress && config.duration > 0) {
            progress = Utils.dom.createElement('div', {
                className: 'toast-progress'
            });

            const progressBar = Utils.dom.createElement('div', {
                className: 'toast-progress-bar',
                style: `animation: toast-progress ${config.duration}ms linear;`
            });

            progress.appendChild(progressBar);
        }

        toast.appendChild(header);
        toast.appendChild(body);
        if (progress) toast.appendChild(progress);

        return toast;
    },

    /**
     * Hide notification
     */
    hide(id) {
        const notification = this.active.get(id);
        if (!notification) return;

        notification.classList.remove('show');
        notification.classList.add('hide');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.active.delete(id);
        }, 300);
    },

    /**
     * Clear all notifications
     */
    clear() {
        this.active.forEach((notification, id) => {
            this.hide(id);
        });
    },

    /**
     * Get icon for notification type
     */
    getTypeIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        return icons[type] || icons.info;
    },

    /**
     * Get title for notification type
     */
    getTypeTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };

        return titles[type] || titles.info;
    },

    /**
     * Setup notification styles
     */
    setupStyles() {
        const styles = `
      .toast-custom {
        min-width: 300px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: none;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      }
      
      .toast-success {
        background-color: rgba(16, 185, 129, 0.95);
        color: white;
      }
      
      .toast-error {
        background-color: rgba(239, 68, 68, 0.95);
        color: white;
      }
      
      .toast-warning {
        background-color: rgba(245, 158, 11, 0.95);
        color: white;
      }
      
      .toast-info {
        background-color: rgba(59, 130, 246, 0.95);
        color: white;
      }
      
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background-color: rgba(255, 255, 255, 0.3);
        overflow: hidden;
      }
      
      .toast-progress-bar {
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.8);
        transform-origin: left center;
      }
      
      @keyframes toast-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }
      
      .toast.show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .toast.hide {
        opacity: 0;
        transform: translateX(100%);
      }
    `;

        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    },

    /**
     * Load notifications from backend
     */
    async loadNotifications() {
        if (!Auth.isLoggedIn()) return;

        try {
            const response = await ApiMethods.notifications.getAll(1, 10);
            const unreadCount = response.notifications.filter(n => !n.is_read).length;

            // Update notification badge
            this.updateBadge(unreadCount);

            // Store in state
            State.setState('user.notifications', response.notifications);

        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    },

    /**
     * Update notification badge
     */
    updateBadge(count) {
        const badge = Utils.dom.$('#notification-badge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    },

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            await ApiMethods.notifications.markAsRead(notificationId);

            // Update state
            const notifications = State.getState('user.notifications') || [];
            const updated = notifications.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            );
            State.setState('user.notifications', updated);

            // Update badge
            const unreadCount = updated.filter(n => !n.is_read).length;
            this.updateBadge(unreadCount);

        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    },

    /**
     * Show system notification (browser notification)
     */
    async showSystem(title, options = {}) {
        // Check permission
        if (Notification.permission === 'denied') return;

        // Request permission if needed
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
        }

        // Show notification
        const notification = new Notification(title, {
            icon: '/assets/icons/favicon.ico',
            badge: '/assets/icons/favicon.ico',
            ...options
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    },

    /**
     * Shortcuts for common notification types
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    },

    error(message, options = {}) {
        return this.show(message, 'error', { duration: 0, ...options });
    },

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    },

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
};

// Export Notifications for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Notifications;
}