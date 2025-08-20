// Dynamic Content Loader and API Handler

class API {
    constructor() {
        this.baseURL = 'https://dsa-backend-gj8n.onrender.com';
        this.token = auth.getToken();
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Add auth token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);

            // Handle token refresh
            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry request with new token
                    config.headers['Authorization'] = `Bearer ${this.token}`;
                    const retryResponse = await fetch(url, config);
                    return this.handleResponse(retryResponse);
                } else {
                    // Redirect to login
                    window.location.href = '/auth/login';
                    return;
                }
            }

            return this.handleResponse(response);
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async handleResponse(response) {
        const contentType = response.headers.get('content-type');

        if (!response.ok) {
            const error = contentType && contentType.includes('application/json')
                ? await response.json()
                : { error: response.statusText };

            throw new Error(error.error || error.message || 'Request failed');
        }

        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }

        return response.text();
    }

    async refreshToken() {
        try {
            const refreshToken = auth.getRefreshToken();
            if (!refreshToken) return false;

            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                auth.setToken(data.access_token);
                this.token = data.access_token;
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    // GET request
    get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    // POST request
    post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // File upload
    async upload(endpoint, file, fieldName = 'file') {
        const formData = new FormData();
        formData.append(fieldName, file);

        return this.request(endpoint, {
            method: 'POST',
            headers: {
                // Don't set Content-Type for FormData
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });
    }
}

// Create global API instance
const api = new API();

// Page Loader
class PageLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.loadedStyles = new Set();
    }

    async loadLayout() {
        // Load topbar
        const topbar = await this.loadComponent('/layout/topbar.html');
        const topbarElement = document.getElementById('topbar');
        if (topbarElement) {
            topbarElement.innerHTML = topbar;
        }

        // Load sidebar (desktop only)
        if (window.innerWidth >= 768) {
            const sidebar = await this.loadComponent('/layout/sidebar.html');
            const sidebarElement = document.getElementById('sidebar');
            if (sidebarElement) {
                sidebarElement.innerHTML = sidebar;
                this.initSidebar();
            }
        }

        // Load mobile nav
        if (window.innerWidth < 768) {
            const mobileNav = await this.loadComponent('/layout/mobile-nav.html');
            const mobileNavElement = document.getElementById('mobile-nav');
            if (mobileNavElement) {
                mobileNavElement.innerHTML = mobileNav;
                this.initMobileNav();
            }
        }

        // Update user info
        this.updateUserInfo();
    }

    async loadComponent(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ${path}`);
            return response.text();
        } catch (error) {
            console.error('Failed to load component:', error);
            return '';
        }
    }

    async loadCard(type, data) {
        const template = await this.loadComponent(`/cards/${type}-card.html`);
        return this.replaceVariables(template, data);
    }

    async loadWidget(type, data) {
        const template = await this.loadComponent(`/widgets/${type}-widget.html`);
        return this.replaceVariables(template, data);
    }

    replaceVariables(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    initSidebar() {
        const currentPath = window.location.pathname.replace('.html', '');
        const sidebarLinks = document.querySelectorAll('.sidebar-item');

        sidebarLinks.forEach(link => {
            const href = link.getAttribute('href').replace('.html', '');
            if (href === currentPath) {
                link.classList.add('active');
            }

            // Smooth page transitions
            link.addEventListener('click', (e) => {
                if (href.startsWith('/') && !href.includes('http')) {
                    e.preventDefault();
                    this.navigateTo(href);
                }
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('collapsed');
            });
        }
    }

    initMobileNav() {
        const currentPath = window.location.pathname.replace('.html', '');
        const navItems = document.querySelectorAll('.mobile-nav-item');

        navItems.forEach(item => {
            const href = item.getAttribute('href').replace('.html', '');
            if (href === currentPath) {
                item.classList.add('active');
            }
        });
    }

    updateUserInfo() {
        const user = auth.getUser();
        if (!user) return;

        // Update topbar user info
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (userAvatar && user.avatar_url) {
            userAvatar.src = user.avatar_url;
        }

        if (userName) {
            userName.textContent = user.name;
        }
    }

    showLoading(container = document.body) {
        const loadingHtml = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p class="mt-3">Loading...</p>
                </div>
            </div>
        `;

        const loadingElement = document.createElement('div');
        loadingElement.innerHTML = loadingHtml;
        container.appendChild(loadingElement.firstElementChild);
    }

    hideLoading(container = document.body) {
        const overlay = container.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    async navigateTo(path) {
        // Add loading state
        this.showLoading();

        // Animate out current content
        const mainContent = document.querySelector('.app-main');
        if (mainContent) {
            mainContent.style.opacity = '0';
        }

        // Navigate after animation
        setTimeout(() => {
            window.location.href = path;
        }, 200);
    }

    async loadScript(src) {
        if (this.loadedScripts.has(src)) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                this.loadedScripts.add(src);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadStyle(href) {
        if (this.loadedStyles.has(href)) return;

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                this.loadedStyles.add(href);
                resolve();
            };
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    // Initialize page protection
    protectPage() {
        if (!auth.isAuthenticated()) {
            window.location.href = '/auth/login';
            return false;
        }
        return true;
    }
}

// Initialize loader
const loader = new PageLoader();

// Global exports
window.api = api;
window.loader = loader;

// Auto-initialize on protected pages
document.addEventListener('DOMContentLoaded', () => {
    // Check if page requires authentication
    if (document.body.dataset.requiresAuth === 'true') {
        if (loader.protectPage()) {
            loader.loadLayout();
        }
    }
});

// Handle API errors globally
window.addEventListener('unhandledrejection', event => {
    if (event.reason && event.reason.message) {
        if (event.reason.message.includes('401')) {
            // Handle unauthorized
            auth.clear();
            window.location.href = '/auth/login';
        } else {
            // Show error notification
            if (window.notifications) {
                notifications.error(event.reason.message);
            }
        }
    }
});