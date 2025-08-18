// js/components.js
/**
 * Component Management System
 * Handles reusable UI components and their interactions
 */

class ComponentManager {
    constructor() {
        this.components = new Map();
        this.eventListeners = new Map();
    }

    // Register a component
    register(name, component) {
        this.components.set(name, component);
    }

    // Get a component
    get(name) {
        return this.components.get(name);
    }

    // Initialize all components
    async initializeAll() {
        for (const [name, component] of this.components) {
            try {
                if (component.init && typeof component.init === 'function') {
                    await component.init();
                }
            } catch (error) {
                console.error(`Failed to initialize component: ${name}`, error);
            }
        }
    }

    // Add event listener with cleanup tracking
    addEventListener(element, event, handler, options = {}) {
        if (!element) return;

        element.addEventListener(event, handler, options);

        // Track for cleanup
        const key = `${element.id || 'anonymous'}-${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({ element, event, handler, options });
    }

    // Remove all tracked event listeners
    cleanup() {
        for (const [key, listeners] of this.eventListeners) {
            listeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        }
        this.eventListeners.clear();
    }
}

// Create global component manager
window.componentManager = new ComponentManager();

// Sidebar Component
const SidebarComponent = {
    element: null,
    isCollapsed: false,

    init() {
        this.element = document.getElementById('sidebar');
        if (!this.element) return;

        this.setupToggle();
        this.setupNavigation();
        this.setupResponsive();
        this.loadCollapseState();
    },

    setupToggle() {
        const toggleBtn = document.getElementById('toggleSidebar');
        const closeBtn = document.getElementById('closeSidebar');

        if (toggleBtn) {
            componentManager.addEventListener(toggleBtn, 'click', () => this.toggle());
        }

        if (closeBtn) {
            componentManager.addEventListener(closeBtn, 'click', () => this.hide());
        }
    },

    setupNavigation() {
        const navItems = this.element.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            componentManager.addEventListener(item, 'click', (e) => {
                const href = item.getAttribute('href');

                if (href && !href.startsWith('#')) {
                    e.preventDefault();
                    this.navigateToPage(href);
                }
            });
        });
    },

    setupResponsive() {
        // Auto-hide sidebar on mobile when clicking outside
        componentManager.addEventListener(document, 'click', (e) => {
            if (window.innerWidth <= 991.98) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('toggleSidebar');

                if (sidebar && !sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
                    this.hide();
                }
            }
        });

        // Handle resize events
        componentManager.addEventListener(window, 'resize', () => {
            if (window.innerWidth > 991.98) {
                this.element?.classList.remove('show');
            }
        });
    },

    toggle() {
        if (window.innerWidth <= 991.98) {
            this.element?.classList.toggle('show');
        } else {
            this.isCollapsed = !this.isCollapsed;
            this.element?.classList.toggle('collapsed', this.isCollapsed);
            this.saveCollapseState();
        }
    },

    show() {
        if (window.innerWidth <= 991.98) {
            this.element?.classList.add('show');
        }
    },

    hide() {
        if (window.innerWidth <= 991.98) {
            this.element?.classList.remove('show');
        }
    },

    collapse() {
        if (window.innerWidth > 991.98) {
            this.isCollapsed = true;
            this.element?.classList.add('collapsed');
            this.saveCollapseState();
        }
    },

    expand() {
        if (window.innerWidth > 991.98) {
            this.isCollapsed = false;
            this.element?.classList.remove('collapsed');
            this.saveCollapseState();
        }
    },

    navigateToPage(href) {
        // Update active state
        this.setActiveItem(href);

        // Navigate
        window.location.href = href;

        // Hide sidebar on mobile
        if (window.innerWidth <= 991.98) {
            this.hide();
        }
    },

    setActiveItem(href) {
        const navItems = this.element?.querySelectorAll('.nav-item');
        if (!navItems) return;

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === href) {
                item.classList.add('active');
            }
        });
    },

    saveCollapseState() {
        localStorage.setItem('sidebarCollapsed', this.isCollapsed.toString());
    },

    loadCollapseState() {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved === 'true' && window.innerWidth > 991.98) {
            this.collapse();
        }
    }
};

// Topbar Component
const TopbarComponent = {
    element: null,
    searchTimeout: null,

    init() {
        this.element = document.querySelector('.topbar');
        if (!this.element) return;

        this.setupSearch();
        this.setupNotifications();
        this.setupUserMenu();
        this.updateUserInfo();
    },

    setupSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (!searchInput) return;

        componentManager.addEventListener(searchInput, 'input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();

            if (query.length > 2) {
                this.searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 300);
            } else {
                this.hideSearchResults();
            }
        });

        componentManager.addEventListener(searchInput, 'focus', () => {
            searchInput.parentElement.classList.add('focused');
        });

        componentManager.addEventListener(searchInput, 'blur', () => {
            setTimeout(() => {
                searchInput.parentElement.classList.remove('focused');
                this.hideSearchResults();
            }, 200);
        });
    },

    async performSearch(query) {
        try {
            const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const results = await response.json();
                this.showSearchResults(results);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    },

    showSearchResults(results) {
        let resultsContainer = document.getElementById('searchResults');

        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'searchResults';
            resultsContainer.className = 'search-results dropdown-menu show';

            const searchBox = document.querySelector('.search-box');
            searchBox.appendChild(resultsContainer);
        }

        const allResults = [
            ...(results.resources || []).slice(0, 3),
            ...(results.notes || []).slice(0, 3),
            ...(results.roadmap || []).slice(0, 2)
        ];

        if (allResults.length === 0) {
            resultsContainer.innerHTML = '<div class="dropdown-item text-muted">No results found</div>';
            return;
        }

        resultsContainer.innerHTML = allResults.map(item => {
            if (item.url) { // Resource
                return `
                    <a class="dropdown-item" href="${item.url}" target="_blank">
                        <i class="fas fa-external-link-alt me-2 text-primary"></i>
                        ${item.title}
                        <small class="text-muted d-block">${item.type}</small>
                    </a>
                `;
            } else if (item.content) { // Note
                return `
                    <a class="dropdown-item" href="/notes">
                        <i class="fas fa-sticky-note me-2 text-warning"></i>
                        ${item.title}
                        <small class="text-muted d-block">Note</small>
                    </a>
                `;
            } else { // Roadmap
                return `
                    <a class="dropdown-item" href="/roadmap">
                        <i class="fas fa-map me-2 text-success"></i>
                        ${item.title}
                        <small class="text-muted d-block">Week ${item.week}</small>
                    </a>
                `;
            }
        }).join('');
    },

    hideSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.remove();
        }
    },

    setupNotifications() {
        const notificationBtn = document.querySelector('[data-bs-toggle="dropdown"]');
        if (!notificationBtn) return;

        componentManager.addEventListener(notificationBtn, 'click', () => {
            this.loadNotifications();
        });

        // Auto-refresh notifications
        setInterval(() => this.loadNotifications(), 60000); // Every minute
    },

    async loadNotifications() {
        try {
            const response = await fetch(`${API_BASE}/notifications?per_page=5`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateNotificationUI(data.notifications);
            }
        } catch (error) {
            console.error('Notification error:', error);
        }
    },

    updateNotificationUI(notifications) {
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
                            <small class="text-muted">${this.formatRelativeTime(notification.created_at)}</small>
                        </div>
                        <small class="text-muted">${notification.message}</small>
                    </div>
                `).join('');
            }
        }
    },

    setupUserMenu() {
        const logoutBtn = document.getElementById('logoutBtnTop');
        if (logoutBtn) {
            componentManager.addEventListener(logoutBtn, 'click', this.logout);
        }
    },

    updateUserInfo() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');

        if (userName) userName.textContent = user.name || 'User';
        if (userAvatar && user.avatar_url) userAvatar.src = user.avatar_url;
    },

    async logout() {
        try {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');

            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/login';
        }
    },

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
};

