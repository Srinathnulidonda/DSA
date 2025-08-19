// Application Constants
const APP_CONFIG = {
    API_BASE_URL: 'https://dsa-backend-gj8n.onrender.com',
    APP_NAME: 'DSAPath',
    VERSION: '1.0.0',
    SUPPORT_EMAIL: 'support@dsapath.com',

    // Storage Keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'access_token',
        REFRESH_TOKEN: 'refresh_token',
        USER_DATA: 'user_data',
        THEME: 'theme',
        PREFERENCES: 'preferences',
        POMODORO_STATE: 'pomodoro_state'
    },

    // Routes
    ROUTES: {
        HOME: '/',
        LOGIN: '/auth/login.html',
        REGISTER: '/auth/register.html',
        DASHBOARD: '/pages/dashboard.html',
        ROADMAP: '/pages/roadmap.html',
        CALENDAR: '/pages/calendar.html',
        PROGRESS: '/pages/progress.html',
        NOTES: '/pages/notes.html',
        POMODORO: '/pages/pomodoro.html',
        PROFILE: '/pages/profile.html',
        SETTINGS: '/pages/settings.html',
        ANALYTICS: '/pages/analytics.html',
        RESOURCES: '/pages/resources.html',
        AI_ASSISTANT: '/pages/ai-assistant.html',
        SEARCH: '/pages/search.html'
    },

    // Pomodoro Settings
    POMODORO: {
        WORK_DURATION: 25 * 60, // 25 minutes in seconds
        SHORT_BREAK: 5 * 60,
        LONG_BREAK: 15 * 60,
        SESSIONS_BEFORE_LONG_BREAK: 4
    },

    // Pagination
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 20,
        MAX_PAGE_SIZE: 100
    },

    // File Upload
    UPLOAD: {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'text/markdown']
    },

    // Validation
    VALIDATION: {
        MIN_PASSWORD_LENGTH: 8,
        MAX_PASSWORD_LENGTH: 128,
        MIN_NAME_LENGTH: 2,
        MAX_NAME_LENGTH: 100,
        MAX_NOTE_TITLE_LENGTH: 200,
        MAX_NOTE_CONTENT_LENGTH: 10000
    }
};

// Resource Types
const RESOURCE_TYPES = {
    TEXT: 'text',
    VIDEO: 'video',
    INTERACTIVE: 'interactive',
    PRACTICE: 'practice'
};

// Progress Status
const PROGRESS_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
};

// Notification Types
const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

// Theme Options
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
};

// Chart Colors
const CHART_COLORS = {
    PRIMARY: 'rgb(102, 126, 234)',
    SECONDARY: 'rgb(118, 75, 162)',
    SUCCESS: 'rgb(72, 187, 120)',
    DANGER: 'rgb(245, 101, 101)',
    WARNING: 'rgb(237, 137, 54)',
    INFO: 'rgb(66, 153, 225)',
    GRAY: 'rgb(160, 174, 192)'
};

// Export constants
window.APP_CONFIG = APP_CONFIG;
window.RESOURCE_TYPES = RESOURCE_TYPES;
window.PROGRESS_STATUS = PROGRESS_STATUS;
window.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
window.THEMES = THEMES;
window.CHART_COLORS = CHART_COLORS;