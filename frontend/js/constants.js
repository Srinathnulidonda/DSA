// API Configuration
const API_BASE = 'https://dsa-backend-gj8n.onrender.com';
const API_ENDPOINTS = {
    // Authentication
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    AUTH_REFRESH: '/auth/refresh',
    AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
    AUTH_RESET_PASSWORD: '/auth/reset-password',

    // User
    PROFILE: '/profile',
    PREFERENCES: '/preferences',
    NOTIFICATIONS: '/notifications',
    SESSIONS: '/sessions',

    // Progress
    PROGRESS: '/progress',
    CALENDAR: '/calendar',

    // Study Tools
    POMODORO: '/pomodoro',
    NOTES: '/notes',

    // Data
    DASHBOARD: '/dashboard',
    ROADMAP: '/roadmap',
    RESOURCES: '/resources',
    SEARCH: '/search',

    // AI
    AI_ASK: '/ai/ask',
    AI_STUDY_PLAN: '/ai/study-plan',
    AI_QUIZ: '/ai/quiz',
    AI_SUMMARIZE: '/ai/summarize'
};

// Local Storage Keys
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'dsa_access_token',
    REFRESH_TOKEN: 'dsa_refresh_token',
    USER_DATA: 'dsa_user_data',
    THEME: 'dsa_theme',
    PREFERENCES: 'dsa_preferences',
    TIMER_STATE: 'dsa_timer_state',
    DRAFT_NOTES: 'dsa_draft_notes',
    SEARCH_HISTORY: 'dsa_search_history'
};

// App Configuration
const APP_CONFIG = {
    NAME: 'DSA Path',
    VERSION: '1.0.0',
    DESCRIPTION: 'Master Data Structures & Algorithms',

    // Timing
    TOKEN_REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
    AUTO_SAVE_INTERVAL: 30 * 1000, // 30 seconds
    NOTIFICATION_DURATION: 5000, // 5 seconds
    SEARCH_DEBOUNCE: 300, // 300ms

    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // File Upload
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],

    // Pomodoro Settings
    POMODORO_DURATIONS: {
        WORK: 25,
        SHORT_BREAK: 5,
        LONG_BREAK: 15
    },

    // Chart Colors
    CHART_COLORS: {
        PRIMARY: '#3b82f6',
        SUCCESS: '#10b981',
        WARNING: '#f59e0b',
        DANGER: '#ef4444',
        INFO: '#06b6d4',
        GRAY: '#6b7280'
    }
};

// Roadmap Data
const ROADMAP_CONFIG = {
    TOTAL_WEEKS: 14,
    DAYS_PER_WEEK: 7,
    TOPICS: [
        'Foundation & Environment',
        'Arrays & String Mastery',
        'Linked Lists Deep Dive',
        'Stacks & Queues Applications',
        'Binary Trees Foundation',
        'Binary Search Trees',
        'Heaps & Priority Queues',
        'Hashing & Hash Tables',
        'Graph Fundamentals',
        'Advanced Graph Algorithms',
        'Sorting & Searching Mastery',
        'Recursion & Backtracking',
        'Dynamic Programming',
        'Advanced Topics & System Design'
    ]
};

// Notification Types
const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Theme Configuration
const THEME_CONFIG = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
};

// Validation Rules
const VALIDATION_RULES = {
    PASSWORD: {
        MIN_LENGTH: 8,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBER: true,
        REQUIRE_SPECIAL: false
    },

    EMAIL: {
        PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    NOTE_TITLE: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 200
    },

    NOTE_CONTENT: {
        MAX_LENGTH: 50000
    }
};

// Error Messages
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Session expired. Please log in again.',
    FORBIDDEN: 'You don\'t have permission to access this resource.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    UNKNOWN_ERROR: 'An unexpected error occurred.'
};

// Success Messages
const SUCCESS_MESSAGES = {
    LOGIN: 'Welcome back!',
    REGISTER: 'Account created successfully!',
    LOGOUT: 'Logged out successfully',
    SAVE: 'Saved successfully',
    DELETE: 'Deleted successfully',
    UPDATE: 'Updated successfully',
    COPY: 'Copied to clipboard'
};

// Routes Configuration
const ROUTES = {
    HOME: '/',
    DASHBOARD: '/pages/dashboard',
    ROADMAP: '/pages/roadmap',
    CALENDAR: '/pages/calendar',
    PROGRESS: '/pages/progress',
    NOTES: '/pages/notes',
    POMODORO: '/pages/pomodoro',
    RESOURCES: '/pages/resources',
    AI_ASSISTANT: '/pages/ai-assistant',
    ANALYTICS: '/pages/analytics',
    SEARCH: '/pages/search',
    PROFILE: '/pages/profile',
    SETTINGS: '/pages/settings',

    // Auth routes
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
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
    LOCKED: 'locked',
    AVAILABLE: 'available',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
};

// AI Assistant Configuration
const AI_CONFIG = {
    MAX_MESSAGE_LENGTH: 1000,
    MAX_CONVERSATION_HISTORY: 50,
    RESPONSE_TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3
};

// Keyboard Shortcuts
const KEYBOARD_SHORTCUTS = {
    SEARCH: ['ctrl+k', 'cmd+k'],
    NEW_NOTE: ['ctrl+n', 'cmd+n'],
    SAVE: ['ctrl+s', 'cmd+s'],
    ESCAPE: ['escape'],
    ENTER: ['enter']
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_BASE,
        API_ENDPOINTS,
        STORAGE_KEYS,
        APP_CONFIG,
        ROADMAP_CONFIG,
        NOTIFICATION_TYPES,
        THEME_CONFIG,
        VALIDATION_RULES,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
        ROUTES,
        RESOURCE_TYPES,
        PROGRESS_STATUS,
        AI_CONFIG,
        KEYBOARD_SHORTCUTS
    };
}