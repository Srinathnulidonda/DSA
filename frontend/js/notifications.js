// Notification System

class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.init();
    }

    init() {
        // Create notification container
        this.createContainer();

        // Request browser notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container position-fixed top-0 end-0 p-3';
        this.container.style.zIndex = '9999';
        this.container.style.marginTop = '80px';
        document.body.appendChild(this.container);
    }

    // Show notification
    show(message, type = NOTIFICATION_TYPES.INFO, options = {}) {
        const id = utils.generateId();
        const notification = this.createNotification(id, message, type, options);

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Bootstrap toast
        const toast = new bootstrap.Toast(notification, {
            autohide: options.autohide !== false,
            delay: options.delay || 5000
        });

        toast.show();

        // Remove after hidden
        notification.addEventListener('hidden.bs.toast', () => {
            this.remove(id);
        });

        return id;
    }

    createNotification(id, message, type, options) {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.dataset.notificationId = id;

        // Add type-specific styling
        const bgClass = {
            [NOTIFICATION_TYPES.SUCCESS]: 'bg-success text-white',
            [NOTIFICATION_TYPES.ERROR]: 'bg-danger text-white',
            [NOTIFICATION_TYPES.WARNING]: 'bg-warning',
            [NOTIFICATION_TYPES.INFO]: 'bg-primary text-white'
        }[type] || 'bg-secondary text-white';

        toast.className += ` ${bgClass}`;

        // Icon
        const icon = {
            [NOTIFICATION_TYPES.SUCCESS]: 'fa-check-circle',
            [NOTIFICATION_TYPES.ERROR]: 'fa-exclamation-circle',
            [NOTIFICATION_TYPES.WARNING]: 'fa-exclamation-triangle',
            [NOTIFICATION_TYPES.INFO]: 'fa-info-circle'
        }[type] || 'fa-bell';

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas ${icon} me-2"></i>
                    ${utils.escapeHtml(message)}
                </div>
                <button type="button" class="btn-close ${bgClass.includes('text-white') ? 'btn-close-white' : ''} me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        // Add action button if provided
        if (options.action) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'btn btn-sm btn-link text-white text-decoration-none ms-2';
            actionBtn.textContent = options.action.text;
            actionBtn.onclick = options.action.handler;
            toast.querySelector('.toast-body').appendChild(actionBtn);
        }

        return toast;
    }

    // Remove notification
    remove(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.remove();
            this.notifications.delete(id);
        }
    }

    // Clear all notifications
    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }

    // Show specific types
    success(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.SUCCESS, options);
    }

    error(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.ERROR, { ...options, autohide: false });
    }

    warning(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.WARNING, options);
    }

    info(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.INFO, options);
    }

    // Show browser notification
    showBrowserNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/icon-72x72.png',
                ...options
            });

            if (options.onclick) {
                notification.onclick = options.onclick;
            }

            return notification;
        }
    }
}

// Create global instance
window.notifications = new NotificationManager();