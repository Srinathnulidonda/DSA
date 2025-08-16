// Pomodoro timer functionality

class PomodoroManager {
    constructor() {
        this.timer = null;
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'pomodoro'; // pomodoro, shortBreak, longBreak
        this.timeRemaining = 25 * 60; // seconds
        this.sessionCount = 1;
        this.completedPomodoros = 0;
        this.todayStats = {
            pomodoros: 0,
            focusTime: 0,
            breakTime: 0
        };

        // Settings
        this.settings = {
            pomodoroLength: 25,
            shortBreakLength: 5,
            longBreakLength: 15,
            longBreakInterval: 4,
            autoStartBreaks: true,
            autoStartPomodoros: false,
            enableNotifications: true
        };

        this.init();
    }

    async init() {
        this.loadSettings();
        await this.loadTodayStats();
        await this.loadRecentSessions();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateProgress();
        this.renderTodayStats();
        this.requestNotificationPermission();
    }

    loadSettings() {
        const savedSettings = storage.get('pomodoroSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...savedSettings };
        }

        // Update UI with settings
        document.getElementById('pomodoroLength').value = this.settings.pomodoroLength;
        document.getElementById('shortBreakLength').value = this.settings.shortBreakLength;
        document.getElementById('longBreakLength').value = this.settings.longBreakLength;
        document.getElementById('longBreakInterval').value = this.settings.longBreakInterval;
        document.getElementById('autoStartBreaks').checked = this.settings.autoStartBreaks;
        document.getElementById('autoStartPomodoros').checked = this.settings.autoStartPomodoros;
        document.getElementById('enableNotifications').checked = this.settings.enableNotifications;

        // Set initial time
        this.timeRemaining = this.settings.pomodoroLength * 60;
    }

    async loadTodayStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await api.get(`${API_ENDPOINTS.pomodoro}?date=${today}`);

