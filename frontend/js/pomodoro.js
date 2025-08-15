// pomodoro.js - Pomodoro timer functionality

let pomodoroState = {
    isRunning: false,
    isPaused: false,
    currentSession: 'focus',
    sessionCount: 1,
    timeRemaining: 25 * 60, // 25 minutes in seconds
    totalFocusTime: 0,
    todaySessions: 0,
    currentTask: '',
    startTime: null,
    settings: {
        focusDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        sessionsUntilLong: 4,
        autoStart: true,
        soundEnabled: true
    }
};

let timerInterval = null;
let notificationSound = new Audio('/assets/sounds/notification.mp3');

// Initialize pomodoro
document.addEventListener('DOMContentLoaded', async () => {
    loadPomodoroSettings();
    await loadPomodoroStats();
    setupEventListeners();
    updateDisplay();
    loadTodaySessions();
});

// Load settings from localStorage
function loadPomodoroSettings() {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
        pomodoroState.settings = { ...pomodoroState.settings, ...JSON.parse(savedSettings) };
    }

    // Apply settings to form
    document.getElementById('focusDuration').value = pomodoroState.settings.focusDuration;
    document.getElementById('shortBreak').value = pomodoroState.settings.shortBreak;
    document.getElementById('longBreak').value = pomodoroState.settings.longBreak;
    document.getElementById('sessionsUntilLong').value = pomodoroState.settings.sessionsUntilLong;
    document.getElementById('autoStart').checked = pomodoroState.settings.autoStart;
    document.getElementById('soundEnabled').checked = pomodoroState.settings.soundEnabled;
}

// Load pomodoro statistics
async function loadPomodoroStats() {
    try {
        const response = await window.API.getPomodoroLogs(10);
        const { logs, statistics } = response.data;

        // Update statistics display
        document.getElementById('totalFocus').textContent = window.DSAApp.formatTime(statistics.total_minutes);
        document.getElementById('todaySessions').textContent = logs.filter(log =>
            new Date(log.started_at).toDateString() === new Date().toDateString()
        ).length;

        pomodoroState.todaySessions = parseInt(document.getElementById('todaySessions').textContent);

    } catch (error) {
        console.error('Failed to load pomodoro stats:', error);
    }
}

// Start timer
window.startTimer = function () {
    if (!pomodoroState.isRunning) {
        pomodoroState.isRunning = true;
        pomodoroState.isPaused = false;
        pomodoroState.startTime = new Date();

        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        document.querySelector('.timer-display').classList.add('timer-active');

        // Get current task
        pomodoroState.currentTask = document.getElementById('currentTask').value || 'Focus Session';

        timerInterval = setInterval(updateTimer, 1000);

        // Show notification
        showNotification('Timer Started', `${pomodoroState.currentTask} - ${pomodoroState.currentSession} session`);
    }
};

