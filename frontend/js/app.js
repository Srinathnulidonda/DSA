// Main application controller and view management

class ViewManager {
    static currentView = 'dashboard';
    static viewInitializers = {};

    static init() {
        this.setupViewInitializers();
        this.showView('dashboard');
    }

    static setupViewInitializers() {
        this.viewInitializers = {
            dashboard: () => DashboardManager.loadDashboardData(),
            roadmap: () => RoadmapManager.loadRoadmap(),
            calendar: () => CalendarManager.init(),
            progress: () => ProgressManager.loadProgress(),
            pomodoro: () => PomodoroManager.init(),
            notes: () => NotesManager.loadNotes(),
            analytics: () => AnalyticsManager.loadAnalytics(),
            profile: () => ProfileManager.loadProfile(),
            settings: () => SettingsManager.loadSettings()
        };
    }

    static async showView(viewName) {
        if (this.currentView === viewName) return;

        // Hide all views
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.add('d-none');
        });

        // Show target view
        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.remove('d-none');
            AnimationUtils.fadeIn(targetView);

            // Initialize view if needed
            if (this.viewInitializers[viewName]) {
                try {
                    await this.viewInitializers[viewName]();
                } catch (error) {
                    console.error(`Failed to initialize ${viewName} view:`, error);
                }
            }

            this.currentView = viewName;
        }
    }
}

// Pomodoro Timer Management
class PomodoroManager {
    static timer = null;
    static isRunning = false;
    static isPaused = false;
    static currentSession = 'focus';
    static timeLeft = 25 * 60; // 25 minutes in seconds
    static sessions = 0;

