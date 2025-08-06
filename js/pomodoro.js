// Pomodoro Timer Module
const Pomodoro = {
    timer: null,
    minutes: 25,
    seconds: 0,
    isRunning: false,
    isPaused: false,
    sessionType: 'work', // 'work' or 'break'
    completedSessions: 0,
    settings: {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        sessionsUntilLongBreak: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        soundEnabled: true,
        notificationEnabled: true
    },

    // Initialize pomodoro timer
    init: function () {
        this.loadSettings();
        this.updateDisplay();
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners: function () {
        // Session length input
        const sessionLengthInput = document.getElementById('sessionLength');
        if (sessionLengthInput) {
            sessionLengthInput.addEventListener('change', (e) => {
                this.settings.workDuration = parseInt(e.target.value);
                if (!this.isRunning) {
                    this.reset();
                }
                this.saveSettings();
            });
        }

        // Control buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.timer-btn.start')) {
                this.start();
            } else if (e.target.closest('.timer-btn.pause')) {
                this.pause();
            } else if (e.target.closest('.timer-btn.reset')) {
                this.reset();
            }
        });
    },

    // Start timer
    start: function () {
        if (this.isRunning && !this.isPaused) return;

        if (this.isPaused) {
            this.isPaused = false;
        } else {
            this.isRunning = true;
        }

        this.timer = setInterval(() => this.tick(), 1000);

        Utils.showToast(
            this.sessionType === 'work' ?
                'Timer started! Stay focused! 🎯' :
                'Break time! Relax and recharge! 😌',
            'success'
        );

        this.updateButtonStates();
    },

    // Pause timer
    pause: function () {
        if (!this.isRunning) return;

        this.isPaused = true;
        clearInterval(this.timer);

        Utils.showToast('Timer paused.', 'info');
        this.updateButtonStates();
    },

    // Reset timer
    reset: function () {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.timer);

        if (this.sessionType === 'work') {
            this.minutes = this.settings.workDuration;
        } else if (this.sessionType === 'shortBreak') {
            this.minutes = this.settings.shortBreak;
        } else {
            this.minutes = this.settings.longBreak;
        }

        this.seconds = 0;
        this.updateDisplay();
        this.updateButtonStates();

        Utils.showToast('Timer reset.', 'info');
    },

    // Timer tick
    tick: function () {
        if (this.seconds === 0) {
            if (this.minutes === 0) {
                this.complete();
                return;
            }
            this.minutes--;
            this.seconds = 59;
        } else {
            this.seconds--;
        }

        this.updateDisplay();
        this.updateTitle();
    },

    // Timer completed
    complete: function () {
        clearInterval(this.timer);
        this.isRunning = false;

        if (this.sessionType === 'work') {
            this.completedSessions++;
            this.logSession();

            // Determine break type
            if (this.completedSessions % this.settings.sessionsUntilLongBreak === 0) {
                this.sessionType = 'longBreak';
            } else {
                this.sessionType = 'shortBreak';
            }

            Utils.showToast('Work session completed! Time for a break! 🎉', 'success');
        } else {
            this.sessionType = 'work';
            Utils.showToast('Break completed! Ready to focus? 💪', 'success');
        }

        // Play sound
        if (this.settings.soundEnabled) {
            this.playCompletionSound();
        }

        // Show notification
        if (this.settings.notificationEnabled) {
            this.showNotification();
        }

        // Auto-start next session
        if ((this.sessionType === 'work' && this.settings.autoStartWork) ||
            (this.sessionType !== 'work' && this.settings.autoStartBreaks)) {
            setTimeout(() => {
                this.reset();
                this.start();
            }, 3000);
        } else {
            this.reset();
        }

        this.updateSessionInfo();
    },

    // Update display
    updateDisplay: function () {
        const display = document.getElementById('timerDisplay');
        if (!display) return;

        const minutes = this.minutes.toString().padStart(2, '0');
        const seconds = this.seconds.toString().padStart(2, '0');
        display.textContent = `${minutes}:${seconds}`;

        // Update session type indicator
        const sessionInfo = document.querySelector('.pomodoro-container h3');
        if (sessionInfo) {
            const sessionTexts = {
                'work': 'Work Session',
                'shortBreak': 'Short Break',
                'longBreak': 'Long Break'
            };
            sessionInfo.textContent = sessionTexts[this.sessionType] || 'Study Session';
        }
    },

    // Update page title with timer
    updateTitle: function () {
        if (this.isRunning) {
            const minutes = this.minutes.toString().padStart(2, '0');
            const seconds = this.seconds.toString().padStart(2, '0');
            document.title = `${minutes}:${seconds} - DSA Learning Dashboard`;
        } else {
            document.title = 'DSA Learning Dashboard';
        }
    },

    // Update button states
    updateButtonStates: function () {
        const startBtn = document.querySelector('.timer-btn.start');
        const pauseBtn = document.querySelector('.timer-btn.pause');
        const resetBtn = document.querySelector('.timer-btn.reset');

        if (startBtn) {
            startBtn.disabled = this.isRunning && !this.isPaused;
            startBtn.innerHTML = this.isPaused ?
                '<i class="fas fa-play"></i> Resume' :
                '<i class="fas fa-play"></i> Start';
        }

        if (pauseBtn) {
            pauseBtn.disabled = !this.isRunning || this.isPaused;
        }

        if (resetBtn) {
            resetBtn.disabled = false;
        }
    },

    // Update session info
    updateSessionInfo: function () {
        const infoContainer = document.querySelector('.pomodoro-container');
        if (!infoContainer) return;

        let sessionInfo = document.getElementById('pomodoroSessionInfo');
        if (!sessionInfo) {
            sessionInfo = document.createElement('div');
            sessionInfo.id = 'pomodoroSessionInfo';
            sessionInfo.className = 'mt-4 text-center';
            infoContainer.appendChild(sessionInfo);
        }

        sessionInfo.innerHTML = `
            <p class="mb-2">
                <strong>Completed Sessions:</strong> ${this.completedSessions}
            </p>
            <p class="mb-0">
                <small class="text-muted">
                    ${this.settings.sessionsUntilLongBreak - (this.completedSessions % this.settings.sessionsUntilLongBreak)} 
                    sessions until long break
                </small>
            </p>
        `;
    },

    // Play completion sound
    playCompletionSound: function () {
        Utils.playNotificationSound(800, 200);
        setTimeout(() => Utils.playNotificationSound(1000, 200), 250);
        setTimeout(() => Utils.playNotificationSound(1200, 200), 500);
    },

    // Show browser notification
    showNotification: function () {
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = this.sessionType === 'work' ?
                'Work session completed!' :
                'Break time is over!';

            const body = this.sessionType === 'work' ?
                'Time to take a break and relax.' :
                'Ready to get back to work?';

            new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        }
    },

    // Log completed session
    logSession: function () {
        const sessionLog = {
            date: new Date().toISOString(),
            duration: this.settings.workDuration,
            type: 'pomodoro'
        };

        // Save to local storage
        const logs = Utils.storage.get('pomodoroLogs') || [];
        logs.push(sessionLog);
        Utils.storage.set('pomodoroLogs', logs);

        // Update study hours if app is initialized
        if (window.app && window.app.userProgress) {
            window.app.userProgress.totalHours += this.settings.workDuration / 60;
            window.app.saveProgress();
            Progress.updateStatistics(window.app.userProgress);
        }
    },

    // Load settings
    loadSettings: function () {
        const saved = Utils.storage.get('pomodoroSettings');
        if (saved) {
            this.settings = { ...this.settings, ...saved };

            // Update input
            const sessionLengthInput = document.getElementById('sessionLength');
            if (sessionLengthInput) {
                sessionLengthInput.value = this.settings.workDuration;
            }
        }

        // Request notification permission
        if (this.settings.notificationEnabled) {
            Utils.requestNotificationPermission();
        }
    },

    // Save settings
    saveSettings: function () {
        Utils.storage.set('pomodoroSettings', this.settings);
    },

    // Get statistics
    getStatistics: function () {
        const logs = Utils.storage.get('pomodoroLogs') || [];
        const today = new Date().toISOString().split('T')[0];
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
        const thisWeekStr = thisWeek.toISOString().split('T')[0];

        const stats = {
            totalSessions: logs.length,
            todaySessions: logs.filter(log => log.date.startsWith(today)).length,
            weekSessions: logs.filter(log => log.date >= thisWeekStr).length,
            totalMinutes: logs.reduce((sum, log) => sum + log.duration, 0),
            averageSessionsPerDay: 0
        };

        // Calculate average
        if (logs.length > 0) {
            const firstLog = new Date(logs[0].date);
            const daysSince = Math.ceil((new Date() - firstLog) / (1000 * 60 * 60 * 24));
            stats.averageSessionsPerDay = (stats.totalSessions / daysSince).toFixed(1);
        }

        return stats;
    },

    // Show settings modal
    showSettings: function () {
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Pomodoro Settings</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Work Duration (minutes)</label>
                            <input type="number" class="form-control" id="workDuration" 
                                value="${this.settings.workDuration}" min="1" max="60">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Short Break (minutes)</label>
                            <input type="number" class="form-control" id="shortBreak" 
                                value="${this.settings.shortBreak}" min="1" max="30">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Long Break (minutes)</label>
                            <input type="number" class="form-control" id="longBreak" 
                                value="${this.settings.longBreak}" min="1" max="60">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Sessions Until Long Break</label>
                            <input type="number" class="form-control" id="sessionsUntilLongBreak" 
                                value="${this.settings.sessionsUntilLongBreak}" min="2" max="10">
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="autoStartBreaks" 
                                ${this.settings.autoStartBreaks ? 'checked' : ''}>
                            <label class="form-check-label" for="autoStartBreaks">
                                Auto-start breaks
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="autoStartWork" 
                                ${this.settings.autoStartWork ? 'checked' : ''}>
                            <label class="form-check-label" for="autoStartWork">
                                Auto-start work sessions
                            </label>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="soundEnabled" 
                                ${this.settings.soundEnabled ? 'checked' : ''}>
                            <label class="form-check-label" for="soundEnabled">
                                Sound notifications
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="notificationEnabled" 
                                ${this.settings.notificationEnabled ? 'checked' : ''}>
                            <label class="form-check-label" for="notificationEnabled">
                                Browser notifications
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-primary" onclick="Pomodoro.saveSettingsFromModal(this)">
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // Save settings from modal
    saveSettingsFromModal: function (button) {
        const modal = button.closest('.modal');

        this.settings.workDuration = parseInt(modal.querySelector('#workDuration').value);
        this.settings.shortBreak = parseInt(modal.querySelector('#shortBreak').value);
        this.settings.longBreak = parseInt(modal.querySelector('#longBreak').value);
        this.settings.sessionsUntilLongBreak = parseInt(modal.querySelector('#sessionsUntilLongBreak').value);
        this.settings.autoStartBreaks = modal.querySelector('#autoStartBreaks').checked;
        this.settings.autoStartWork = modal.querySelector('#autoStartWork').checked;
        this.settings.soundEnabled = modal.querySelector('#soundEnabled').checked;
        this.settings.notificationEnabled = modal.querySelector('#notificationEnabled').checked;

        this.saveSettings();

        // Update session length input
        const sessionLengthInput = document.getElementById('sessionLength');
        if (sessionLengthInput) {
            sessionLengthInput.value = this.settings.workDuration;
        }

        // Reset timer if not running
        if (!this.isRunning) {
            this.reset();
        }

        // Request notification permission if enabled
        if (this.settings.notificationEnabled) {
            Utils.requestNotificationPermission();
        }

        modal.remove();
        Utils.showToast('Settings saved!', 'success');
    }
};

// Export Pomodoro module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Pomodoro;
}