// Theme Management for DSA Path Application

const Theme = {
    // Current theme
    current: 'system',

    // Available themes
    themes: {
        light: {
            name: 'Light',
            icon: 'fas fa-sun',
            class: 'light'
        },
        dark: {
            name: 'Dark',
            icon: 'fas fa-moon',
            class: 'dark'
        },
        system: {
            name: 'System',
            icon: 'fas fa-desktop',
            class: 'system'
        }
    },

    /**
     * Initialize theme system
     */
    init() {
        // Load saved theme
        this.current = Storage.theme.getTheme();

        // Apply initial theme
        this.apply(this.current);

        // Listen for system theme changes
        this.setupSystemThemeDetection();

        // Setup theme toggle button
        this.setupThemeToggle();

        // Update UI
        this.updateUI();
    },

    /**
     * Apply theme
     */
    apply(themeName) {
        const body = document.body;
        const html = document.documentElement;

        // Remove existing theme classes
        Object.values(this.themes).forEach(theme => {
            body.classList.remove(`theme-${theme.class}`);
            html.removeAttribute('data-theme');
        });

        if (themeName === 'system') {
            // Use system preference
            const systemTheme = this.getSystemTheme();
            html.setAttribute('data-theme', systemTheme);
            body.classList.add(`theme-${systemTheme}`);
        } else {
            // Use selected theme
            html.setAttribute('data-theme', themeName);
            body.classList.add(`theme-${themeName}`);
        }

        this.current = themeName;

        // Save to storage
        Storage.theme.setTheme(themeName);

        // Update state
        State.setState('ui.theme', themeName);

        // Notify other components
        this.notifyThemeChange(themeName);
    },

    /**
     * Get system theme preference
     */
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    /**
     * Setup system theme detection
     */
    setupSystemThemeDetection() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (this.current === 'system') {
                this.apply('system');
            }
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
        }
    },

    /**
     * Setup theme toggle button
     */
    setupThemeToggle() {
        const toggleBtn = Utils.dom.$('#theme-toggle');
        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', () => {
            this.toggle();
        });

        // Update button icon
        this.updateToggleButton();
    },

    /**
     * Toggle between themes
     */
    toggle() {
        const themes = Object.keys(this.themes);
        const currentIndex = themes.indexOf(this.current);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];

        this.apply(nextTheme);
        this.updateToggleButton();

        // Show notification
        const themeName = this.themes[nextTheme].name;
        Notifications.show(`Switched to ${themeName} theme`, 'info');
    },

    /**
     * Update theme toggle button
     */
    updateToggleButton() {
        const toggleBtn = Utils.dom.$('#theme-toggle');
        if (!toggleBtn) return;

        const icon = toggleBtn.querySelector('i');
        if (!icon) return;

        // Clear existing classes
        icon.className = '';

        // Get effective theme for display
        let displayTheme = this.current;
        if (this.current === 'system') {
            displayTheme = this.getSystemTheme();
        }

        // Set appropriate icon
        if (displayTheme === 'dark') {
            icon.className = 'fas fa-sun';
            toggleBtn.title = 'Switch to light theme';
        } else {
            icon.className = 'fas fa-moon';
            toggleBtn.title = 'Switch to dark theme';
        }
    },

    /**
     * Update UI elements based on theme
     */
    updateUI() {
        // Update charts if they exist
        if (window.Chart) {
            this.updateChartDefaults();
        }

        // Update theme selector if it exists
        this.updateThemeSelector();

        // Update meta theme color
        this.updateMetaThemeColor();
    },

    /**
     * Update Chart.js defaults for current theme
     */
    updateChartDefaults() {
        const isDark = this.getEffectiveTheme() === 'dark';

        if (window.Chart) {
            Chart.defaults.color = isDark ? '#e5e7eb' : '#374151';
            Chart.defaults.borderColor = isDark ? '#374151' : '#e5e7eb';
            Chart.defaults.backgroundColor = isDark ? '#1f2937' : '#f9fafb';

            // Update existing charts
            Object.values(Chart.instances).forEach(chart => {
                chart.update();
            });
        }
    },

    /**
     * Update theme selector component
     */
    updateThemeSelector() {
        const selector = Utils.dom.$('#theme-selector');
        if (!selector) return;

        Object.entries(this.themes).forEach(([key, theme]) => {
            const option = selector.querySelector(`[data-theme="${key}"]`);
            if (option) {
                if (key === this.current) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            }
        });
    },

    /**
     * Update meta theme color for mobile browsers
     */
    updateMetaThemeColor() {
        const metaThemeColor = Utils.dom.$('meta[name="theme-color"]');
        if (!metaThemeColor) return;

        const isDark = this.getEffectiveTheme() === 'dark';
        const color = isDark ? '#1f2937' : '#3b82f6';

        metaThemeColor.setAttribute('content', color);
    },

    /**
     * Get effective theme (resolves system to actual theme)
     */
    getEffectiveTheme() {
        if (this.current === 'system') {
            return this.getSystemTheme();
        }
        return this.current;
    },

    /**
     * Create theme selector component
     */
    createThemeSelector(container) {
        const selector = Utils.dom.createElement('div', {
            className: 'theme-selector',
            id: 'theme-selector'
        });

        Object.entries(this.themes).forEach(([key, theme]) => {
            const option = Utils.dom.createElement('button', {
                className: `theme-option btn btn-outline-secondary ${key === this.current ? 'active' : ''}`,
                'data-theme': key,
                title: `Switch to ${theme.name} theme`
            });

            const icon = Utils.dom.createElement('i', {
                className: theme.icon
            });

            const label = Utils.dom.createElement('span', {}, theme.name);

            option.appendChild(icon);
            option.appendChild(label);

            option.addEventListener('click', () => {
                this.apply(key);
                this.updateThemeSelector();
            });

            selector.appendChild(option);
        });

        container.appendChild(selector);
        return selector;
    },

    /**
     * Notify other components of theme change
     */
    notifyThemeChange(themeName) {
        const event = new CustomEvent('themechange', {
            detail: {
                theme: themeName,
                effectiveTheme: this.getEffectiveTheme()
            }
        });

        document.dispatchEvent(event);
    },

    /**
     * Add theme-aware styles
     */
    addThemeStyles() {
        const styles = `
      .theme-light {
        --bg-primary: #ffffff;
        --bg-secondary: #f8f9fa;
        --text-primary: #212529;
        --text-secondary: #6c757d;
        --border-color: #dee2e6;
      }
      
      .theme-dark {
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d3748;
        --text-primary: #ffffff;
        --text-secondary: #a0aec0;
        --border-color: #4a5568;
      }
      
      .theme-selector {
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 0.5rem;
        background: var(--bg-secondary);
      }
      
      .theme-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.375rem;
        background: transparent;
        color: var(--text-secondary);
        transition: all 0.2s;
      }
      
      .theme-option:hover {
        background: var(--bg-primary);
        color: var(--text-primary);
      }
      
      .theme-option.active {
        background: var(--primary-color);
        color: white;
      }
    `;

        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    },

    /**
     * Save user theme preference to backend
     */
    async savePreference(themeName) {
        try {
            await ApiMethods.preferences.update({ theme: themeName });
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    }
};

// Export Theme for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Theme;
}