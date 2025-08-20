// Theme Management System
class ThemeManager {
    constructor() {
        this.themes = {
            light: {
                name: 'Light',
                icon: 'bi-sun',
                colors: {
                    primary: '#3b82f6',
                    background: '#ffffff',
                    surface: '#f3f4f6',
                    text: '#111827'
                }
            },
            dark: {
                name: 'Dark',
                icon: 'bi-moon',
                colors: {
                    primary: '#3b82f6',
                    background: '#111827',
                    surface: '#1f2937',
                    text: '#f9fafb'
                }
            }
        };

        this.currentTheme = this.loadTheme();
        this.init();
    }

    init() {
        // Apply saved theme
        this.applyTheme(this.currentTheme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.currentTheme === 'system') {
                    this.applySystemTheme();
                }
            });
        }

        // Setup theme toggle buttons
        this.setupToggleButtons();
    }

    loadTheme() {
        const saved = preferences.getTheme();
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
            return saved;
        }

        // Default to system preference
        return 'system';
    }

    applyTheme(theme) {
        if (theme === 'system') {
            this.applySystemTheme();
            return;
        }

        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        preferences.setTheme(theme);

        // Update meta theme color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = this.themes[theme].colors.primary;
        }

        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    applySystemTheme() {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.updateToggleButtons();
    }

    setTheme(theme) {
        if (theme === this.currentTheme) return;
        this.applyTheme(theme);
        this.updateToggleButtons();
    }

    setupToggleButtons() {
        // Find all theme toggle buttons
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                this.toggle();
            });
        });

        // Find theme selector dropdowns
        document.querySelectorAll('[data-theme-select]').forEach(select => {
            select.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        });

        this.updateToggleButtons();
    }

    updateToggleButtons() {
        // Update toggle button icons
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = `bi ${this.themes[this.currentTheme === 'light' ? 'dark' : 'light'].icon}`;
            }
        });

        // Update select dropdowns
        document.querySelectorAll('[data-theme-select]').forEach(select => {
            select.value = this.currentTheme;
        });
    }

    // Get current theme
    getTheme() {
        return this.currentTheme;
    }

    // Get theme colors
    getColors() {
        const theme = this.currentTheme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : this.currentTheme;

        return this.themes[theme].colors;
    }

    // Check if dark mode is active
    isDark() {
        if (this.currentTheme === 'dark') return true;
        if (this.currentTheme === 'light') return false;

        // System theme
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for global use
window.themeManager = themeManager;

// Add theme toggle to all pages
document.addEventListener('DOMContentLoaded', () => {
    // Add theme toggle button to topbar if not exists
    const topbarNav = document.querySelector('.topbar-nav');
    if (topbarNav && !topbarNav.querySelector('[data-theme-toggle]')) {
        const themeButton = document.createElement('button');
        themeButton.className = 'btn btn-sm btn-link text-decoration-none';
        themeButton.setAttribute('data-theme-toggle', '');
        themeButton.innerHTML = `<i class="bi ${themeManager.isDark() ? 'bi-sun' : 'bi-moon'}"></i>`;
        themeButton.title = 'Toggle theme';
        topbarNav.appendChild(themeButton);

        themeButton.addEventListener('click', () => {
            themeManager.toggle();
        });
    }
});

// Smooth theme transitions
const style = document.createElement('style');
style.textContent = `
    * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    }
`;
document.head.appendChild(style);