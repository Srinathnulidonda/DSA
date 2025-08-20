// Application Constants
const APP_CONFIG = {
    API_BASE_URL: 'https://dsa-backend-gj8n.onrender.com',
    APP_NAME: 'DSA Path',
    VERSION: '1.0.0',
    STORAGE_PREFIX: 'dsapath_',
    THEMES: ['light', 'dark'],
    DEFAULT_THEME: 'light',
    POMODORO_DURATION: 25 * 60, // 25 minutes in seconds
    SHORT_BREAK: 5 * 60, // 5 minutes
    LONG_BREAK: 15 * 60, // 15 minutes
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ROADMAP_WEEKS: 14,
    ITEMS_PER_PAGE: 20,
};

const ROUTES = {
    HOME: '/',
    DASHBOARD: '/dashboard',
    ROADMAP: '/roadmap',
    CALENDAR: '/calendar',
    PROGRESS: '/progress',
    NOTES: '/notes',
    POMODORO: '/pomodoro',
    PROFILE: '/profile',
    SETTINGS: '/settings',
    ANALYTICS: '/analytics',
    RESOURCES: '/resources',
    AI_ASSISTANT: '/ai-assistant',
    SEARCH: '/search',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
};

const API_ENDPOINTS = {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh',

    // User
    PROFILE: '/profile',
    PREFERENCES: '/preferences',
    UPLOAD_AVATAR: '/profile/avatar',

    // Progress
    PROGRESS: '/progress',
    CALENDAR: '/calendar',

    // Notes
    NOTES: '/notes',

    // Pomodoro
    POMODORO_START: '/pomodoro',
    POMODORO_COMPLETE: '/pomodoro/:id/complete',
    POMODORO_HISTORY: '/pomodoro/history',

    // AI Assistant
    AI_ASK: '/ai/ask',
    AI_STUDY_PLAN: '/ai/study-plan',
    AI_QUIZ: '/ai/quiz',
    AI_SUMMARIZE: '/ai/summarize',

    // Dashboard
    DASHBOARD: '/dashboard',

    // Resources
    RESOURCES: '/resources',
    ROADMAP: '/roadmap',

    // Search
    SEARCH: '/search',

    // Notifications
    NOTIFICATIONS: '/notifications',
    MARK_READ: '/notifications/:id/read',
};

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',
    THEME: 'theme',
    PREFERENCES: 'preferences',
    TIMER_STATE: 'timer_state',
    DRAFT_NOTE: 'draft_note',
    RECENT_SEARCHES: 'recent_searches',
    OFFLINE_DATA: 'offline_data',
};

const EVENT_TYPES = {
    AUTH_STATE_CHANGED: 'auth_state_changed',
    THEME_CHANGED: 'theme_changed',
    PROGRESS_UPDATED: 'progress_updated',
    TIMER_TICK: 'timer_tick',
    TIMER_COMPLETE: 'timer_complete',
    NOTE_SAVED: 'note_saved',
    NOTIFICATION_RECEIVED: 'notification_received',
    ROUTE_CHANGED: 'route_changed',
    NETWORK_STATUS_CHANGED: 'network_status_changed',
};

const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

const TIMER_STATES = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
};

const PROGRESS_STATES = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    REVIEW: 'review',
};

const CHART_COLORS = {
    PRIMARY: '#6366f1',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    DANGER: '#ef4444',
    INFO: '#0ea5e9',
    PURPLE: '#8b5cf6',
    PINK: '#ec4899',
    INDIGO: '#6366f1',
};

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 992;
const DESKTOP_BREAKPOINT = 1200;

const ACHIEVEMENT_TYPES = {
    STREAK: 'streak',
    COMPLETION: 'completion',
    TIME: 'time',
    CONSISTENCY: 'consistency',
};

const NAVIGATION_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2', route: ROUTES.DASHBOARD, primary: true },
    { id: 'roadmap', label: 'Roadmap', icon: 'bi-map', route: ROUTES.ROADMAP, primary: true },
    { id: 'progress', label: 'Progress', icon: 'bi-graph-up', route: ROUTES.PROGRESS, primary: true },
    { id: 'notes', label: 'Notes', icon: 'bi-journal-text', route: ROUTES.NOTES, primary: true },
    { id: 'pomodoro', label: 'Timer', icon: 'bi-clock', route: ROUTES.POMODORO, primary: false },
    { id: 'calendar', label: 'Calendar', icon: 'bi-calendar3', route: ROUTES.CALENDAR, primary: false },
    { id: 'analytics', label: 'Analytics', icon: 'bi-bar-chart', route: ROUTES.ANALYTICS, primary: false },
    { id: 'resources', label: 'Resources', icon: 'bi-book', route: ROUTES.RESOURCES, primary: false },
    { id: 'ai-assistant', label: 'AI Assistant', icon: 'bi-robot', route: ROUTES.AI_ASSISTANT, primary: false },
    { id: 'search', label: 'Search', icon: 'bi-search', route: ROUTES.SEARCH, primary: false },
    { id: 'profile', label: 'Profile', icon: 'bi-person', route: ROUTES.PROFILE, primary: false },
    { id: 'settings', label: 'Settings', icon: 'bi-gear', route: ROUTES.SETTINGS, primary: false },
];

const SOUND_FILES = {
    NOTIFICATION: '/assets/sounds/notification.mp3',
    TIMER_COMPLETE: '/assets/sounds/timer-complete.mp3',
    ACHIEVEMENT: '/assets/sounds/achievement.mp3',
};

const REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    PHONE: /^\+?[\d\s\-KATEX_INLINE_OPENKATEX_INLINE_CLOSE]+$/,
    URL: /^https?:\/\/.+/,
};

const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
    UNAUTHORIZED: 'Session expired. Please log in again.',
    FORBIDDEN: 'You don\'t have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'Server error occurred. Please try again later.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    FILE_TOO_LARGE: `File size must be less than ${APP_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
    INVALID_FILE_TYPE: 'Invalid file type. Please select a supported format.',
};

const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Welcome back! You\'ve successfully logged in.',
    REGISTER_SUCCESS: 'Account created successfully! Welcome to DSA Path.',
    LOGOUT_SUCCESS: 'You\'ve been logged out successfully.',
    PROGRESS_SAVED: 'Progress saved successfully!',
    NOTE_SAVED: 'Note saved successfully!',
    SETTINGS_SAVED: 'Settings updated successfully!',
    PASSWORD_RESET: 'Password reset successfully!',
    TIMER_COMPLETE: 'Pomodoro session completed! Great work!',
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APP_CONFIG,
        ROUTES,
        API_ENDPOINTS,
        STORAGE_KEYS,
        EVENT_TYPES,
        NOTIFICATION_TYPES,
        TIMER_STATES,
        PROGRESS_STATES,
        CHART_COLORS,
        MOBILE_BREAKPOINT,
        TABLET_BREAKPOINT,
        DESKTOP_BREAKPOINT,
        ACHIEVEMENT_TYPES,
        NAVIGATION_ITEMS,
        SOUND_FILES,
        REGEX_PATTERNS,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
    };
}