// Pause timer
window.pauseTimer = function () {
    if (pomodoroState.isRunning && !pomodoroState.isPaused) {
        pomodoroState.isPaused = true;
        clearInterval(timerInterval);

        document.getElementById('pauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        document.querySelector('.timer-display').classList.remove('timer-active');
    } else if (pomodoroState.isPaused) {
        pomodoroState.isPaused = false;
        timerInterval = setInterval(updateTimer, 1000);

        document.getElementById('pauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        document.querySelector('.timer-display').classList.add('timer-active');
    }
};

// Reset timer
window.resetTimer = function () {
    clearInterval(timerInterval);

    pomodoroState.isRunning = false;
    pomodoroState.isPaused = false;
    pomodoroState.timeRemaining = pomodoroState.settings.focusDuration * 60;
    pomodoroState.currentSession = 'focus';

    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.querySelector('.timer-display').classList.remove('timer-active');

    updateDisplay();
};

// Skip to next session
window.skipSession = function () {
    if (confirm('Skip to the next session?')) {
        completeSession(false);
    }
};

// Update timer
function updateTimer() {
    pomodoroState.timeRemaining--;

    if (pomodoroState.timeRemaining <= 0) {
        completeSession(true);
    } else {
        updateDisplay();
    }
}

// Complete session
async function completeSession(wasCompleted) {
    clearInterval(timerInterval);

    // Play notification sound
    if (pomodoroState.settings.soundEnabled) {
        notificationSound.play();
    }

    // Log session if it was a focus session
    if (pomodoroState.currentSession === 'focus' && wasCompleted) {
        await logPomodoroSession();
        pomodoroState.todaySessions++;
        document.getElementById('todaySessions').textContent = pomodoroState.todaySessions;
    }

    // Determine next session type
    if (pomodoroState.currentSession === 'focus') {
        pomodoroState.totalFocusTime += pomodoroState.settings.focusDuration;
        document.getElementById('totalFocus').textContent = window.DSAApp.formatTime(pomodoroState.totalFocusTime);

        if (pomodoroState.sessionCount % pomodoroState.settings.sessionsUntilLong === 0) {
            pomodoroState.currentSession = 'longBreak';
            pomodoroState.timeRemaining = pomodoroState.settings.longBreak * 60;
        } else {
            pomodoroState.currentSession = 'shortBreak';
            pomodoroState.timeRemaining = pomodoroState.settings.shortBreak * 60;
        }

        pomodoroState.sessionCount++;
    } else {
        pomodoroState.currentSession = 'focus';
        pomodoroState.timeRemaining = pomodoroState.settings.focusDuration * 60;
    }

    // Update display
    updateDisplay();

    // Show notification
    const sessionType = pomodoroState.currentSession === 'focus' ? 'Focus Time' :
        pomodoroState.currentSession === 'shortBreak' ? 'Short Break' : 'Long Break';
    showNotification('Session Complete!', `Time for ${sessionType}`);

    // Auto-start next session if enabled
    if (pomodoroState.settings.autoStart) {
        setTimeout(() => {
            startTimer();
        }, 3000);
    } else {
        pomodoroState.isRunning = false;
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
        document.querySelector('.timer-display').classList.remove('timer-active');
    }
}

// Log pomodoro session
async function logPomodoroSession() {
    try {
        const sessionData = {
            topic: pomodoroState.currentTask,
            duration: pomodoroState.settings.focusDuration,
            completed: true,
            started_at: pomodoroState.startTime.toISOString(),
            ended_at: new Date().toISOString(),
            break_duration: 0,
            notes: ''
        };

        await window.API.logPomodoro(sessionData);

        // Update today's sessions display
        await loadTodaySessions();

    } catch (error) {
        console.error('Failed to log pomodoro session:', error);
    }
}

// Update display
function updateDisplay() {
    const minutes = Math.floor(pomodoroState.timeRemaining / 60);
    const seconds = pomodoroState.timeRemaining % 60;

    document.getElementById('timerDisplay').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update session type display
    const sessionType = pomodoroState.currentSession === 'focus' ? 'Focus Time' :
        pomodoroState.currentSession === 'shortBreak' ? 'Short Break' : 'Long Break';
    document.getElementById('sessionType').textContent = sessionType;

    // Update session count
    document.getElementById('sessionCount').textContent =
        `${Math.min(pomodoroState.sessionCount, pomodoroState.settings.sessionsUntilLong)} / ${pomodoroState.settings.sessionsUntilLong}`;

    // Update progress circle
    updateProgressCircle();
}

// Update progress circle
function updateProgressCircle() {
    const circle = document.getElementById('timerProgress');
    const totalTime = pomodoroState.currentSession === 'focus' ?
        pomodoroState.settings.focusDuration * 60 :
        pomodoroState.currentSession === 'shortBreak' ?
            pomodoroState.settings.shortBreak * 60 :
            pomodoroState.settings.longBreak * 60;

    const progress = (totalTime - pomodoroState.timeRemaining) / totalTime;
    const offset = 880 - (880 * progress);

    circle.style.strokeDashoffset = offset;
}

// Set task
window.setTask = function (task) {
    document.getElementById('currentTask').value = task;
    pomodoroState.currentTask = task;
};

// Update task
window.updateTask = function () {
    pomodoroState.currentTask = document.getElementById('currentTask').value;
    window.DSAApp.showToast('Task updated', 'success');
};

// Save settings
window.saveSettings = function () {
    pomodoroState.settings = {
        focusDuration: parseInt(document.getElementById('focusDuration').value),
        shortBreak: parseInt(document.getElementById('shortBreak').value),
        longBreak: parseInt(document.getElementById('longBreak').value),
        sessionsUntilLong: parseInt(document.getElementById('sessionsUntilLong').value),
        autoStart: document.getElementById('autoStart').checked,
        soundEnabled: document.getElementById('soundEnabled').checked
    };

    localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroState.settings));

    // Reset timer with new settings
    if (!pomodoroState.isRunning) {
        pomodoroState.timeRemaining = pomodoroState.settings.focusDuration * 60;
        updateDisplay();
    }

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();

    window.DSAApp.showToast('Settings saved', 'success');
};