    static init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.loadTodaySessions();
        this.loadRecentSessions();
    }

    static setupEventListeners() {
        // Timer settings changes
        ['focusTime', 'shortBreak', 'longBreak'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    if (!this.isRunning) {
                        this.resetTimer();
                    }
                });
            }
        });
    }

    static toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    static startTimer() {
        const topic = document.getElementById('studyTopic')?.value || 'General Study';

        this.isRunning = true;
        this.isPaused = false;

        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.updateProgress();

            if (this.timeLeft <= 0) {
                this.completeSession(topic);
            }
        }, 1000);

        this.updateControls();

        if (!this.isPaused) {
            ToastManager.info(`${this.currentSession === 'focus' ? 'Focus' : 'Break'} session started!`);
        }
    }

    static pauseTimer() {
        this.isRunning = false;
        this.isPaused = true;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.updateControls();
        ToastManager.info('Timer paused');
    }

    static resetTimer() {
        this.isRunning = false;
        this.isPaused = false;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        // Reset time based on current session
        const focusTime = parseInt(document.getElementById('focusTime')?.value || 25);
        const shortBreak = parseInt(document.getElementById('shortBreak')?.value || 5);
        const longBreak = parseInt(document.getElementById('longBreak')?.value || 15);

        switch (this.currentSession) {
            case 'focus':
                this.timeLeft = focusTime * 60;
                break;
            case 'shortBreak':
                this.timeLeft = shortBreak * 60;
                break;
            case 'longBreak':
                this.timeLeft = longBreak * 60;
                break;
        }

        this.updateDisplay();
        this.updateProgress();
        this.updateControls();
    }

    static async completeSession(topic) {
        const wasBreak = this.currentSession !== 'focus';
        const duration = this.getDuration();

        // Log the session
        await this.logSession(topic, duration, !wasBreak);

        // Play notification sound (if enabled)
        this.playNotificationSound();

        // Show completion notification
        ToastManager.success(`${wasBreak ? 'Break' : 'Focus session'} completed!`);

        // Auto-start next session or reset
        if (!wasBreak) {
            this.sessions++;

            // Determine next session type
            if (this.sessions % 4 === 0) {
                this.currentSession = 'longBreak';
            } else {
                this.currentSession = 'shortBreak';
            }
        } else {
            this.currentSession = 'focus';
        }

        this.resetTimer();
        this.updateSessionLabel();

        // Ask user if they want to continue
        if (confirm(`${wasBreak ? 'Break' : 'Focus session'} completed! Start ${this.currentSession === 'focus' ? 'focus' : 'break'} session?`)) {
            setTimeout(() => this.startTimer(), 1000);
        }
    }

    static getDuration() {
        const focusTime = parseInt(document.getElementById('focusTime')?.value || 25);
        const shortBreak = parseInt(document.getElementById('shortBreak')?.value || 5);
        const longBreak = parseInt(document.getElementById('longBreak')?.value || 15);

        switch (this.currentSession) {
            case 'focus': return focusTime;
            case 'shortBreak': return shortBreak;
            case 'longBreak': return longBreak;
            default: return focusTime;
        }
    }

    static updateDisplay() {
        const display = document.getElementById('timerDisplay');
        if (display) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    static updateProgress() {
        const progressCircle = document.getElementById('timerProgress');
        if (progressCircle) {
            const totalTime = this.getDuration() * 60;
            const progress = (totalTime - this.timeLeft) / totalTime;
            const circumference = 2 * Math.PI * 45; // radius is 45
            const offset = circumference - (progress * circumference);
            progressCircle.style.strokeDashoffset = offset;
        }
    }

    static updateControls() {
        const startPauseBtn = document.getElementById('startPauseBtn');
        if (startPauseBtn) {
            if (this.isRunning) {
                startPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
                startPauseBtn.className = 'btn btn-warning btn-lg me-2';
            } else {
                startPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
                startPauseBtn.className = 'btn btn-primary btn-lg me-2';
            }
        }
    }

    static updateSessionLabel() {
        const label = document.getElementById('timerLabel');
        if (label) {
            switch (this.currentSession) {
                case 'focus':
                    label.textContent = 'Focus Time';
                    break;
                case 'shortBreak':
                    label.textContent = 'Short Break';
                    break;
                case 'longBreak':
                    label.textContent = 'Long Break';
                    break;
            }
        }
    }

    static async logSession(topic, duration, completed) {
        try {
            const sessionData = {
                topic: topic,
                duration: duration,
                completed: completed,
                started_at: new Date(Date.now() - (duration * 60 * 1000)).toISOString(),
                ended_at: new Date().toISOString()
            };

            await APIClient.post('/pomodoro', sessionData);

            // Refresh session displays
            this.loadTodaySessions();
            this.loadRecentSessions();

        } catch (error) {
            console.error('Failed to log pomodoro session:', error);
        }
    }

    static async loadTodaySessions() {
        try {
            const data = await APIClient.get('/pomodoro?limit=20');
            if (data?.logs) {
                const today = new Date().toDateString();
                const todaySessions = data.logs.filter(log =>
                    new Date(log.started_at).toDateString() === today
                );

                this.displayTodaySessions(todaySessions);
            }
        } catch (error) {
            console.error('Failed to load today sessions:', error);
        }
    }

    static displayTodaySessions(sessions) {
        const container = document.getElementById('todaySessions');
        if (!container) return;

        if (sessions.length === 0) {
            container.innerHTML = '<p class="text-muted">No sessions today</p>';
            return;
        }

        const totalTime = sessions.reduce((sum, session) => sum + session.duration, 0);
        const completedSessions = sessions.filter(s => s.completed).length;

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <div class="fw-bold">${completedSessions} Sessions</div>
                    <small class="text-muted">${DateUtils.formatDuration(totalTime)} total</small>
                </div>
                <div class="text-end">
                    <div class="fw-bold">${Math.round((completedSessions / sessions.length) * 100)}%</div>
                    <small class="text-muted">Completion</small>
                </div>
            </div>
            <div class="progress mb-2" style="height: 6px;">
                <div class="progress-bar bg-success" style="width: ${(completedSessions / sessions.length) * 100}%"></div>
            </div>
        `;
    }

    static async loadRecentSessions() {
        try {
            const data = await APIClient.get('/pomodoro?limit=5');
            if (data?.logs) {
                this.displayRecentSessions(data.logs);
            }
        } catch (error) {
            console.error('Failed to load recent sessions:', error);
        }
    }

    static displayRecentSessions(sessions) {
        const container = document.getElementById('recentSessions');
        if (!container) return;

        if (sessions.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent sessions</p>';
            return;
        }

        const sessionsHtml = sessions.map(session => `
            <div class="d-flex align-items-center mb-2">
                <div class="tw-w-3 tw-h-3 tw-rounded-full me-2 ${session.completed ? 'tw-bg-green-500' : 'tw-bg-red-500'}"></div>
                <div class="flex-grow-1">
                    <div class="small fw-medium">${session.topic || 'Study Session'}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">
                        ${session.duration}m • ${DateUtils.formatDate(session.started_at, 'relative')}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = sessionsHtml;
    }

    static playNotificationSound() {
        // Play a simple notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    }
}

// Notes Management
class NotesManager {
    static notes = [];
    static currentNote = null;
    static noteModal = null;

    static init() {
        this.noteModal = new bootstrap.Modal(document.getElementById('noteModal'));
        this.setupEventListeners();
    }

    static setupEventListeners() {
        document.getElementById('noteForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNote();
        });
    }

    static async loadNotes() {
        try {
            LoadingManager.show('notesGrid', 'Loading notes...');

            const data = await APIClient.get('/notes');
            if (data?.notes) {
                this.notes = data.notes;
                this.renderNotes();
                this.populateFilters();
            }
        } catch (error) {
            console.error('Failed to load notes:', error);
            ToastManager.error('Failed to load notes');
        }
    }

    static renderNotes(filteredNotes = null) {
        const container = document.getElementById('notesGrid');
        if (!container) return;

        const notes = filteredNotes || this.notes;

        if (notes.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-journal-x text-muted" style="font-size: 3rem;"></i>
                        <h5 class="text-muted mt-3">No notes found</h5>
                        <p class="text-muted">Start by creating your first note!</p>
                        <button class="btn btn-primary" onclick="createNote()">
                            <i class="bi bi-plus me-2"></i>Create Note
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        const notesHtml = notes.map(note => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="glass-card note-card h-100 ${note.is_pinned ? 'note-pinned' : ''}" 
                     onclick="editNote('${note.id}')">
                    <div class="card-body">
                        <h6 class="card-title fw-bold">${this.escapeHtml(note.title)}</h6>
                        <p class="card-text text-muted small">
                            ${this.escapeHtml(note.content.substring(0, 100))}${note.content.length > 100 ? '...' : ''}
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                ${note.topic ? `<span class="badge bg-primary">${note.topic}</span>` : ''}
                                ${note.week ? `<span class="badge bg-secondary">Week ${note.week}</span>` : ''}
                            </div>
                            <small class="text-muted">${DateUtils.formatDate(note.updated_at, 'relative')}</small>
                        </div>
                        ${note.tags && note.tags.length > 0 ? `
                            <div class="mt-2">
                                ${note.tags.map(tag => `<span class="badge bg-light text-dark me-1">#${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = notesHtml;
    }

    static populateFilters() {
        // Populate topic filter
        const topicFilter = document.getElementById('notesTopicFilter');
        if (topicFilter) {
            const topics = [...new Set(this.notes.map(note => note.topic).filter(Boolean))];
            topicFilter.innerHTML = '<option value="">All Topics</option>' +
                topics.map(topic => `<option value="${topic}">${topic}</option>`).join('');
        }

        // Populate week filter
        const weekFilter = document.getElementById('notesWeekFilter');
        if (weekFilter) {
            const weeks = [...new Set(this.notes.map(note => note.week).filter(Boolean))].sort((a, b) => a - b);
            weekFilter.innerHTML = '<option value="">All Weeks</option>' +
                weeks.map(week => `<option value="${week}">Week ${week}</option>`).join('');
        }
    }

    static filterNotes(searchTerm) {
        const filteredNotes = this.notes.filter(note =>
            note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
        );
        this.renderNotes(filteredNotes);
    }

    static filterByTopic(topic) {
        const filteredNotes = topic ? this.notes.filter(note => note.topic === topic) : this.notes;
        this.renderNotes(filteredNotes);
    }

    static filterByWeek(week) {
        const filteredNotes = week ? this.notes.filter(note => note.week === parseInt(week)) : this.notes;
        this.renderNotes(filteredNotes);
    }

    static createNote() {
        this.currentNote = null;
        this.clearNoteForm();
        document.getElementById('noteModalTitle').textContent = 'New Note';
        document.getElementById('deleteNoteBtn').style.display = 'none';
        this.noteModal.show();
    }

    static editNote(noteId) {
        this.currentNote = this.notes.find(note => note.id === noteId);
        if (!this.currentNote) return;

        document.getElementById('noteModalTitle').textContent = 'Edit Note';
        document.getElementById('deleteNoteBtn').style.display = 'inline-block';
        this.populateNoteForm(this.currentNote);
        this.noteModal.show();
    }

    static populateNoteForm(note) {
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        document.getElementById('noteTopic').value = note.topic || '';
        document.getElementById('noteWeek').value = note.week || '';
        document.getElementById('noteTags').value = note.tags ? note.tags.join(', ') : '';
        document.getElementById('notePinned').checked = note.is_pinned;
    }

    static clearNoteForm() {
        document.getElementById('noteForm').reset();
    }

    static async saveNote() {
        const formData = {
            title: document.getElementById('noteTitle').value.trim(),
            content: document.getElementById('noteContent').value.trim(),
            topic: document.getElementById('noteTopic').value.trim(),
            week: document.getElementById('noteWeek').value ? parseInt(document.getElementById('noteWeek').value) : null,
            tags: document.getElementById('noteTags').value.split(',').map(tag => tag.trim()).filter(Boolean),
            is_pinned: document.getElementById('notePinned').checked
        };

        if (!formData.title || !formData.content) {
            ToastManager.error('Title and content are required');
            return;
        }

        try {
            let response;
            if (this.currentNote) {
                response = await APIClient.put(`/notes/${this.currentNote.id}`, formData);
            } else {
                response = await APIClient.post('/notes', formData);
            }

            if (response) {
                ToastManager.success(`Note ${this.currentNote ? 'updated' : 'created'} successfully`);
                this.noteModal.hide();
                await this.loadNotes();
            }
        } catch (error) {
            console.error('Failed to save note:', error);
            ToastManager.error('Failed to save note');
        }
    }

    static async deleteNote() {
        if (!this.currentNote) return;

        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const response = await APIClient.delete(`/notes/${this.currentNote.id}`);
            if (response) {
                ToastManager.success('Note deleted successfully');
                this.noteModal.hide();
                await this.loadNotes();
            }
        } catch (error) {
            console.error('Failed to delete note:', error);
            ToastManager.error('Failed to delete note');
        }
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Calendar Management
class CalendarManager {
    static calendar = null;
    static eventModal = null;

    static init() {
        this.eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
        this.initializeCalendar();
        this.setupEventListeners();
    }

    static initializeCalendar() {
        // This would initialize a calendar library like FullCalendar
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            calendarEl.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Calendar functionality would be implemented here using a library like FullCalendar.
                    Features would include:
                    <ul class="mb-0 mt-2">
                        <li>Study session scheduling</li>
                        <li>Deadline tracking</li>
                        <li>Progress visualization</li>
                        <li>Event management</li>
                    </ul>
                </div>
            `;
        }
    }

    static setupEventListeners() {
        // Event form submission would be handled here
    }
}

// Analytics Management
class AnalyticsManager {
    static charts = {};

    static async loadAnalytics() {
        try {
            const data = await APIClient.get('/analytics/dashboard');
            if (data) {
                this.createTimeChart(data.progress_timeline);
                this.createHoursChart(data.learning_hours);
                this.updateAnalyticsStats(data);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    static createTimeChart(timelineData) {
        const canvas = document.getElementById('timeChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.time) {
            this.charts.time.destroy();
        }

        const labels = timelineData.map(d => DateUtils.formatDate(d.date, 'short'));
        const data = timelineData.map(d => d.time_spent);

        this.charts.time = ChartUtils.createLineChart(ctx, {
            labels: labels,
            datasets: [{
                label: 'Study Time (minutes)',
                data: data,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        });
    }

    static createHoursChart(hoursData) {
        const canvas = document.getElementById('hoursChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.hours) {
            this.charts.hours.destroy();
        }

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const data = hours.map(hour => hoursData[hour] || 0);

        this.charts.hours = ChartUtils.createBarChart(ctx, {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'Sessions',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.7)'
            }]
        });
    }

    static updateAnalyticsStats(data) {
        // Update analytics statistics display
        const elements = {
            analyticsTimeToday: document.getElementById('analyticsTimeToday'),
            analyticsTimeWeek: document.getElementById('analyticsTimeWeek'),
            analyticsAvgSession: document.getElementById('analyticsAvgSession'),
            analyticsProductivity: document.getElementById('analyticsProductivity')
        };

        // These would be calculated from the data
        if (elements.analyticsTimeToday) {
            elements.analyticsTimeToday.textContent = '2h 30m'; // Sample data
        }
    }
}

// Notification Management
class NotificationManager {
    static notifications = [];

    static async loadNotifications() {
        try {
            const data = await APIClient.get('/notifications');
            if (data) {
                this.notifications = data.notifications;
                this.updateNotificationUI(data.unread_count);
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    static updateNotificationUI(unreadCount) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }
    }

    static renderNotifications() {
        const container = document.getElementById('notificationList');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = '<div class="p-3 text-center text-muted">No notifications</div>';
            return;
        }

        const notificationsHtml = this.notifications.map(notification => `
            <div class="notification-item ${notification.is_read ? '' : 'unread'}" 
                 onclick="markNotificationRead('${notification.id}')">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${DateUtils.formatDate(notification.created_at, 'relative')}</div>
            </div>
        `).join('');

        container.innerHTML = notificationsHtml;
    }

    static addNotification(notification) {
        this.notifications.unshift(notification);
        this.renderNotifications();

        // Show toast for new notification
        ToastManager.info(notification.message);
    }

    static async markNotificationRead(notificationId) {
        try {
            await APIClient.put(`/notifications/${notificationId}/read`);

            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.is_read = true;
                this.renderNotifications();

                const unreadCount = this.notifications.filter(n => !n.is_read).length;
                this.updateNotificationUI(unreadCount);
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    static async markAllRead() {
        try {
            await APIClient.put('/notifications/read-all');

            // Update local state
            this.notifications.forEach(n => n.is_read = true);
            this.renderNotifications();
            this.updateNotificationUI(0);

            ToastManager.success('All notifications marked as read');
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }
}

// Achievement Management
class AchievementManager {
    static showAchievement(achievement) {
        ToastManager.show(`🎉 Achievement Unlocked: ${achievement.title}!`, 'success', 8000);

        // Could also show a modal with more details
        console.log('Achievement earned:', achievement);
    }
}

// Settings Management
class SettingsManager {
    static async loadSettings() {
        // Load and display app settings
        const container = document.getElementById('settingsView');
        if (container) {
            // Settings would be loaded and displayed here
        }
    }
}

// Upload functionality
window.uploadAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await ProfileManager.uploadAvatar(file);
        }
    };
    input.click();
};

// Global functions for HTML onclick handlers
window.createNote = () => NotesManager.createNote();
window.editNote = (noteId) => NotesManager.editNote(noteId);
window.deleteNote = () => NotesManager.deleteNote();
window.saveNote = () => NotesManager.saveNote();
window.toggleTimer = () => PomodoroManager.toggleTimer();
window.resetTimer = () => PomodoroManager.resetTimer();
window.saveEvent = () => CalendarManager.saveEvent();
window.markNotificationRead = (id) => NotificationManager.markNotificationRead(id);
window.markAllRead = () => NotificationManager.markAllRead();

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize authentication
    AuthManager.init();

    // Initialize view manager
    ViewManager.init();

    // Initialize notes manager
    NotesManager.init();

    // Initialize pomodoro manager
    PomodoroManager.init();

    // Set up mark all read button
    document.getElementById('markAllRead')?.addEventListener('click', () => {
        NotificationManager.markAllRead();
    });
});

// Export managers for global access
window.ViewManager = ViewManager;
window.PomodoroManager = PomodoroManager;
window.NotesManager = NotesManager;
window.CalendarManager = CalendarManager;
window.AnalyticsManager = AnalyticsManager;
window.NotificationManager = NotificationManager;
window.AchievementManager = AchievementManager; 