// Mobile Navigation Component
const MobileNavComponent = {
    element: null,

    init() {
        this.element = document.querySelector('.mobile-nav');
        if (!this.element) return;

        this.setupNavigation();
        this.setActiveItem();
    },

    setupNavigation() {
        const navItems = this.element.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            componentManager.addEventListener(item, 'click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');

                if (href && !href.startsWith('#')) {
                    this.navigateToPage(href);
                }
            });
        });
    },

    navigateToPage(href) {
        this.setActiveItem(href);
        window.location.href = href;
    },

    setActiveItem(href) {
        const currentPath = href || window.location.pathname;
        const navItems = this.element?.querySelectorAll('.nav-item');

        if (!navItems) return;

        navItems.forEach(item => {
            item.classList.remove('active');
            const itemHref = item.getAttribute('href');

            if (itemHref === currentPath ||
                (currentPath.includes(itemHref.replace('/', '')) && itemHref !== '/')) {
                item.classList.add('active');
            }
        });
    }
};

// Modal Component
const ModalComponent = {
    modals: new Map(),

    init() {
        this.setupGlobalModalEvents();
    },

    setupGlobalModalEvents() {
        // Handle modal backdrop clicks
        componentManager.addEventListener(document, 'click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
                const modal = bootstrap.Modal.getInstance(e.target);
                if (modal) modal.hide();
            }
        });

        // Handle escape key
        componentManager.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    const modal = bootstrap.Modal.getInstance(openModal);
                    if (modal) modal.hide();
                }
            }
        });
    },

    create(id, options = {}) {
        const modal = new bootstrap.Modal(document.getElementById(id), options);
        this.modals.set(id, modal);
        return modal;
    },

    show(id, options = {}) {
        let modal = this.modals.get(id);
        if (!modal) {
            modal = this.create(id, options);
        }
        modal.show();
        return modal;
    },

    hide(id) {
        const modal = this.modals.get(id);
        if (modal) modal.hide();
    },

    dispose(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.dispose();
            this.modals.delete(id);
        }
    }
};

