// ===== MAIN APPLICATION CONTROLLER =====

class DSADashboard {
    constructor() {
        // Application state
        this.currentSection = 'dashboard';
        this.currentWeek = 1;
        this.currentTheme = localStorage.getItem('dsa-theme') || 'light';
        this.currentUser = this.loadUserProfile();

        // Progress tracking
        this.progress = this.loadProgress();
        this.sessionStartTime = Date.now();
        this.dailyGoal = this.progress.settings?.dailyGoal || 2; // hours
        this.weeklyTarget = this.progress.settings?.weeklyTarget || 5; // problems

        // UI state
        this.fabMenuOpen = false;
        this.searchResults = [];
        this.notificationQueue = [];

        // Timers and intervals
        this.pomodoroTimer = null;
        this.autoSaveInterval = null;
        this.motivationInterval = null;

        // Pomodoro settings
        this.pomodoroTime = 25 * 60; // 25 minutes in seconds
        this.pomodoroMode = 'work';
        this.pomodoroRunning = false;
        this.pomodoroSessions = 0;

        // Charts instances
        this.charts = {};

        // Initialize application
        this.init();
    }

    // ===== INITIALIZATION =====
    init() {
        this.showLoadingScreen();

        // Initialize core components
        setTimeout(() => {
            this.initializeTheme();
            this.initializeEventListeners();
            this.initializeCharts();
            this.loadInitialData();
            this.startPeriodicTasks();
            this.setupNotifications();
            this.initializeAnimations();

            // Hide loading and show dashboard
            this.hideLoadingScreen();
            this.navigateToSection('dashboard');
        }, 2000);
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    initializeEventListeners() {
        // Navigation
        this.setupNavigationListeners();

        // Theme toggle
        this.setupThemeToggle();

        // Search functionality
        this.setupSearchListeners();

        // Modal handlers
        this.setupModalListeners();

        // Floating Action Button
        this.setupFABListeners();

        // Progress tracking
        this.setupProgressListeners();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Window events
        this.setupWindowListeners();
    }

    setupNavigationListeners() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                }
            });
        });

        // Week navigation
        const prevBtn = document.getElementById('prevWeekBtn');
        const nextBtn = document.getElementById('nextWeekBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateWeek(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateWeek(1));
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    setupSearchListeners() {
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                this.handleGlobalSearch(e.target.value);
            });

            globalSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.executeSearch(e.target.value);
                }
            });
        }
    }

    setupModalListeners() {
        // Settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Add project form
        const addProjectForm = document.getElementById('addProjectForm');
        if (addProjectForm) {
            addProjectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProject();
            });
        }
    }

    setupFABListeners() {
        const fabMain = document.getElementById('fabMain');
        if (fabMain) {
            fabMain.addEventListener('click', () => this.toggleFABMenu());
        }

        // Close FAB menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.fab-container') && this.fabMenuOpen) {
                this.closeFABMenu();
            }
        });
    }

    setupProgressListeners() {
        // Task checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-checkbox')) {
                this.toggleTaskCompletion(e.target);
            }
        });

        // Day completion
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mark-day-complete')) {
                this.markDayComplete();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.focusSearch();
            }

            // Ctrl/Cmd + D for dashboard
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.navigateToSection('dashboard');
            }

            // Ctrl/Cmd + P for practice
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.navigateToSection('practice');
            }

            // Ctrl/Cmd + T for theme toggle
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    setupWindowListeners() {
        // Auto-save before closing
        window.addEventListener('beforeunload', () => {
            this.saveProgress();
            this.updateSessionTime();
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTimers();
            } else {
                this.resumeTimers();
            }
        });

        // Handle resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // ===== NAVIGATION =====
    navigateToSection(section) {
        // Update URL without page reload
        window.history.pushState({ section }, '', `#${section}`);

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = section;

        // Load section-specific content
        this.loadSectionContent(section);

        // Track navigation
        this.trackEvent('navigation', { section });
    }

    loadSectionContent(section) {
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'roadmap':
                this.loadRoadmap();
                break;
            case 'daily-schedule':
                this.loadDailySchedule();
                break;
            case 'projects':
                this.loadProjects();
                break;
            case 'practice':
                this.loadPractice();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    navigateWeek(direction) {
        const newWeek = this.currentWeek + direction;
        if (newWeek >= 1 && newWeek <= 14) {
            this.currentWeek = newWeek;
            this.updateWeekNavigation();
            this.loadCurrentWeekData();
        }
    }

    updateWeekNavigation() {
        const weekNumber = document.getElementById('currentWeekNumber');
        if (weekNumber) {
            weekNumber.textContent = this.currentWeek;
        }

        const prevBtn = document.getElementById('prevWeekBtn');
        const nextBtn = document.getElementById('nextWeekBtn');

        if (prevBtn) prevBtn.disabled = this.currentWeek <= 1;
        if (nextBtn) nextBtn.disabled = this.currentWeek >= 14;
    }

    // ===== THEME MANAGEMENT =====
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('dsa-theme', this.currentTheme);
        this.updateThemeIcon();

        // Update charts for new theme
        this.updateChartsTheme();

        this.showNotification('Theme Updated', `Switched to ${this.currentTheme} mode`, 'info');
    }

    updateThemeIcon() {
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // ===== PROGRESS MANAGEMENT =====
    loadProgress() {
        const saved = localStorage.getItem('dsa-dashboard-progress');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error loading progress:', e);
            }
        }

        return this.getDefaultProgress();
    }

    getDefaultProgress() {
        return {
            daysCompleted: 0,
            weeksCompleted: 0,
            projectsCompleted: 0,
            problemsSolved: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalTimeSpent: 0,
            lastActiveDate: null,
            completedTasks: [],
            completedProjects: [],
            solvedProblems: [],
            activities: [],
            unlockedAchievements: [],
            pomodoroSessions: 0,
            notes: [],
            settings: {
                displayName: 'Coder',
                email: '',
                dailyGoal: 2,
                weeklyTarget: 5,
                notifications: true,
                sounds: true,
                autoSave: true,
                animations: true
            },
            stats: {
                sessionsToday: 0,
                timeToday: 0,
                problemsToday: 0,
                weeklyProgress: 0,
                topicStats: {},
                difficultyStats: { easy: 0, medium: 0, hard: 0 }
            }
        };
    }

    saveProgress() {
        try {
            // Update session time
            this.updateSessionTime();

            // Save to localStorage
            localStorage.setItem('dsa-dashboard-progress', JSON.stringify(this.progress));

            // Show save indicator
            this.showSaveIndicator();

        } catch (e) {
            console.error('Error saving progress:', e);
            this.showNotification('Save Error', 'Failed to save progress', 'error');
        }
    }

    updateSessionTime() {
        const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000 / 60); // minutes
        this.progress.totalTimeSpent += sessionTime;
        this.progress.stats.timeToday += sessionTime;
        this.sessionStartTime = Date.now();
    }

    showSaveIndicator() {
        // Create or update save indicator
        let indicator = document.getElementById('saveIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'saveIndicator';
            indicator.className = 'save-indicator';
            indicator.innerHTML = '<i class="fas fa-check"></i> Saved';
            document.body.appendChild(indicator);
        }

        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    // ===== TASK MANAGEMENT =====
    toggleTaskCompletion(checkbox) {
        const taskId = checkbox.closest('.task-item')?.dataset.taskId;
        if (!taskId) return;

        const isCompleted = checkbox.checked;

        if (isCompleted) {
            this.completeTask(taskId);
        } else {
            this.uncompleteTask(taskId);
        }

        this.saveProgress();
        this.updateDashboardStats();
    }

    completeTask(taskId) {
        if (!this.progress.completedTasks.includes(taskId)) {
            this.progress.completedTasks.push(taskId);
            this.addActivity(`Completed task: ${taskId}`, 'success');
            this.checkForAchievements();
            this.updateStreak();

            // Update daily stats
            this.progress.stats.sessionsToday++;

            // Show completion animation
            this.showTaskCompletion(taskId);
        }
    }

    uncompleteTask(taskId) {
        const index = this.progress.completedTasks.indexOf(taskId);
        if (index > -1) {
            this.progress.completedTasks.splice(index, 1);
            this.addActivity(`Unmarked task: ${taskId}`, 'warning');
        }
    }

    markDayComplete() {
        const today = new Date().toISOString().split('T')[0];
        const dayId = `day-${this.currentWeek}-${today}`;

        if (!this.progress.completedTasks.includes(dayId)) {
            this.completeTask(dayId);
            this.progress.daysCompleted++;

            // Check if week is completed
            this.checkWeekCompletion();

            this.showNotification('Day Complete!', 'Great job finishing today\'s learning goals!', 'success');
        }
    }

    checkWeekCompletion() {
        const weekTasks = this.progress.completedTasks.filter(taskId =>
            taskId.startsWith(`week-${this.currentWeek}`)
        );

        const weekData = DSA_ROADMAP.weeks.find(w => w.id === this.currentWeek);
        if (weekData && weekTasks.length >= weekData.days.length) {
            this.progress.weeksCompleted++;
            this.addActivity(`Completed Week ${this.currentWeek}!`, 'success');
            this.showNotification('Week Complete!', `Congratulations on completing Week ${this.currentWeek}!`, 'success');
        }
    }

    updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (this.progress.lastActiveDate === yesterdayStr) {
            this.progress.currentStreak++;
        } else if (this.progress.lastActiveDate !== today) {
            this.progress.currentStreak = 1;
        }

        this.progress.lastActiveDate = today;

        if (this.progress.currentStreak > this.progress.longestStreak) {
            this.progress.longestStreak = this.progress.currentStreak;
        }
    }

    // ===== ACTIVITY TRACKING =====
    addActivity(message, type = 'info', data = {}) {
        const activity = {
            id: Date.now(),
            message,
            type,
            data,
            timestamp: Date.now()
        };

        this.progress.activities.unshift(activity);

        // Keep only last 50 activities
        if (this.progress.activities.length > 50) {
            this.progress.activities = this.progress.activities.slice(0, 50);
        }

        // Update recent activity display
        this.updateRecentActivity();
    }

    updateRecentActivity() {
        const container = document.getElementById('recentActivityTimeline');
        if (!container) return;

        const activities = this.progress.activities.slice(0, 5);

        container.innerHTML = activities.map(activity => `
            <div class="activity-item" data-aos="fade-in">
                <div class="activity-icon bg-${activity.type}">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${this.formatRelativeTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'success': 'check',
            'warning': 'exclamation-triangle',
            'info': 'info-circle',
            'error': 'times',
            'project': 'folder-open',
            'practice': 'code',
            'achievement': 'trophy'
        };
        return icons[type] || 'bell';
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    // ===== ACHIEVEMENT SYSTEM =====
    checkForAchievements() {
        const userStats = this.calculateCurrentStats();
        const newAchievements = [];

        ACHIEVEMENTS.forEach(achievement => {
            if (achievement.condition(userStats) &&
                !this.progress.unlockedAchievements.includes(achievement.id)) {

                newAchievements.push(achievement);
                this.progress.unlockedAchievements.push(achievement.id);
            }
        });

        // Show achievement notifications
        newAchievements.forEach(achievement => {
            this.showAchievementNotification(achievement);
            this.addActivity(`Unlocked: ${achievement.title}`, 'achievement');
        });

        // Update achievements display
        this.updateAchievementsDisplay();
    }

    calculateCurrentStats() {
        return {
            daysCompleted: this.progress.daysCompleted,
            weeksCompleted: this.progress.weeksCompleted,
            projectsCompleted: this.progress.projectsCompleted,
            problemsSolved: this.progress.problemsSolved,
            currentStreak: this.progress.currentStreak,
            longestStreak: this.progress.longestStreak,
            totalTimeSpent: this.progress.totalTimeSpent,
            pomodoroSessions: this.progress.pomodoroSessions,
            maxDailyTasks: this.progress.stats.sessionsToday,
            lateNightSessions: this.progress.stats.lateNightSessions || 0,
            earlyMorningSessions: this.progress.stats.earlyMorningSessions || 0
        };
    }

    showAchievementNotification(achievement) {
        const popup = document.getElementById('achievementPopup');
        if (!popup) return;

        const icon = popup.querySelector('.achievement-popup-icon i');
        const title = document.getElementById('achievementPopupTitle');
        const description = document.getElementById('achievementPopupDescription');

        if (icon) icon.className = achievement.icon;
        if (title) title.textContent = achievement.title;
        if (description) description.textContent = achievement.description;

        popup.classList.add('show');

        // Play sound if enabled
        if (this.progress.settings.sounds) {
            this.playAchievementSound();
        }

        // Hide after 5 seconds
        setTimeout(() => {
            popup.classList.remove('show');
        }, 5000);
    }

    updateAchievementsDisplay() {
        const container = document.getElementById('achievementsShowcase');
        if (!container) return;

        const userStats = this.calculateCurrentStats();
        const achievementsHTML = ACHIEVEMENTS.slice(0, 6).map(achievement => {
            const isEarned = achievement.condition(userStats);
            return `
                <div class="achievement-badge ${isEarned ? 'earned' : ''}" 
                     title="${achievement.description}">
                    <div class="achievement-icon">
                        <i class="${achievement.icon}"></i>
                    </div>
                    <div class="achievement-title">${achievement.title}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = achievementsHTML;

        // Update achievement count
        const achievementCount = document.getElementById('achievementCount');
        if (achievementCount) {
            const earned = this.progress.unlockedAchievements.length;
            const total = ACHIEVEMENTS.length;
            achievementCount.textContent = `${earned}/${total} unlocked`;
        }
    }

    // ===== SEARCH FUNCTIONALITY =====
    handleGlobalSearch(query) {
        if (query.length < 2) {
            this.clearSearchResults();
            return;
        }

        const results = this.searchContent(query);
        this.displaySearchResults(results);
    }

    searchContent(query) {
        const results = [];
        const searchTerm = query.toLowerCase();

        // Search in roadmap
        DSA_ROADMAP.weeks.forEach((week, weekIndex) => {
            week.days.forEach((day, dayIndex) => {
                if (day.topic.toLowerCase().includes(searchTerm) ||
                    day.activities.some(activity => activity.toLowerCase().includes(searchTerm))) {

                    results.push({
                        type: 'topic',
                        title: day.topic,
                        subtitle: `Week ${weekIndex + 1}, Day ${dayIndex + 1}`,
                        week: weekIndex + 1,
                        day: dayIndex + 1,
                        relevance: this.calculateRelevance(day.topic, searchTerm)
                    });
                }
            });
        });

        // Search in projects
        DSA_ROADMAP.projects.forEach(project => {
            if (project.name.toLowerCase().includes(searchTerm) ||
                project.description.toLowerCase().includes(searchTerm)) {

                results.push({
                    type: 'project',
                    title: project.name,
                    subtitle: `Week ${project.week} Project`,
                    description: project.description,
                    relevance: this.calculateRelevance(project.name, searchTerm)
                });
            }
        });

        // Search in DSA topics
        DSA_TOPICS.forEach(topic => {
            if (topic.name.toLowerCase().includes(searchTerm) ||
                topic.description.toLowerCase().includes(searchTerm)) {

                results.push({
                    type: 'dsa-topic',
                    title: topic.name,
                    subtitle: 'DSA Topic',
                    description: topic.description,
                    relevance: this.calculateRelevance(topic.name, searchTerm)
                });
            }
        });

        // Sort by relevance
        return results.sort((a, b) => b.relevance - a.relevance).slice(0, 8);
    }

    calculateRelevance(text, searchTerm) {
        const textLower = text.toLowerCase();
        const termLower = searchTerm.toLowerCase();

        if (textLower === termLower) return 100;
        if (textLower.startsWith(termLower)) return 80;
        if (textLower.includes(termLower)) return 60;

        // Check for partial matches
        const words = termLower.split(' ');
        let partialScore = 0;
        words.forEach(word => {
            if (textLower.includes(word)) partialScore += 20;
        });

        return partialScore;
    }

    displaySearchResults(results) {
        // Implementation would show dropdown with results
        this.searchResults = results;
    }

    clearSearchResults() {
        this.searchResults = [];
    }

    executeSearch(query) {
        if (this.searchResults.length > 0) {
            const firstResult = this.searchResults[0];
            this.navigateToSearchResult(firstResult);
        }
    }

    navigateToSearchResult(result) {
        switch (result.type) {
            case 'topic':
                this.currentWeek = result.week;
                this.navigateToSection('roadmap');
                break;
            case 'project':
                this.navigateToSection('projects');
                break;
            case 'dsa-topic':
                this.navigateToSection('practice');
                break;
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    // ===== FLOATING ACTION BUTTON =====
    toggleFABMenu() {
        this.fabMenuOpen = !this.fabMenuOpen;

        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');

        if (this.fabMenuOpen) {
            this.openFABMenu();
        } else {
            this.closeFABMenu();
        }
    }

    openFABMenu() {
        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');

        if (fabMain) fabMain.classList.add('active');
        if (fabMenu) fabMenu.classList.add('active');

        this.fabMenuOpen = true;
    }

    closeFABMenu() {
        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');

        if (fabMain) fabMain.classList.remove('active');
        if (fabMenu) fabMenu.classList.remove('active');

        this.fabMenuOpen = false;
    }

    // ===== POMODORO TIMER =====
    startPomodoro() {
        if (!this.pomodoroRunning) {
            this.pomodoroRunning = true;
            this.pomodoroTimer = setInterval(() => {
                this.updatePomodoroDisplay();
                this.pomodoroTime--;

                if (this.pomodoroTime <= 0) {
                    this.completePomodoroSession();
                }
            }, 1000);

            this.updatePomodoroControls();
        }
    }

    pausePomodoro() {
        if (this.pomodoroRunning) {
            clearInterval(this.pomodoroTimer);
            this.pomodoroRunning = false;
            this.updatePomodoroControls();
        }
    }

    resetPomodoro() {
        clearInterval(this.pomodoroTimer);
        this.pomodoroRunning = false;
        this.setPomodoroMode(this.pomodoroMode);
        this.updatePomodoroControls();
    }

    setPomodoroMode(mode) {
        this.pomodoroMode = mode;

        switch (mode) {
            case 'work':
                this.pomodoroTime = 25 * 60;
                break;
            case 'break':
                this.pomodoroTime = 5 * 60;
                break;
            case 'longBreak':
                this.pomodoroTime = 15 * 60;
                break;
        }

        this.updatePomodoroDisplay();
        this.updatePomodoroModeDisplay();
    }

    updatePomodoroDisplay() {
        const display = document.getElementById('pomodoroDisplay');
        if (display) {
            const minutes = Math.floor(this.pomodoroTime / 60);
            const seconds = this.pomodoroTime % 60;
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updatePomodoroModeDisplay() {
        const modeDisplay = document.getElementById('pomodoroMode');
        if (modeDisplay) {
            const modeNames = {
                'work': 'Work Session',
                'break': 'Short Break',
                'longBreak': 'Long Break'
            };
            modeDisplay.textContent = modeNames[this.pomodoroMode] || 'Work Session';
        }
    }

    updatePomodoroControls() {
        const startBtn = document.getElementById('pomodoroStart');
        const pauseBtn = document.getElementById('pomodoroPause');

        if (startBtn) {
            startBtn.innerHTML = this.pomodoroRunning ?
                '<i class="fas fa-play"></i> Resume' :
                '<i class="fas fa-play"></i> Start';
            startBtn.disabled = this.pomodoroRunning;
        }

        if (pauseBtn) {
            pauseBtn.disabled = !this.pomodoroRunning;
        }
    }

    completePomodoroSession() {
        this.resetPomodoro();
        this.pomodoroSessions++;
        this.progress.pomodoroSessions++;

        // Update sessions display
        const sessionsDisplay = document.getElementById('pomodoroSessionsToday');
        if (sessionsDisplay) {
            sessionsDisplay.textContent = this.pomodoroSessions;
        }

        this.showNotification('Pomodoro Complete!',
            `${this.pomodoroMode === 'work' ? 'Work' : 'Break'} session completed!`,
            'success');

        this.addActivity(`Completed ${this.pomodoroMode} pomodoro session`, 'success');

        // Auto-switch mode
        if (this.pomodoroMode === 'work') {
            this.setPomodoroMode(this.pomodoroSessions % 4 === 0 ? 'longBreak' : 'break');
        } else {
            this.setPomodoroMode('work');
        }

        // Play completion sound
        if (this.progress.settings.sounds) {
            this.playNotificationSound();
        }
    }

    // ===== NOTIFICATION SYSTEM =====
    showNotification(title, message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toastId = `toast-${Date.now()}`;
        const toastHTML = `
            <div class="toast" id="${toastId}" role="alert">
                <div class="toast-header">
                    <i class="fas fa-${this.getNotificationIcon(type)} me-2 text-${type}"></i>
                    <strong class="me-auto">${title}</strong>
                    <small class="text-muted">now</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);

        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Auto remove after duration
        setTimeout(() => {
            toastElement?.remove();
        }, duration + 1000);

        // Browser notification if supported and enabled
        if (this.progress.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'bell';
    }

    setupNotifications() {
        if ('Notification' in window && this.progress.settings.notifications) {
            Notification.requestPermission();
        }
    }

    // ===== PERIODIC TASKS =====
    startPeriodicTasks() {
        // Auto-save every 30 seconds
        if (this.progress.settings.autoSave) {
            this.autoSaveInterval = setInterval(() => {
                this.saveProgress();
            }, 30000);
        }

        // Update motivation every hour
        this.motivationInterval = setInterval(() => {
            this.showMotivationalMessage();
        }, 3600000);
    }

    showMotivationalMessage() {
        const messages = [
            "Keep up the great work! You're making excellent progress!",
            "Every problem you solve makes you a better programmer!",
            "Consistency is key to mastering DSA. You're doing amazing!",
            "Remember: the best way to learn is by doing. Keep coding!",
            "Your dedication to learning will pay off. Stay focused!"
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.showNotification('Stay Motivated!', randomMessage, 'info');
    }

    // ===== SOUND EFFECTS =====
    playNotificationSound() {
        if (!this.progress.settings.sounds) return;

        // Create audio context for notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    playAchievementSound() {
        if (!this.progress.settings.sounds) return;

        // Create a more elaborate sound for achievements
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // First note
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 523; // C5
        gain1.gain.value = 0.1;
        osc1.start();
        osc1.stop(audioContext.currentTime + 0.2);

        // Second note
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 659; // E5
            gain2.gain.value = 0.1;
            osc2.start();
            osc2.stop(audioContext.currentTime + 0.2);
        }, 200);

        // Third note
        setTimeout(() => {
            const osc3 = audioContext.createOscillator();
            const gain3 = audioContext.createGain();
            osc3.connect(gain3);
            gain3.connect(audioContext.destination);
            osc3.frequency.value = 784; // G5
            gain3.gain.value = 0.1;
            osc3.start();
            osc3.stop(audioContext.currentTime + 0.3);
        }, 400);
    }

    // ===== UTILITY METHODS =====
    trackEvent(category, data) {
        // Track user events for analytics
        this.addActivity(`${category}: ${JSON.stringify(data)}`, 'info');
    }

    pauseTimers() {
        if (this.pomodoroRunning) {
            this.pausePomodoro();
        }
    }

    resumeTimers() {
        // Timers will be manually restarted by user
    }

    handleResize() {
        // Update charts on resize
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }

    initializeAnimations() {
        // Initialize AOS (Animate On Scroll) if available
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true,
                mirror: false
            });
        }
    }

    initializeCharts() {
        // Charts will be initialized in dashboard.js
    }

    updateChartsTheme() {
        // Update chart colors for theme change
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                // Update chart theme colors
                chart.update();
            }
        });
    }

    loadInitialData() {
        // Load initial data for dashboard
        this.updateDashboardStats();
        this.loadTodayTasks();
        this.updateRecentActivity();
        this.updateAchievementsDisplay();
        this.loadDailyQuote();
    }

    updateDashboardStats() {
        // This will be implemented in dashboard.js
    }

    loadTodayTasks() {
        // This will be implemented in dashboard.js
    }

    loadDailyQuote() {
        const today = new Date();
        const dayIndex = today.getDate() % DAILY_QUOTES.length;
        const quote = DAILY_QUOTES[dayIndex];

        const quoteText = document.getElementById('dailyQuoteText');
        const quoteAuthor = document.getElementById('dailyQuoteAuthor');

        if (quoteText) quoteText.textContent = quote.text;
        if (quoteAuthor) quoteAuthor.textContent = `- ${quote.author}`;
    }

    loadUserProfile() {
        const saved = localStorage.getItem('dsa-user-profile');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error loading user profile:', e);
            }
        }

        return {
            name: 'Coder',
            email: '',
            joinDate: Date.now(),
            preferences: {
                theme: 'light',
                notifications: true,
                sounds: true
            }
        };
    }

    saveUserProfile() {
        localStorage.setItem('dsa-user-profile', JSON.stringify(this.currentUser));
    }

    // ===== PUBLIC API METHODS =====

    // Methods that can be called from HTML onclick handlers
    openPomodoro() {
        const modal = new bootstrap.Modal(document.getElementById('pomodoroModal'));
        modal.show();
    }

    openNotes() {
        const modal = new bootstrap.Modal(document.getElementById('notesModal'));
        modal.show();
        this.loadNotes();
    }

    openGlossary() {
        const modal = new bootstrap.Modal(document.getElementById('glossaryModal'));
        modal.show();
        this.loadGlossary();
    }

    saveSettings() {
        const form = document.getElementById('settingsForm');
        if (!form) return;

        const formData = new FormData(form);

        this.progress.settings = {
            ...this.progress.settings,
            displayName: formData.get('displayName') || 'Coder',
            email: formData.get('email') || '',
            dailyGoal: parseInt(formData.get('dailyGoal')) || 2,
            weeklyTarget: parseInt(formData.get('weeklyTarget')) || 5,
            notifications: formData.has('notifications'),
            sounds: formData.has('sounds'),
            autoSave: formData.has('autoSave'),
            animations: formData.has('animations')
        };

        this.saveProgress();
        this.showNotification('Settings Saved', 'Your preferences have been updated!', 'success');

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
        if (modal) modal.hide();
    }

    saveProject() {
        // This will be implemented in projects.js
    }

    exportProgress() {
        const data = {
            progress: this.progress,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        this.showNotification('Export Complete', 'Your progress has been exported successfully!', 'success');
    }

    importProgress() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (data.progress && confirm('This will replace your current progress. Are you sure?')) {
                        this.progress = data.progress;
                        this.saveProgress();
                        this.loadInitialData();
                        this.showNotification('Import Complete', 'Your progress has been imported successfully!', 'success');

                        // Refresh current view
                        this.loadSectionContent(this.currentSection);
                    }
                } catch (error) {
                    this.showNotification('Import Error', 'Invalid file format or corrupted data.', 'error');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This action cannot be undone.')) {
            this.progress = this.getDefaultProgress();
            this.saveProgress();
            this.loadInitialData();
            this.showNotification('Progress Reset', 'All progress has been reset.', 'info');

            // Refresh current view
            this.loadSectionContent(this.currentSection);
        }
    }
}

// ===== GLOBAL FUNCTIONS FOR HTML HANDLERS =====

// Global instance
let app;

// Functions accessible from HTML
window.startPomodoro = () => app?.openPomodoro();
window.openNotes = () => app?.openNotes();
window.openGlossary = () => app?.openGlossary();
window.openPractice = () => app?.navigateToSection('practice');
window.markDayComplete = () => app?.markDayComplete();
window.setPomodoroMode = (mode) => app?.setPomodoroMode(mode);
window.saveProject = () => app?.saveProject();
window.saveSettings = () => app?.saveSettings();
window.exportProgress = () => app?.exportProgress();
window.importProgress = () => app?.importProgress();
window.resetProgress = () => app?.resetProgress();
window.refreshTodayTasks = () => app?.loadTodayTasks();
window.navigateWeek = (direction) => app?.navigateWeek(direction);
window.toggleCalendarView = () => app?.toggleCalendarView();
window.showWeekOverview = () => app?.showWeekOverview();
window.addQuickProblem = () => app?.addQuickProblem();
window.createNewNote = () => app?.createNewNote();
window.saveCurrentNote = () => app?.saveCurrentNote();
window.deleteCurrentNote = () => app?.deleteCurrentNote();
window.previousMonth = () => app?.previousMonth();
window.nextMonth = () => app?.nextMonth();
window.exportSchedule = () => app?.exportSchedule();

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new DSADashboard();

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.section) {
            app.navigateToSection(e.state.section);
        }
    });

    // Set initial URL state
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'roadmap', 'daily-schedule', 'projects', 'practice', 'analytics'].includes(hash)) {
        app.currentSection = hash;
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSADashboard;
}