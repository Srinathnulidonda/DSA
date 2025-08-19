// Theme Manager

class ThemeManager {
    constructor() {
        this.currentTheme = storage.getTheme() || THEMES.LIGHT;
        this.init();
    }

    init() {
        // Apply saved theme
        this.applyTheme(this.currentTheme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.currentTheme === THEMES.AUTO) {
                    this.applySystemTheme();
                }
            });
        }
    }

    // Apply theme
    applyTheme(theme) {
        if (theme === THEMES.AUTO) {
            this.applySystemTheme();
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        this.currentTheme = theme;
        storage.setTheme(theme);

        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    // Apply system theme
    applySystemTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? THEMES.DARK : THEMES.LIGHT);
    }

    // Toggle theme
    toggleTheme() {
        const newTheme = this.currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
        this.setTheme(newTheme);
    }

    // Set theme
    setTheme(theme) {
        if (Object.values(THEMES).includes(theme)) {
            this.applyTheme(theme);

            // Update preferences on server
            if (auth.isAuthenticated()) {
                api.updatePreferences({ theme }).catch(console.error);
            }
        }
    }

    // Get current theme
    getTheme() {
        return this.currentTheme;
    }

    // Get actual applied theme
    getAppliedTheme() {
        return document.documentElement.getAttribute('data-theme');
    }
}

// Create global instance
window.theme = new ThemeManager();