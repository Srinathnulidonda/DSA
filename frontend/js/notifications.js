// Notification System
const Notifications = {
    container: null,
    defaultDuration: 5000,
    maxNotifications: 5,

    // Initialize notifications
    init() {
        this.createContainer();
        this.setupSoundSupport();
        return this;
    },

    // Create notifications container
    createContainer() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'position-fixed top-0 end-0 p-3';
            this.container.style.zIndex = '9999';
            document.body.appendChild(this.container);
        }
    },

    // Setup sound support
    setupSoundSupport() {
        this.sounds = {};

        // Preload notification sounds
        Object.entries(SOUND_FILES).forEach(([key, src]) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.volume = 0.3;
            this.sounds[key] = audio;
        });
    },

    // Show notification
    show(message, type = 'info', options = {}) {
        const notification = this.create(message, type, options);
        this.display(notification);

        // Play sound if enabled
        if (options.sound !== false) {
            this.playSound(type);
        }

        return notification;
    },

    // Create notification element
    create(message, type, options = {}) {
        const id = Utils.generateId('toast');
        const duration = options.duration || this.defaultDuration;
        const title = options.title || this.getDefaultTitle(type);
        const icon = options.icon || this.getDefaultIcon(type);
        const actions = options.actions || [];

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0 animate-fade-in-right`;
        toast.id = id;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.dataset.type = type;

        let actionsHtml = '';
        if (actions.length > 0) {
            actionsHtml = `
                <div class="toast-actions mt-2">
                    ${actions.map(action => `
                        <button type="button" class="btn btn-sm btn-outline-light me-2" 
                                data-action="${action.id}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <div class="d-flex align-items-start">
                        <i class="${icon} me-2 mt-1 flex-shrink-0"></i>
                        <div class="flex-grow-1">
                            ${title ? `<div class="fw-bold mb-1">${title}</div>` : ''}
                            <div>${message}</div>
                            ${actionsHtml}
                        </div>
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        // Add action event listeners
        actions.forEach(action => {
            const button = toast.querySelector(`[data-action="${action.id}"]`);
            if (button && action.handler) {
                button.addEventListener('click', () => {
                    action.handler();
                    this.hide(id);
                });
            }
        });

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }

        // Add to notification history (for debugging/analytics)
        this.addToHistory(message, type, options);

        return toast;
    },

    // Display notification
    display(notification) {
        // Limit number of notifications
        this.enforceMaxNotifications();

        // Add to container
        this.container.appendChild(notification);

        // Initialize Bootstrap toast
        const bsToast = new bootstrap.Toast(notification);
        bsToast.show();

        // Remove from DOM when hidden
        notification.addEventListener('hidden.bs.toast', () => {
            notification.remove();
        });
    },

    // Hide specific notification
    hide(id) {
        const notification = document.getElementById(id);
        if (notification) {
            const bsToast = bootstrap.Toast.getInstance(notification);
            if (bsToast) {
                bsToast.hide();
            } else {
                notification.remove();
            }
        }
    },

    // Clear all notifications
    clear() {
        const notifications = this.container.querySelectorAll('.toast');
        notifications.forEach(notification => {
            const bsToast = bootstrap.Toast.getInstance(notification);
            if (bsToast) {
                bsToast.hide();
            } else {
                notification.remove();
            }
        });
    },

    // Enforce maximum notifications
    enforceMaxNotifications() {
        const notifications = this.container.querySelectorAll('.toast');
        if (notifications.length >= this.maxNotifications) {
            // Remove oldest notification
            const oldest = notifications[0];
            const bsToast = bootstrap.Toast.getInstance(oldest);
            if (bsToast) {
                bsToast.hide();
            } else {
                oldest.remove();
            }
        }
    },

    // Get default title for type
    getDefaultTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || '';
    },

    // Get default icon for type
    getDefaultIcon(type) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        return icons[type] || 'bi-info-circle-fill';
    },

    // Play notification sound
    playSound(type) {
        try {
            const preferences = State.get('preferences') || {};
            if (!preferences.sounds) return;

            let soundKey = 'NOTIFICATION';
            if (type === 'success') soundKey = 'ACHIEVEMENT';

            const sound = this.sounds[soundKey];
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(error => {
                    console.warn('Could not play notification sound:', error);
                });
            }
        } catch (error) {
            console.warn('Sound playback error:', error);
        }
    },

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    },

    error(message, options = {}) {
        return this.show(message, 'danger', { ...options, duration: 8000 });
    },

    warning(message, options = {}) {
        return this.show(message, 'warning', { ...options, duration: 6000 });
    },

    info(message, options = {}) {
        return this.show(message, 'info', options);
    },

    // Progress notification
    progress(message, progress = 0, options = {}) {
        const notification = this.show(message, 'info', {
            ...options,
            duration: 0, // Don't auto-hide
            progress: true
        });

        // Add progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'progress mt-2';
        progressBar.style.height = '4px';
        progressBar.innerHTML = `
            <div class="progress-bar" role="progressbar" 
                 style="width: ${progress}%" 
                 aria-valuenow="${progress}" 
                 aria-valuemin="0" 
                 aria-valuemax="100">
            </div>
        `;

        const toastBody = notification.querySelector('.toast-body');
        toastBody.appendChild(progressBar);

        // Return update function
        return {
            update: (newProgress, newMessage) => {
                const bar = progressBar.querySelector('.progress-bar');
                bar.style.width = `${newProgress}%`;
                bar.setAttribute('aria-valuenow', newProgress);

                if (newMessage) {
                    const messageEl = toastBody.querySelector('div:not(.progress)');
                    messageEl.textContent = newMessage;
                }

                if (newProgress >= 100) {
                    setTimeout(() => this.hide(notification.id), 2000);
                }
            },
            hide: () => this.hide(notification.id)
        };
    },

    // Loading notification
    loading(message, options = {}) {
        return this.show(message, 'info', {
            ...options,
            duration: 0,
            icon: 'bi-arrow-clockwise animate-spin',
            title: 'Loading...'
        });
    },

    // Confirmation notification with actions
    confirm(message, onConfirm, onCancel, options = {}) {
        return this.show(message, 'warning', {
            ...options,
            duration: 0,
            title: options.title || 'Confirm Action',
            actions: [
                {
                    id: 'confirm',
                    label: options.confirmLabel || 'Confirm',
                    handler: onConfirm
                },
                {
                    id: 'cancel',
                    label: options.cancelLabel || 'Cancel',
                    handler: onCancel
                }
            ]
        });
    },

    // Achievement notification
    achievement(title, description, options = {}) {
        const notification = this.show(description, 'success', {
            ...options,
            title: `🎉 ${title}`,
            icon: 'bi-trophy-fill',
            duration: 8000,
            sound: true
        });

        // Add celebration effect
        this.showCelebration();

        return notification;
    },

    // Show celebration confetti
    showCelebration() {
        // Create confetti container
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);

        // Create confetti pieces
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            confettiContainer.appendChild(confetti);
        }

        // Remove confetti after animation
        setTimeout(() => {
            confettiContainer.remove();
        }, 5000);
    },

    // Notification history (for debugging)
    history: [],
    maxHistory: 100,

    addToHistory(message, type, options) {
        this.history.unshift({
            message,
            type,
            options,
            timestamp: new Date(),
            id: Utils.generateId('history')
        });

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
    },

    getHistory() {
        return [...this.history];
    },

    clearHistory() {
        this.history = [];
    },

    // Browser notification support
    requestPermission() {
        if ('Notification' in window) {
            return Notification.requestPermission();
        }
        return Promise.resolve('denied');
    },

    showBrowserNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: options.body || '',
                icon: options.icon || '/assets/icons/apple-touch-icon.png',
                badge: '/assets/icons/apple-touch-icon.png',
                tag: options.tag || 'dsapath',
                requireInteraction: options.requireInteraction || false,
                ...options
            });

            // Auto-close after delay
            if (options.autoClose !== false) {
                setTimeout(() => notification.close(), options.duration || 5000);
            }

            return notification;
        }

        return null;
    },

    // Handle API errors
    handleApiError(error, context = '') {
        let message = 'An unexpected error occurred';
        let type = 'danger';

        if (error.type) {
            switch (error.type) {
                case 'NETWORK_ERROR':
                    message = 'Network connection failed. Please check your internet connection.';
                    break;
                case 'UNAUTHORIZED':
                    message = 'Your session has expired. Please log in again.';
                    break;
                case 'FORBIDDEN':
                    message = 'You don\'t have permission to perform this action.';
                    break;
                case 'NOT_FOUND':
                    message = 'The requested resource was not found.';
                    break;
                case 'VALIDATION_ERROR':
                    message = error.message || 'Please check your input and try again.';
                    break;
                case 'RATE_LIMITED':
                    message = 'Too many requests. Please try again later.';
                    break;
                case 'SERVER_ERROR':
                    message = 'Server error occurred. Please try again later.';
                    break;
                default:
                    message = error.message || message;
            }
        } else {
            message = error.message || message;
        }

        // Add context if provided
        if (context) {
            message = `${context}: ${message}`;
        }

        return this.error(message, {
            actions: error.type === 'NETWORK_ERROR' ? [
                {
                    id: 'retry',
                    label: 'Retry',
                    handler: () => window.location.reload()
                }
            ] : []
        });
    },

    // Batch notifications
    batch(notifications) {
        notifications.forEach((notification, index) => {
            setTimeout(() => {
                this.show(
                    notification.message,
                    notification.type || 'info',
                    notification.options || {}
                );
            }, index * 500); // Stagger notifications
        });
    },

    // Debug methods
    debug: {
        showAll() {
            const types = ['success', 'error', 'warning', 'info'];
            types.forEach((type, index) => {
                setTimeout(() => {
                    Notifications.show(`This is a ${type} notification`, type, {
                        title: `${Utils.titleCase(type)} Test`
                    });
                }, index * 1000);
            });
        },

        testProgress() {
            const progress = Notifications.progress('Processing...', 0);
            let current = 0;

            const interval = setInterval(() => {
                current += 10;
                progress.update(current, `Processing... ${current}%`);

                if (current >= 100) {
                    clearInterval(interval);
                }
            }, 500);
        },

        testCelebration() {
            Notifications.achievement('Test Achievement!', 'You have successfully tested the notification system!');
        }
    }
};

// Initialize notifications
Notifications.init();

// Make available globally
window.Notifications = Notifications;