            const logs = response.logs || [];
            this.todayStats = {
                pomodoros: logs.filter(log => log.completed && log.duration >= 20).length,
                focusTime: logs.filter(log => log.completed).reduce((sum, log) => sum + log.duration, 0),
                breakTime: logs.reduce((sum, log) => sum + (log.break_duration || 0), 0)
            };
        } catch (error) {
            console.error('Failed to load today stats:', error);
        }
    }

    async loadRecentSessions() {
        try {
            const response = await api.get(`${API_ENDPOINTS.pomodoro}?limit=10`);
            this.renderRecentSessions(response.logs || []);
        } catch (error) {
            console.error('Failed to load recent sessions:', error);
            this.renderRecentSessions([]);
        }
    }

    setupEventListeners() {
        // Session type tabs
        const pomodoroTab = document.getElementById('pomodoroTab');
        const shortBreakTab = document.getElementById('shortBreakTab');
        const longBreakTab = document.getElementById('longBreakTab');

        if (pomodoroTab) {
            pomodoroTab.addEventListener('click', () => {
                this.switchSession('pomodoro');
            });
        }

        if (shortBreakTab) {
            shortBreakTab.addEventListener('click', () => {
                this.switchSession('shortBreak');
            });
        }

        if (longBreakTab) {
            longBreakTab.addEventListener('click', () => {
                this.switchSession('longBreak');
            });
        }

        // Timer controls
        const startPauseBtn = document.getElementById('startPauseBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (startPauseBtn) {
            startPauseBtn.addEventListener('click', () => {
                this.toggleTimer();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetTimer();
            });
        }

        // Settings inputs
        const settingsInputs = [
            'pomodoroLength', 'shortBreakLength', 'longBreakLength',
            'longBreakInterval', 'autoStartBreaks', 'autoStartPomodoros', 'enableNotifications'
        ];

        settingsInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', () => {
                    this.updateSettings();
                });
            }
        });

        // Task form
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTask();
            });
        }

        // Quick actions
        const viewStatsBtn = document.getElementById('viewStatsBtn');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const exportDataBtn = document.getElementById('exportDataBtn');
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');

        if (viewStatsBtn) {
            viewStatsBtn.addEventListener('click', () => {
                window.location.href = 'analytics.html';
            });
        }

        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                modalManager.open('taskModal');
            });
        }

        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearHistory();
            });
        }

        // Session complete modal
        const skipBreakBtn = document.getElementById('skipBreakBtn');
        const startBreakBtn = document.getElementById('startBreakBtn');

        if (skipBreakBtn) {
            skipBreakBtn.addEventListener('click', () => {
                this.skipBreak();
            });
        }

        if (startBreakBtn) {
            startBreakBtn.addEventListener('click', () => {
                this.startBreak();
            });
        }

        // Check for preset topic
        const presetTopic = storage.get('pomodoroTopic');
        if (presetTopic) {
            document.getElementById('currentTask').value = presetTopic;
            storage.remove('pomodoroTopic');
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.toggleTimer();
            }
        });

        // Page visibility change (pause when tab not active)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.pauseTime = Date.now();
            } else if (!document.hidden && this.pauseTime) {
                // Adjust for time passed while tab was hidden
                const timePassed = Math.floor((Date.now() - this.pauseTime) / 1000);
                this.timeRemaining = Math.max(0, this.timeRemaining - timePassed);
                this.updateDisplay();
                this.pauseTime = null;
            }
        });
    }

    switchSession(sessionType) {
        if (this.isRunning && !confirm('Are you sure you want to switch sessions? This will stop the current timer.')) {
            return;
        }

        this.stopTimer();
        this.currentSession = sessionType;

        // Update time remaining
        switch (sessionType) {
            case 'pomodoro':
                this.timeRemaining = this.settings.pomodoroLength * 60;
                break;
            case 'shortBreak':
                this.timeRemaining = this.settings.shortBreakLength * 60;
                break;
            case 'longBreak':
                this.timeRemaining = this.settings.longBreakLength * 60;
                break;
        }

        this.updateTabStyles();
        this.updateDisplay();
        this.updateProgress();
    }

    updateTabStyles() {
        const tabs = {
            pomodoro: document.getElementById('pomodoroTab'),
            shortBreak: document.getElementById('shortBreakTab'),
            longBreak: document.getElementById('longBreakTab')
        };

        Object.keys(tabs).forEach(key => {
            const tab = tabs[key];
            if (tab) {
                if (key === this.currentSession) {
                    tab.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm transition-all';
                } else {
                    tab.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all';
                }
            }
        });

        // Update timer circle color
        const progressCircle = document.getElementById('timerProgress');
        if (progressCircle) {
            const colors = {
                pomodoro: 'text-red-500',
                shortBreak: 'text-green-500',
                longBreak: 'text-blue-500'
            };

            progressCircle.className = `${colors[this.currentSession]} transition-all duration-1000 ease-linear`;
        }
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();

        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateDisplay();
            this.updateProgress();

            if (this.timeRemaining <= 0) {
                this.completeSession();
            }
        }, 1000);

        // Update UI
        this.updateStartPauseButton();

        // Send notification if tab is not visible
        if (document.hidden && this.settings.enableNotifications) {
            this.showNotification('Pomodoro Started', {
                body: `${this.getSessionName()} session started`,
                icon: '/assets/icons/pomodoro.png'
            });
        }
    }

    pauseTimer() {
        this.isRunning = false;
        this.isPaused = true;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.updateStartPauseButton();
    }

    stopTimer() {
        this.isRunning = false;
        this.isPaused = false;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.updateStartPauseButton();
    }

    resetTimer() {
        if (this.isRunning && !confirm('Are you sure you want to reset the timer?')) {
            return;
        }

        this.stopTimer();

        // Reset time to session length
        switch (this.currentSession) {
            case 'pomodoro':
                this.timeRemaining = this.settings.pomodoroLength * 60;
                break;
            case 'shortBreak':
                this.timeRemaining = this.settings.shortBreakLength * 60;
                break;
            case 'longBreak':
                this.timeRemaining = this.settings.longBreakLength * 60;
                break;
        }

        this.updateDisplay();
        this.updateProgress();
    }

    async completeSession() {
        this.stopTimer();

        const sessionData = {
            topic: document.getElementById('currentTask').value.trim() || 'Untitled Session',
            duration: this.getSessionDuration(),
            completed: true,
            started_at: new Date(this.startTime).toISOString(),
            ended_at: new Date().toISOString(),
            notes: ''
        };

        try {
            await api.post(API_ENDPOINTS.pomodoro, sessionData);

            // Update stats
            if (this.currentSession === 'pomodoro') {
                this.completedPomodoros++;
                this.todayStats.pomodoros++;
                this.todayStats.focusTime += sessionData.duration;
            } else {
                this.todayStats.breakTime += sessionData.duration;
            }

            this.renderTodayStats();
            await this.loadRecentSessions();

        } catch (error) {
            console.error('Failed to log session:', error);
        }

        // Show completion modal or auto-start next session
        if (this.currentSession === 'pomodoro') {
            this.showSessionComplete();
        } else {
            // Break completed, switch to pomodoro
            if (this.settings.autoStartPomodoros) {
                this.switchSession('pomodoro');
                setTimeout(() => this.startTimer(), 1000);
            } else {
                this.switchSession('pomodoro');
            }
        }

        // Show notification
        if (this.settings.enableNotifications) {
            this.showNotification('Session Complete!', {
                body: `${this.getSessionName()} session completed`,
                icon: '/assets/icons/complete.png'
            });

            // Play sound
            this.playNotificationSound();
        }
    }

    showSessionComplete() {
        const modal = document.getElementById('sessionCompleteModal');
        const title = document.getElementById('sessionCompleteTitle');
        const message = document.getElementById('sessionCompleteMessage');

        if (!modal || !title || !message) return;

        title.textContent = 'Pomodoro Complete!';

        // Determine next break type
        const isLongBreak = this.completedPomodoros % this.settings.longBreakInterval === 0;
        const nextBreak = isLongBreak ? 'long break' : 'short break';
        const breakDuration = isLongBreak ? this.settings.longBreakLength : this.settings.shortBreakLength;

        message.textContent = `Great work! Time for a ${breakDuration}-minute ${nextBreak}.`;

        modalManager.open('sessionCompleteModal');

        // Auto-start break if enabled
        if (this.settings.autoStartBreaks) {
            setTimeout(() => {
                this.startBreak();
            }, 3000);
        }
    }

    startBreak() {
        modalManager.close('sessionCompleteModal');

        // Determine break type
        const isLongBreak = this.completedPomodoros % this.settings.longBreakInterval === 0;
        this.switchSession(isLongBreak ? 'longBreak' : 'shortBreak');

        if (this.settings.autoStartBreaks) {
            setTimeout(() => this.startTimer(), 500);
        }
    }

    skipBreak() {
        modalManager.close('sessionCompleteModal');
        this.switchSession('pomodoro');
    }

    updateDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        const sessionType = document.getElementById('sessionType');
        const sessionCount = document.getElementById('sessionCount');

        if (timerDisplay) {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (sessionType) {
            sessionType.textContent = this.getSessionName();
        }

        if (sessionCount) {
            sessionCount.textContent = `Session ${this.sessionCount}`;
        }

        // Update page title
        if (this.isRunning) {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - ${this.getSessionName()}`;
        } else {
            document.title = 'Pomodoro Timer - DSA Learning';
        }
    }

    updateProgress() {
        const progressCircle = document.getElementById('timerProgress');
        if (!progressCircle) return;

        const totalTime = this.getSessionDuration() * 60;
        const elapsed = totalTime - this.timeRemaining;
        const percentage = (elapsed / totalTime) * 100;

        // SVG circle has circumference of 283 (2 * π * 45)
        const circumference = 283;
        const offset = circumference - (percentage / 100) * circumference;

        progressCircle.style.strokeDashoffset = offset;
    }

    updateStartPauseButton() {
        const startPauseBtn = document.getElementById('startPauseBtn');
        const playPauseIcon = document.getElementById('playPauseIcon');

        if (!startPauseBtn || !playPauseIcon) return;

        if (this.isRunning) {
            startPauseBtn.className = 'w-16 h-16 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg';
            playPauseIcon.className = 'bi bi-pause-fill text-2xl';
        } else {
            const color = this.getSessionColor();
            startPauseBtn.className = `w-16 h-16 ${color} text-white rounded-full flex items-center justify-center transition-colors shadow-lg`;
            playPauseIcon.className = 'bi bi-play-fill text-2xl';
        }
    }

    getSessionName() {
        const names = {
            pomodoro: 'Focus Time',
            shortBreak: 'Short Break',
            longBreak: 'Long Break'
        };
        return names[this.currentSession] || 'Focus Time';
    }

    getSessionDuration() {
        const durations = {
            pomodoro: this.settings.pomodoroLength,
            shortBreak: this.settings.shortBreakLength,
            longBreak: this.settings.longBreakLength
        };
        return durations[this.currentSession] || this.settings.pomodoroLength;
    }

    getSessionColor() {
        const colors = {
            pomodoro: 'bg-red-500 hover:bg-red-600',
            shortBreak: 'bg-green-500 hover:bg-green-600',
            longBreak: 'bg-blue-500 hover:bg-blue-600'
        };
        return colors[this.currentSession] || colors.pomodoro;
    }

    updateSettings() {
        // Get values from form
        this.settings.pomodoroLength = parseInt(document.getElementById('pomodoroLength').value);
        this.settings.shortBreakLength = parseInt(document.getElementById('shortBreakLength').value);
        this.settings.longBreakLength = parseInt(document.getElementById('longBreakLength').value);
        this.settings.longBreakInterval = parseInt(document.getElementById('longBreakInterval').value);
        this.settings.autoStartBreaks = document.getElementById('autoStartBreaks').checked;
        this.settings.autoStartPomodoros = document.getElementById('autoStartPomodoros').checked;
        this.settings.enableNotifications = document.getElementById('enableNotifications').checked;

        // Save to storage
        storage.set('pomodoroSettings', this.settings);

        // Update current timer if not running
        if (!this.isRunning) {
            switch (this.currentSession) {
                case 'pomodoro':
                    this.timeRemaining = this.settings.pomodoroLength * 60;
                    break;
                case 'shortBreak':
                    this.timeRemaining = this.settings.shortBreakLength * 60;
                    break;
                case 'longBreak':
                    this.timeRemaining = this.settings.longBreakLength * 60;
                    break;
            }
            this.updateDisplay();
            this.updateProgress();
        }

        notificationManager.success('Settings updated');
    }

    renderTodayStats() {
        const todayPomodoros = document.getElementById('todayPomodoros');
        const todayFocusTime = document.getElementById('todayFocusTime');
        const todayBreakTime = document.getElementById('todayBreakTime');
        const dailyGoalProgress = document.getElementById('dailyGoalProgress');

        if (todayPomodoros) {
            todayPomodoros.textContent = this.todayStats.pomodoros;
        }

        if (todayFocusTime) {
            todayFocusTime.textContent = `${this.todayStats.focusTime}m`;
        }

        if (todayBreakTime) {
            todayBreakTime.textContent = `${this.todayStats.breakTime}m`;
        }

        // Update daily goal progress
        const dailyGoal = 8; // pomodoros
        const progress = Math.min(100, (this.todayStats.pomodoros / dailyGoal) * 100);

        if (dailyGoalProgress) {
            dailyGoalProgress.style.width = `${progress}%`;
        }
    }

    renderRecentSessions(sessions) {
        const recentSessions = document.getElementById('recentSessions');
        const noSessions = document.getElementById('noSessions');

        if (!recentSessions) return;

        if (sessions.length === 0) {
            recentSessions.classList.add('hidden');
            if (noSessions) noSessions.classList.remove('hidden');
            return;
        }

        if (noSessions) noSessions.classList.add('hidden');
        recentSessions.classList.remove('hidden');

        recentSessions.innerHTML = sessions.map(session => `
            <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center ${session.completed
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }">
                        <i class="bi ${session.completed ? 'bi-check-circle' : 'bi-x-circle'}"></i>
                    </div>
                    
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900 dark:text-white">${session.topic || 'Untitled Session'}</h4>
                        <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span><i class="bi bi-clock mr-1"></i>${session.duration}m</span>
                            <span>${dateUtils.formatRelative(session.started_at)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="text-right">
                    <div class="text-sm font-medium ${session.completed ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            }">
                        ${session.completed ? 'Completed' : 'Incomplete'}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async addTask() {
        const taskTitle = document.getElementById('taskTitle').value.trim();
        const estimatedPomodoros = parseInt(document.getElementById('estimatedPomodoros').value);

        if (!taskTitle) {
            notificationManager.error('Please enter a task description');
            return;
        }

        // Set as current task
        document.getElementById('currentTask').value = taskTitle;

        modalManager.close('taskModal');
        document.getElementById('taskForm').reset();

        notificationManager.success('Task added successfully');
    }

    async clearHistory() {
        if (!confirm('Are you sure you want to clear all session history? This cannot be undone.')) {
            return;
        }

        try {
            // This would require a backend endpoint to clear history
            // For now, just clear local display
            this.renderRecentSessions([]);
            notificationManager.success('Session history cleared');
        } catch (error) {
            console.error('Failed to clear history:', error);
            notificationManager.error('Failed to clear history');
        }
    }

    exportData() {
        try {
            const data = {
                settings: this.settings,
                todayStats: this.todayStats,
                sessionCount: this.sessionCount,
                completedPomodoros: this.completedPomodoros,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `pomodoro-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            notificationManager.success('Pomodoro data exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            notificationManager.error('Failed to export data');
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                this.settings.enableNotifications = permission === 'granted';
                document.getElementById('enableNotifications').checked = this.settings.enableNotifications;
                storage.set('pomodoroSettings', this.settings);
            } catch (error) {
                console.error('Notification permission request failed:', error);
            }
        }
    }

    showNotification(title, options = {}) {
        if (!this.settings.enableNotifications || !('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/badge-72x72.png',
                ...options
            });
        }
    }

    playNotificationSound() {
        const audio = document.getElementById('notificationSound');
        if (audio) {
            audio.play().catch(e => console.log('Could not play notification sound:', e));
        }
    }
}

// Initialize pomodoro manager when on pomodoro page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('pomodoro')) {
        window.pomodoroManager = new PomodoroManager();
    }
});