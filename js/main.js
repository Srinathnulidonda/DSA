// Main Application JavaScript
class DSALearningApp {
    constructor() {
        this.currentUser = null;
        this.userProgress = {};
        this.calendar = null;
        this.isInitialized = false;
        this.firebaseInitialized = false;
    }

    async init() {
        try {
            // Initialize user
            this.initializeUser();

            // Load progress
            await this.loadProgress();

            // Initialize Firebase
            await this.initializeFirebase();

            // Initialize UI components
            this.initializeUI();

            // Set up event listeners
            this.setupEventListeners();

            // Mark as initialized
            this.isInitialized = true;

            console.log('DSA Learning App initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            Utils.showToast('Error initializing app. Please refresh the page.', 'error');
        }
    }

    initializeUser() {
        const userId = localStorage.getItem('userId') || Utils.generateId('user');
        localStorage.setItem('userId', userId);
        this.currentUser = userId;
    }

    async loadProgress() {
        try {
            // First try to load from local storage
            const savedProgress = localStorage.getItem('dsaProgress');
            if (savedProgress) {
                this.userProgress = JSON.parse(savedProgress);
            } else {
                // Initialize default progress
                this.userProgress = Progress.getDefaultProgress();
            }

            // Update UI with loaded progress
            Progress.updateUI(this.userProgress);
        } catch (error) {
            console.error('Error loading progress:', error);
            this.userProgress = Progress.getDefaultProgress();
        }
    }

    async initializeFirebase() {
        try {
            // Firebase is already initialized in index.html
            if (typeof firebase !== 'undefined') {
                this.firebaseInitialized = true;

                // Set up real-time sync
                this.setupFirebaseSync();
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    setupFirebaseSync() {
        if (!this.firebaseInitialized || !this.currentUser) return;

        const database = firebase.database();
        const userRef = database.ref(`users/${this.currentUser}`);

        // Listen for changes
        userRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.progress) {
                this.userProgress = data.progress;
                Progress.updateUI(this.userProgress);
            }
        });
    }

    initializeUI() {
        // Initialize calendar
        Calendar.init();

        // Display daily quote
        UI.displayDailyQuote();

        // Render roadmap
        Roadmap.render();

        // Render projects
        Projects.render();

        // Load notes
        Notes.displaySaved();

        // Update statistics
        Progress.updateStatistics(this.userProgress);

        // Initialize charts
        Charts.initProgressChart();

        // Show dashboard
        UI.showSection('dashboard');

        // Update today's schedule
        Roadmap.updateTodaySchedule(this.userProgress);

        // Check achievements
        Progress.checkAchievements(this.userProgress);

        // Apply saved theme
        Theme.applySavedTheme();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('href').substring(1);
                UI.showSection(section);
            });
        });

        // Mobile menu toggle
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', UI.toggleSidebar);
        }

        // Dark mode toggle
        document.querySelector('.dark-mode-toggle').addEventListener('click', Theme.toggle);

        // Search functionality
        const searchInput = document.getElementById('roadmapSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                Roadmap.filter(e.target.value);
            });
        }

        // Export/Import buttons
        document.querySelector('[onclick="exportProgress()"]').addEventListener('click', () => {
            Progress.export(this.userProgress);
        });

        document.querySelector('[onclick="importProgress()"]').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            Progress.import(e).then(data => {
                if (data) {
                    this.userProgress = data;
                    this.initializeUI();
                }
            });
        });

        // Note saving
        const saveNoteBtn = document.querySelector('[onclick="saveNote()"]');
        if (saveNoteBtn) {
            saveNoteBtn.addEventListener('click', () => {
                Notes.save(this.userProgress, this.currentUser);
            });
        }

        // Auto-save notes
        Notes.setupAutoSave();

        // Pomodoro timer
        Pomodoro.setupEventListeners();

        // Window events
        window.addEventListener('online', () => {
            Utils.showToast('Back online! Syncing your progress...', 'info');
            this.saveProgress();
        });

        window.addEventListener('offline', () => {
            Utils.showToast('You are offline. Changes will be saved locally.', 'info');
        });

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Touch gestures for mobile
        this.setupTouchGestures();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save note
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const notesSection = document.getElementById('notes-section');
                if (notesSection && notesSection.style.display !== 'none') {
                    e.preventDefault();
                    Notes.save(this.userProgress, this.currentUser);
                }
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                UI.closeAllModals();
            }

            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('roadmapSearch');
                if (searchInput) {
                    UI.showSection('roadmap');
                    searchInput.focus();
                }
            }
        });
    }

    setupTouchGestures() {
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchEndX - touchStartX;

        if (Math.abs(diff) < swipeThreshold) return;

        if (diff > 0 && window.matchMedia('(max-width: 768px)').matches) {
            // Swiped right - open sidebar
            document.getElementById('sidebar').classList.add('active');
        } else if (diff < 0 && window.matchMedia('(max-width: 768px)').matches) {
            // Swiped left - close sidebar
            document.getElementById('sidebar').classList.remove('active');
        }
    }

    saveProgress() {
        try {
            // Save to local storage
            localStorage.setItem('dsaProgress', JSON.stringify(this.userProgress));

            // Save to Firebase if connected
            if (this.firebaseInitialized && this.currentUser) {
                const database = firebase.database();
                database.ref(`users/${this.currentUser}/progress`).set(this.userProgress);
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DSALearningApp();
    window.app.init();
});

// Export functions for HTML onclick handlers
window.showSection = (section) => UI.showSection(section);
window.toggleWeek = (weekIndex) => Roadmap.toggleWeek(weekIndex);
window.toggleDayComplete = (dayId, weekIndex) => {
    Progress.toggleDayComplete(dayId, weekIndex, window.app.userProgress);
    window.app.saveProgress();
};
window.updateProjectStatus = (projectName, index) => {
    Projects.updateStatus(projectName, window.app.userProgress);
    window.app.saveProgress();
};
window.saveNote = () => Notes.save(window.app.userProgress, window.app.currentUser);
window.deleteNote = (noteId) => {
    Notes.delete(noteId, window.app.userProgress, window.app.currentUser);
    window.app.saveProgress();
};
window.showGlossary = () => UI.showGlossary();
window.closeGlossary = () => UI.closeGlossary();
window.toggleSidebar = () => UI.toggleSidebar();
window.toggleDarkMode = () => Theme.toggle();
window.exportProgress = () => Progress.export(window.app.userProgress);
window.importProgress = () => document.getElementById('importFile').click();
window.handleImportFile = (event) => {
    Progress.import(event).then(data => {
        if (data) {
            window.app.userProgress = data;
            window.app.initializeUI();
            window.app.saveProgress();
        }
    });
};

// Pomodoro timer functions
window.startTimer = () => Pomodoro.start();
window.pauseTimer = () => Pomodoro.pause();
window.resetTimer = () => Pomodoro.reset();