// Toast Component
const ToastComponent = {
    container: null,

    init() {
        this.createContainer();
    },

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container position-fixed top-0 end-0 p-3';
        this.container.style.zIndex = '9999';
        document.body.appendChild(this.container);
    },

    show(message, type = 'success', duration = 5000) {
        const toastId = 'toast-' + Date.now();
        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = `toast align-items-center text-white bg-${type} border-0`;
        toastElement.setAttribute('role', 'alert');
        toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas ${this.getIcon(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast"></button>
            </div>
        `;

        this.container.appendChild(toastElement);

        const toast = new bootstrap.Toast(toastElement, {
            delay: duration
        });

        toast.show();

        // Remove element after hiding
        toastElement.addEventListener('hidden.bs.toast', () => {
            this.container.removeChild(toastElement);
        });

        return toast;
    },

    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
};

// Progress Bar Component
const ProgressComponent = {
    bars: new Map(),

    create(element, options = {}) {
        const bar = {
            element: element,
            value: 0,
            min: options.min || 0,
            max: options.max || 100,
            animated: options.animated !== false,
            striped: options.striped || false
        };

        this.bars.set(element.id || element, bar);
        this.update(element, bar.value);
        return bar;
    },

    update(element, value, animated = true) {
        const bar = this.bars.get(element.id || element);
        if (!bar) return;

        bar.value = Math.max(bar.min, Math.min(bar.max, value));
        const percentage = ((bar.value - bar.min) / (bar.max - bar.min)) * 100;

        const progressBar = element.querySelector ?
            element.querySelector('.progress-bar') :
            element;

        if (progressBar) {
            if (animated && bar.animated) {
                progressBar.style.transition = 'width 0.6s ease';
            } else {
                progressBar.style.transition = 'none';
            }

            progressBar.style.width = percentage + '%';
            progressBar.setAttribute('aria-valuenow', bar.value);
        }
    },

    animate(element, targetValue, duration = 1000) {
        const bar = this.bars.get(element.id || element);
        if (!bar) return;

        const startValue = bar.value;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = startValue + (targetValue - startValue) * progress;
            this.update(element, currentValue, false);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
};

// Loading Spinner Component
const LoadingComponent = {
    spinners: new Map(),

    show(target, options = {}) {
        const spinnerId = target.id || 'spinner-' + Date.now();

        if (this.spinners.has(spinnerId)) {
            return this.spinners.get(spinnerId);
        }

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner d-flex justify-content-center align-items-center';
        spinner.innerHTML = `
            <div class="spinner-border text-${options.color || 'primary'}" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            ${options.text ? `<span class="ms-2">${options.text}</span>` : ''}
        `;

        if (options.overlay !== false) {
            spinner.style.position = 'absolute';
            spinner.style.top = '0';
            spinner.style.left = '0';
            spinner.style.right = '0';
            spinner.style.bottom = '0';
            spinner.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            spinner.style.zIndex = '1000';

            target.style.position = 'relative';
        }

        target.appendChild(spinner);
        this.spinners.set(spinnerId, { element: spinner, target: target });

        return spinner;
    },

    hide(target) {
        const spinnerId = target.id || Array.from(this.spinners.keys()).find(key =>
            this.spinners.get(key).target === target
        );

        if (spinnerId && this.spinners.has(spinnerId)) {
            const { element } = this.spinners.get(spinnerId);
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.spinners.delete(spinnerId);
        }
    },

    hideAll() {
        this.spinners.forEach(({ element }) => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        this.spinners.clear();
    }
};

// Register all components
componentManager.register('sidebar', SidebarComponent);
componentManager.register('topbar', TopbarComponent);
componentManager.register('mobileNav', MobileNavComponent);
componentManager.register('modal', ModalComponent);
componentManager.register('toast', ToastComponent);
componentManager.register('progress', ProgressComponent);
componentManager.register('loading', LoadingComponent);

// Global helper functions using components
window.showToast = (message, type, duration) => {
    return componentManager.get('toast').show(message, type, duration);
};

window.showLoading = (target, options) => {
    return componentManager.get('loading').show(target, options);
};

window.hideLoading = (target) => {
    return componentManager.get('loading').hide(target);
};

window.showModal = (id, options) => {
    return componentManager.get('modal').show(id, options);
};

window.hideModal = (id) => {
    return componentManager.get('modal').hide(id);
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    componentManager.initializeAll();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    componentManager.cleanup();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { componentManager, SidebarComponent, TopbarComponent, MobileNavComponent };
}