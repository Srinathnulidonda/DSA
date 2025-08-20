// Dynamic Page Loader for DSA Path Application

const Loader = {
    // Cache for loaded pages
    pageCache: new Map(),

    // Currently loaded page
    currentPage: null,

    // Loading state
    isLoading: false,

    /**
     * Load page content
     */
    async loadPage(pagePath, useCache = true) {
        try {
            // Show loading
            this.showLoading();
            this.isLoading = true;

            // Check cache first
            if (useCache && this.pageCache.has(pagePath)) {
                const cachedContent = this.pageCache.get(pagePath);
                await this.renderPage(cachedContent);
                return;
            }

            // Load page content
            const response = await fetch(pagePath);

            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.status}`);
            }

            const content = await response.text();

            // Cache the content
            if (useCache) {
                this.pageCache.set(pagePath, content);
            }

            // Render the page
            await this.renderPage(content);

        } catch (error) {
            console.error('Page loading error:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    },

    /**
     * Render page content
     */
    async renderPage(content) {
        const container = Utils.dom.$('#page-container');
        if (!container) return;

        // Mark performance start
        Lib.performance.mark('page-render-start');

        // Extract and execute scripts
        const { html, scripts } = this.extractScripts(content);

        // Update content with fade effect
        container.style.opacity = '0';

        setTimeout(() => {
            container.innerHTML = html;
            container.style.opacity = '1';

            // Execute inline scripts
            this.executeScripts(scripts);

            // Initialize page-specific functionality
            this.initializePage();

            // Mark performance end
            Lib.performance.mark('page-render-end');
            const duration = Lib.performance.measure('page-render', 'page-render-start', 'page-render-end');
            console.log(`Page rendered in ${duration.toFixed(2)}ms`);
        }, 150);
    },

    /**
     * Extract scripts from HTML content
     */
    extractScripts(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const scripts = [];
        const scriptElements = tempDiv.querySelectorAll('script');

        scriptElements.forEach(script => {
            scripts.push(script.textContent);
            script.remove();
        });

        return {
            html: tempDiv.innerHTML,
            scripts
        };
    },

    /**
     * Execute extracted scripts
     */
    executeScripts(scripts) {
        scripts.forEach(scriptContent => {
            try {
                // Create a new script element
                const script = document.createElement('script');
                script.textContent = scriptContent;
                document.head.appendChild(script);
                document.head.removeChild(script);
            } catch (error) {
                console.error('Script execution error:', error);
            }
        });
    },

    /**
     * Initialize page-specific functionality
     */
    initializePage() {
        // Re-initialize Bootstrap components
        this.initBootstrapComponents();

        // Setup forms
        this.setupForms();

        // Setup tooltips and popovers
        this.setupTooltips();

        // Setup custom components
        this.setupCustomComponents();

        // Load page data
        this.loadPageData();

        // Update navigation
        this.updateNavigation();
    },

    /**
     * Initialize Bootstrap components
     */
    initBootstrapComponents() {
        // Initialize tooltips
        const tooltips = Utils.dom.$$('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));

        // Initialize popovers
        const popovers = Utils.dom.$$('[data-bs-toggle="popover"]');
        popovers.forEach(popover => new bootstrap.Popover(popover));

        // Initialize dropdowns
        const dropdowns = Utils.dom.$$('[data-bs-toggle="dropdown"]');
        dropdowns.forEach(dropdown => new bootstrap.Dropdown(dropdown));
    },

    /**
     * Setup forms with validation
     */
    setupForms() {
        const forms = Utils.dom.$$('form[data-validate]');
        forms.forEach(form => {
            // Add validation classes
            form.classList.add('needs-validation');
            form.noValidate = true;

            form.addEventListener('submit', (e) => {
                if (!form.checkValidity()) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    },

    /**
     * Setup tooltips and popovers
     */
    setupTooltips() {
        // Auto-setup tooltips for elements with title attribute
        const elementsWithTitle = Utils.dom.$$('[title]:not([data-bs-toggle])');
        elementsWithTitle.forEach(element => {
            element.setAttribute('data-bs-toggle', 'tooltip');
            new bootstrap.Tooltip(element);
        });
    },

    /**
     * Setup custom components
     */
    setupCustomComponents() {
        // Setup ripple effect for buttons
        const rippleButtons = Utils.dom.$$('.btn-ripple');
        rippleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                Lib.utils.createRipple(button, e);
            });
        });

        // Setup copy buttons
        const copyButtons = Utils.dom.$$('[data-copy]');
        copyButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const target = button.getAttribute('data-copy');
                const element = Utils.dom.$(target);
                if (element) {
                    const success = await Utils.browser.copyToClipboard(element.textContent);
                    if (success) {
                        Notifications.success('Copied to clipboard');
                    }
                }
            });
        });

        // Setup auto-resize textareas
        const autoResizeTextareas = Utils.dom.$$('textarea[data-auto-resize]');
        autoResizeTextareas.forEach(textarea => {
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
        });
    },

    /**
     * Load page-specific data
     */
    async loadPageData() {
        const container = Utils.dom.$('#page-container');
        if (!container) return;

        // Check for data loading attributes
        const dataLoaders = Utils.dom.$$('[data-load]', container);

        for (const element of dataLoaders) {
            const loadType = element.getAttribute('data-load');
            await this.loadElementData(element, loadType);
        }
    },

    /**
     * Load data for specific element
     */
    async loadElementData(element, loadType) {
        try {
            Components.loading.overlay(element, true);

            let data;
            switch (loadType) {
                case 'dashboard':
                    data = await ApiMethods.dashboard.get();
                    this.renderDashboardData(element, data);
                    break;

                case 'progress':
                    data = await ApiMethods.progress.get();
                    this.renderProgressData(element, data);
                    break;

                case 'notes':
                    data = await ApiMethods.notes.getAll();
                    this.renderNotesData(element, data);
                    break;

                case 'resources':
                    data = await ApiMethods.resources.get();
                    this.renderResourcesData(element, data);
                    break;

                default:
                    console.warn(`Unknown data load type: ${loadType}`);
            }
        } catch (error) {
            console.error(`Failed to load ${loadType} data:`, error);
            element.innerHTML = `<div class="alert alert-danger">Failed to load data</div>`;
        } finally {
            Components.loading.overlay(element, false);
        }
    },

    /**
     * Render dashboard data
     */
    renderDashboardData(element, data) {
        const { stats, weekly_progress, recent_sessions, recent_notes } = data;

        // Update stats cards
        const statsCards = element.querySelectorAll('[data-stat]');
        statsCards.forEach(card => {
            const statType = card.getAttribute('data-stat');
            const value = stats[statType];
            const valueElement = card.querySelector('.stat-value');
            if (valueElement && value !== undefined) {
                valueElement.textContent = this.formatStatValue(statType, value);
            }
        });

        // Update weekly progress chart
        const progressChart = element.querySelector('#weekly-progress-chart');
        if (progressChart && weekly_progress) {
            const weeklyData = Object.entries(weekly_progress).map(([week, data]) => ({
                week: parseInt(week),
                percentage: data.percentage
            }));

            Lib.charts.createWeeklyProgressChart(progressChart, weeklyData);
        }

        // Update recent activities
        this.updateRecentActivities(element, { recent_sessions, recent_notes });
    },

    /**
     * Format stat values for display
     */
    formatStatValue(statType, value) {
        switch (statType) {
            case 'total_study_time':
            case 'study_time_last_7_days':
                return Utils.time.formatDuration(value * 60); // Convert minutes to seconds

            case 'completion_percentage':
                return `${Math.round(value)}%`;

            default:
                return value.toString();
        }
    },

    /**
     * Update recent activities section
     */
    updateRecentActivities(element, { recent_sessions, recent_notes }) {
        const sessionsContainer = element.querySelector('#recent-sessions');
        const notesContainer = element.querySelector('#recent-notes');

        if (sessionsContainer && recent_sessions) {
            if (recent_sessions.length === 0) {
                sessionsContainer.innerHTML = '<p class="text-muted">No recent study sessions</p>';
            } else {
                sessionsContainer.innerHTML = recent_sessions.map(session => `
          <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
              <strong>${session.topic || 'Study Session'}</strong>
              <small class="text-muted d-block">${Utils.date.relative(session.start_time)}</small>
            </div>
            <span class="badge bg-${session.completed ? 'success' : 'warning'}">
              ${session.duration} min
            </span>
          </div>
        `).join('');
            }
        }

        if (notesContainer && recent_notes) {
            if (recent_notes.length === 0) {
                notesContainer.innerHTML = '<p class="text-muted">No recent notes</p>';
            } else {
                notesContainer.innerHTML = recent_notes.map(note => `
          <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
              <strong>${note.title}</strong>
              <small class="text-muted d-block">${Utils.date.relative(note.updated_at)}</small>
            </div>
            <a href="/pages/notes?id=${note.id}" class="btn btn-sm btn-outline-primary">View</a>
          </div>
        `).join('');
            }
        }
    },

    /**
     * Update navigation active state
     */
    updateNavigation() {
        const currentPath = window.location.pathname;

        // Update sidebar navigation
        const sidebarLinks = Utils.dom.$$('#sidebar .nav-link');
        sidebarLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update mobile navigation
        const mobileLinks = Utils.dom.$$('#mobile-nav .mobile-nav-item');
        mobileLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update page title
        this.updatePageTitle();
    },

    /**
     * Update page title
     */
    updatePageTitle() {
        const currentPath = window.location.pathname;
        const pageTitles = {
            '/': 'DSA Path - Home',
            '/pages/dashboard': 'Dashboard - DSA Path',
            '/pages/roadmap': 'Roadmap - DSA Path',
            '/pages/calendar': 'Calendar - DSA Path',
            '/pages/progress': 'Progress - DSA Path',
            '/pages/notes': 'Notes - DSA Path',
            '/pages/pomodoro': 'Pomodoro Timer - DSA Path',
            '/pages/resources': 'Resources - DSA Path',
            '/pages/ai-assistant': 'AI Assistant - DSA Path',
            '/pages/analytics': 'Analytics - DSA Path',
            '/pages/search': 'Search - DSA Path',
            '/pages/profile': 'Profile - DSA Path',
            '/pages/settings': 'Settings - DSA Path'
        };

        const title = pageTitles[currentPath] || 'DSA Path';
        document.title = title;
    },

    /**
     * Show loading state
     */
    showLoading() {
        const container = Utils.dom.$('#page-container');
        if (container) {
            container.style.opacity = '0.6';
            container.style.pointerEvents = 'none';
        }
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        const container = Utils.dom.$('#page-container');
        if (container) {
            container.style.opacity = '1';
            container.style.pointerEvents = 'auto';
        }
    },

    /**
     * Show error state
     */
    showError(message) {
        const container = Utils.dom.$('#page-container');
        if (container) {
            container.innerHTML = `
        <div class="container-narrow">
          <div class="text-center py-5">
            <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
            <h3>Error Loading Page</h3>
            <p class="text-muted">${message}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
              <i class="fas fa-refresh me-2"></i>Reload Page
            </button>
          </div>
        </div>
      `;
        }
    },

    /**
     * Clear page cache
     */
    clearCache() {
        this.pageCache.clear();
    },

    /**
     * Preload pages for better performance
     */
    async preloadPages(paths) {
        const promises = paths.map(path => {
            return fetch(path).then(response => {
                if (response.ok) {
                    return response.text().then(content => {
                        this.pageCache.set(path, content);
                    });
                }
            }).catch(error => {
                console.warn(`Failed to preload ${path}:`, error);
            });
        });

        await Promise.allSettled(promises);
    }
};

// Export Loader for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Loader;
}