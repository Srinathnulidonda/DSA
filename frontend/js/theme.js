// Theme Management
const ThemeManager = {
    currentTheme: 'light',
    themes: {
        light: {
            name: 'Light',
            icon: 'bi-sun',
            className: ''
        },
        dark: {
            name: 'Dark',
            icon: 'bi-moon',
            className: 'dark-theme'
        }
    },

    // Initialize theme
    init() {
        this.loadTheme();
        this.setupSystemThemeDetection();
        this.setupThemeToggle();
        return this;
    },

    // Load theme from storage or system preference
    loadTheme() {
        const savedTheme = Storage.get(STORAGE_KEYS.THEME);
        const systemTheme = this.getSystemTheme();

        this.currentTheme = savedTheme || systemTheme;
        this.applyTheme(this.currentTheme);
    },

    // Get system theme preference
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    },

    // Setup system theme change detection
    setupSystemThemeDetection() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a theme
                const savedTheme = Storage.get(STORAGE_KEYS.THEME);
                if (!savedTheme) {
                    const newTheme = e.matches ? 'dark' : 'light';
                    this.setTheme(newTheme);
                }
            });
        }
    },

    // Setup theme toggle functionality
    setupThemeToggle() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-theme-toggle]')) {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Keyboard shortcut (Ctrl/Cmd + Shift + T)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    },

    // Apply theme
    applyTheme(theme) {
        if (!this.themes[theme]) {
            console.warn(`Theme '${theme}' not found, falling back to light`);
            theme = 'light';
        }

        const themeConfig = this.themes[theme];
        const html = document.documentElement;

        // Remove all theme classes
        Object.values(this.themes).forEach(t => {
            if (t.className) {
                html.classList.remove(t.className);
            }
        });

        // Remove data-theme attribute first
        html.removeAttribute('data-theme');

        // Apply new theme
        if (themeConfig.className) {
            html.classList.add(themeConfig.className);
        }

        // Set data-theme attribute
        html.setAttribute('data-theme', theme);

        // Update current theme
        this.currentTheme = theme;

        // Update theme toggle buttons
        this.updateThemeToggles();

        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(theme);

        // Dispatch theme change event
        document.dispatchEvent(new CustomEvent(EVENT_TYPES.THEME_CHANGED, {
            detail: { theme, themeConfig }
        }));

        // Update state
        State.actions.setTheme(theme);
    },

    // Set theme
    setTheme(theme) {
        Storage.set(STORAGE_KEYS.THEME, theme);
        this.applyTheme(theme);
    },

    // Toggle theme
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);

        // Show feedback
        Notifications.show(`Switched to ${this.themes[newTheme].name.toLowerCase()} theme`, 'info');
    },

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    },

    // Check if current theme is dark
    isDarkTheme() {
        return this.currentTheme === 'dark';
    },

    // Update theme toggle buttons
    updateThemeToggles() {
        const toggles = document.querySelectorAll('[data-theme-toggle]');
        const currentConfig = this.themes[this.currentTheme];
        const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        const nextConfig = this.themes[nextTheme];

        toggles.forEach(toggle => {
            // Update icon
            const icon = toggle.querySelector('i');
            if (icon) {
                // Remove all theme icons
                Object.values(this.themes).forEach(theme => {
                    icon.classList.remove(theme.icon);
                });
                // Add current theme icon
                icon.classList.add(nextConfig.icon);
            }

            // Update text
            const text = toggle.querySelector('.theme-text');
            if (text) {
                text.textContent = `Switch to ${nextConfig.name}`;
            }

            // Update aria-label
            toggle.setAttribute('aria-label', `Switch to ${nextConfig.name.toLowerCase()} theme`);

            // Update title
            toggle.title = `Switch to ${nextConfig.name.toLowerCase()} theme`;
        });
    },

    // Update meta theme-color for mobile browsers
    updateMetaThemeColor(theme) {
        let themeColor = '#6366f1'; // Default primary color

        if (theme === 'dark') {
            themeColor = '#0f172a'; // Dark background
        }

        // Update existing meta tag or create new one
        let metaTag = document.querySelector('meta[name="theme-color"]');
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'theme-color';
            document.head.appendChild(metaTag);
        }
        metaTag.content = themeColor;
    },

    // Get theme-aware color
    getThemeColor(colorName, fallback = '#6366f1') {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);

        // Try to get CSS custom property
        const cssVar = computedStyle.getPropertyValue(`--${colorName}`);
        if (cssVar) {
            return cssVar.trim();
        }

        // Fallback to predefined colors
        const colors = {
            light: {
                primary: '#6366f1',
                secondary: '#64748b',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#1e293b'
            },
            dark: {
                primary: '#8b5cf6',
                secondary: '#cbd5e1',
                background: '#0f172a',
                surface: '#1e293b',
                text: '#f8fafc'
            }
        };

        return colors[this.currentTheme]?.[colorName] || fallback;
    },

    // Create theme picker
    createThemePicker() {
        const picker = document.createElement('div');
        picker.className = 'theme-picker dropdown';

        picker.innerHTML = `
            <button class="btn btn-outline-secondary dropdown-toggle" type="button" 
                    data-bs-toggle="dropdown" aria-expanded="false">
                <i class="${this.themes[this.currentTheme].icon}"></i>
                <span class="ms-2">${this.themes[this.currentTheme].name}</span>
            </button>
            <ul class="dropdown-menu">
                ${Object.entries(this.themes).map(([key, theme]) => `
                    <li>
                        <a class="dropdown-item ${key === this.currentTheme ? 'active' : ''}" 
                           href="#" data-theme="${key}">
                            <i class="${theme.icon}"></i>
                            <span class="ms-2">${theme.name}</span>
                        </a>
                    </li>
                `).join('')}
            </ul>
        `;

        // Add event listeners
        picker.addEventListener('click', (e) => {
            if (e.target.closest('[data-theme]')) {
                e.preventDefault();
                const theme = e.target.closest('[data-theme]').dataset.theme;
                this.setTheme(theme);
            }
        });

        return picker;
    },

    // Apply theme to specific element
    applyThemeToElement(element, theme) {
        const themeConfig = this.themes[theme];
        if (!themeConfig) return;

        // Remove all theme classes
        Object.values(this.themes).forEach(t => {
            if (t.className) {
                element.classList.remove(t.className);
            }
        });

        // Apply new theme class
        if (themeConfig.className) {
            element.classList.add(themeConfig.className);
        }

        element.setAttribute('data-theme', theme);
    },

    // Watch for theme changes
    onThemeChange(callback) {
        document.addEventListener(EVENT_TYPES.THEME_CHANGED, (e) => {
            callback(e.detail.theme, e.detail.themeConfig);
        });
    },

    // Preload theme styles
    preloadThemeStyles() {
        // In a real app, you might preload CSS files for different themes
        Object.keys(this.themes).forEach(theme => {
            if (theme !== this.currentTheme) {
                // Preload theme-specific resources
                this.preloadThemeResources(theme);
            }
        });
    },

    preloadThemeResources(theme) {
        // Preload images or other resources specific to the theme
        const themeImages = {
            dark: ['/assets/images/dark-hero.jpg'],
            light: ['/assets/images/light-hero.jpg']
        };

        const images = themeImages[theme] || [];
        images.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    },

    // Accessibility considerations
    setupReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleReducedMotion = (e) => {
            document.documentElement.classList.toggle('reduced-motion', e.matches);
        };

        mediaQuery.addEventListener('change', handleReducedMotion);
        handleReducedMotion(mediaQuery);
    },

    // High contrast support
    setupHighContrast() {
        const mediaQuery = window.matchMedia('(prefers-contrast: high)');

        const handleHighContrast = (e) => {
            document.documentElement.classList.toggle('high-contrast', e.matches);
        };

        mediaQuery.addEventListener('change', handleHighContrast);
        handleHighContrast(mediaQuery);
    },

    // Initialize accessibility features
    initAccessibility() {
        this.setupReducedMotion();
        this.setupHighContrast();
    }
};

// Initialize theme manager
ThemeManager.initAccessibility();

// Listen for theme changes to update UI
ThemeManager.onThemeChange((theme) => {
    // Update Chart.js theme if charts exist
    if (window.Chart) {
        Chart.defaults.color = ThemeManager.getThemeColor('text');
        Chart.defaults.borderColor = ThemeManager.getThemeColor('border-color');
        Chart.defaults.backgroundColor = ThemeManager.getThemeColor('background');

        // Update existing charts
        Object.values(Chart.instances).forEach(chart => {
            chart.update('none');
        });
    }

    // Update any theme-dependent components
    document.querySelectorAll('[data-theme-dependent]').forEach(element => {
        element.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    });
});

// Make available globally
window.ThemeManager = ThemeManager;