// Load today's sessions
async function loadTodaySessions() {
    try {
        const response = await window.API.getPomodoroLogs(50);
        const todayLogs = response.data.logs.filter(log =>
            new Date(log.started_at).toDateString() === new Date().toDateString()
        );

        const sessionList = document.querySelector('.session-list');
        if (!sessionList) return;

        if (todayLogs.length === 0) {
            sessionList.innerHTML = '<p class="text-muted text-center">No sessions yet today</p>';
            return;
        }

        sessionList.innerHTML = todayLogs.map(log => `
            <div class="session-item d-flex align-items-center mb-3 p-3 bg-light rounded-3">
                <div class="session-time me-3">
                    <i class="fas fa-clock text-primary"></i>
                    <span class="ms-2">${formatSessionTime(log.started_at, log.ended_at)}</span>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0">${log.topic || 'Focus Session'}</h6>
                    <small class="text-muted">${log.duration} minutes focused</small>
                </div>
                <div class="session-status">
                    <span class="badge bg-${log.completed ? 'success' : 'warning'}">
                        ${log.completed ? 'Completed' : 'Interrupted'}
                    </span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Failed to load today\'s sessions:', error);
    }
}

// Show notification
function showNotification(title, message) {
    // Browser notification
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/assets/images/logo.svg',
            badge: '/assets/images/badge.svg'
        });
    }

    // In-app toast
    window.DSAApp.showToast(message, 'info');
}

// Format session time
function formatSessionTime(startTime, endTime) {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();

    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
            ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    pomodoroState.isRunning ? pauseTimer() : startTimer();
                    break;
                case 'r':
                    e.preventDefault();
                    resetTimer();
                    break;
                case 's':
                    e.preventDefault();
                    skipSession();
                    break;
            }
        }
    });

    // Request notification permission
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Update stats every minute
    setInterval(() => {
        if (pomodoroState.isRunning) {
            updateStats();
        }
    }, 60000);
}

// Update statistics
async function updateStats() {
    // Update this week stats
    try {
        const response = await window.API.getPomodoroLogs(200);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const weekLogs = response.data.logs.filter(log =>
            new Date(log.started_at) >= weekStart && log.completed
        );

        const totalSessions = weekLogs.length;
        const totalMinutes = weekLogs.reduce((sum, log) => sum + log.duration, 0);
        const dailyAverage = Math.round(totalSessions / 7);
        const completionRate = Math.round((weekLogs.filter(l => l.completed).length / weekLogs.length) * 100) || 0;

        document.querySelector('.stat-item:nth-child(1) .fw-bold').textContent = totalSessions;
        document.querySelector('.stat-item:nth-child(2) .fw-bold').textContent = window.DSAApp.formatTime(totalMinutes);
        document.querySelector('.stat-item:nth-child(3) .fw-bold').textContent = `${dailyAverage} sessions`;
        document.querySelector('.stat-item:nth-child(4) .fw-bold').textContent = `${completionRate}%`;

    } catch (error) {
        console.error('Failed to update stats:', error);
    }
}