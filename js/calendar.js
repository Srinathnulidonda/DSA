// ===== CALENDAR CONTROLLER =====

class CalendarController {
    constructor(app) {
        this.app = app;
        this.currentDate = new Date();
        this.currentView = 'list'; // 'list' or 'calendar'
        this.selectedWeek = this.app.currentWeek;
        this.calendarEvents = [];

        this.init();
    }

    init() {
        this.setupCalendarEventListeners();
        this.generateCalendarEvents();
    }

    setupCalendarEventListeners() {
        // Calendar navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('#prevMonth')) {
                this.previousMonth();
            } else if (e.target.matches('#nextMonth')) {
                this.nextMonth();
            }
        });

        // Week tab clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.week-tab')) {
                this.selectWeek(parseInt(e.target.dataset.week));
            }
        });

        // Calendar day clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.calendar-day') || e.target.closest('.calendar-day')) {
                this.handleDayClick(e.target.closest('.calendar-day'));
            }
        });
    }

    // ===== DAILY SCHEDULE =====
    loadDailySchedule() {
        this.generateWeekTabs();
        this.loadSelectedWeekSchedule();
        this.updateCalendarView();
    }

    generateWeekTabs() {
        const container = document.getElementById('weekTabs');
        if (!container) return;

        const weekTabs = DSA_ROADMAP.weeks.map(week => {
            const isActive = week.id === this.selectedWeek;
            const isCompleted = this.isWeekCompleted(week.id);
            const isCurrent = week.id === this.app.currentWeek;

            return `
                <button class="week-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}" 
                        data-week="${week.id}">
                    <div class="week-tab-content">
                        <div class="week-number">Week ${week.id}</div>
                        <div class="week-title">${week.title}</div>
                        <div class="week-progress">
                            <div class="progress" style="height: 3px;">
                                <div class="progress-bar" style="width: ${this.calculateWeekProgress(week.id)}%"></div>
                            </div>
                        </div>
                    </div>
                    ${isCompleted ? '<i class="fas fa-check week-check"></i>' : ''}
                    ${isCurrent ? '<i class="fas fa-star week-star"></i>' : ''}
                </button>
            `;
        }).join('');

        container.innerHTML = weekTabs;
    }

    selectWeek(weekId) {
        this.selectedWeek = weekId;
        this.generateWeekTabs();
        this.loadSelectedWeekSchedule();
    }

    loadSelectedWeekSchedule() {
        const container = document.getElementById('dailyScheduleContainer');
        if (!container) return;

        const weekData = DSA_ROADMAP.weeks.find(week => week.id === this.selectedWeek);
        if (!weekData) return;

        container.innerHTML = `
            <div class="daily-schedule-header">
                <div class="schedule-week-info">
                    <h4 class="schedule-week-title">Week ${weekData.id}: ${weekData.title}</h4>
                    <p class="schedule-week-goal">${weekData.goal}</p>
                    <div class="schedule-week-meta">
                        <span class="badge bg-info">${weekData.duration}</span>
                        <span class="badge bg-secondary">${weekData.difficulty}</span>
                        <span class="badge bg-success">${weekData.totalHours} hours</span>
                    </div>
                </div>
                <div class="schedule-week-progress">
                    <div class="circular-progress">
                        <svg class="progress-ring" width="60" height="60">
                            <circle class="progress-ring-circle" 
                                    cx="30" cy="30" r="25" 
                                    fill="transparent" 
                                    stroke="#e5e7eb" 
                                    stroke-width="4"/>
                            <circle class="progress-ring-circle progress-ring-fill" 
                                    cx="30" cy="30" r="25" 
                                    fill="transparent" 
                                    stroke="#6366f1" 
                                    stroke-width="4"
                                    stroke-dasharray="${2 * Math.PI * 25}"
                                    stroke-dashoffset="${2 * Math.PI * 25 * (1 - this.calculateWeekProgress(weekData.id) / 100)}"
                                    transform="rotate(-90 30 30)"/>
                        </svg>
                        <div class="progress-text">${Math.round(this.calculateWeekProgress(weekData.id))}%</div>
                    </div>
                </div>
            </div>
            
            <div class="daily-schedule-grid">
                ${weekData.days.map(day => this.generateDayScheduleHTML(day, weekData.id)).join('')}
            </div>
        `;
    }

    generateDayScheduleHTML(day, weekId) {
        const taskId = `week-${weekId}-day-${day.day.toLowerCase()}`;
        const isCompleted = this.app.progress.completedTasks?.includes(taskId) || false;
        const isToday = this.isDayToday(day, weekId);

        return `
            <div class="daily-schedule-day ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}" 
                 data-task-id="${taskId}">
                <div class="schedule-day-header">
                    <div class="schedule-day-info">
                        <div class="schedule-day-name">${day.day}</div>
                        <div class="schedule-day-date">${day.date}</div>
                    </div>
                    <div class="schedule-day-actions">
                        <input type="checkbox" class="form-check-input schedule-day-checkbox" 
                               ${isCompleted ? 'checked' : ''}>
                        ${isToday ? '<span class="badge bg-primary">Today</span>' : ''}
                    </div>
                </div>
                
                <div class="schedule-topic">
                    ${day.isProject ? '<i class="fas fa-project-diagram me-2"></i>' : ''}
                    ${day.topic}
                </div>
                
                <div class="schedule-subtopic">${day.subtopic}</div>
                
                <div class="schedule-activities">
                    ${day.activities.slice(0, 3).map(activity => `
                        <div class="schedule-activity">
                            <i class="fas fa-check-circle me-2"></i>
                            ${activity}
                        </div>
                    `).join('')}
                    ${day.activities.length > 3 ? `
                        <div class="schedule-activity-more">
                            +${day.activities.length - 3} more activities
                        </div>
                    ` : ''}
                </div>
                
                <div class="schedule-meta">
                    <div class="schedule-time">
                        <i class="fas fa-clock me-1"></i>
                        ${day.timeRequired}
                    </div>
                    <div class="schedule-difficulty">
                        <span class="badge badge-${day.difficulty.toLowerCase()}">${day.difficulty}</span>
                    </div>
                </div>
                
                ${day.resources?.length > 0 ? `
                    <div class="schedule-resources">
                        <small class="text-muted">Resources:</small>
                        <div class="resource-links">
                            ${day.resources.slice(0, 2).map(resource => `
                                <a href="${resource.url}" target="_blank" class="resource-link-small">
                                    ${resource.name}
                                </a>
                            `).join('')}
                            ${day.resources.length > 2 ? `
                                <span class="resource-more">+${day.resources.length - 2} more</span>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ===== CALENDAR VIEW =====
    toggleCalendarView() {
        this.currentView = this.currentView === 'list' ? 'calendar' : 'list';

        const calendarContainer = document.getElementById('calendarViewContainer');
        const toggleButton = document.getElementById('toggleCalendarView');

        if (this.currentView === 'calendar') {
            calendarContainer?.classList.remove('d-none');
            if (toggleButton) {
                toggleButton.innerHTML = '<i class="fas fa-list me-2"></i>Switch to List View';
            }
            this.updateCalendarView();
        } else {
            calendarContainer?.classList.add('d-none');
            if (toggleButton) {
                toggleButton.innerHTML = '<i class="fas fa-calendar me-2"></i>Switch to Calendar View';
            }
        }
    }

    updateCalendarView() {
        this.updateCalendarHeader();
        this.generateCalendarGrid();
    }

    updateCalendarHeader() {
        const monthElement = document.getElementById('calendarMonth');
        if (monthElement) {
            monthElement.textContent = this.currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        }
    }

    generateCalendarGrid() {
        const container = document.getElementById('calendarGrid');
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Generate calendar HTML
        let calendarHTML = '';

        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            calendarHTML += `<div class="calendar-day-header">${day}</div>`;
        });

        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const isToday = this.isDateToday(currentDate);
            const events = this.getEventsForDate(currentDate);
            const hasEvents = events.length > 0;

            calendarHTML += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvents ? 'has-tasks' : ''}" 
                     data-date="${currentDate.toISOString().split('T')[0]}">
                    <div class="calendar-day-number">${day}</div>
                    <div class="calendar-events">
                        ${events.slice(0, 3).map(event => `
                            <div class="calendar-task ${event.completed ? 'completed' : ''}" 
                                 title="${event.title}">
                                ${event.title}
                            </div>
                        `).join('')}
                        ${events.length > 3 ? `
                            <div class="calendar-task-more">+${events.length - 3} more</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        container.innerHTML = calendarHTML;
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.updateCalendarView();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.updateCalendarView();
    }

    handleDayClick(dayElement) {
        const dateStr = dayElement.dataset.date;
        if (!dateStr) return;

        const events = this.getEventsForDate(new Date(dateStr));
        if (events.length > 0) {
            this.showDayDetailModal(dateStr, events);
        }
    }

    showDayDetailModal(dateStr, events) {
        const date = new Date(dateStr);
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            ${date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="day-events">
                            ${events.map(event => `
                                <div class="event-item ${event.completed ? 'completed' : ''}">
                                    <div class="event-header">
                                        <input type="checkbox" class="form-check-input me-2" 
                                               ${event.completed ? 'checked' : ''}
                                               data-task-id="${event.taskId}">
                                        <strong>${event.title}</strong>
                                        <span class="badge bg-info ms-auto">${event.timeRequired}</span>
                                    </div>
                                    <div class="event-description">${event.description}</div>
                                    ${event.resources?.length > 0 ? `
                                        <div class="event-resources mt-2">
                                            ${event.resources.map(resource => `
                                                <a href="${resource.url}" target="_blank" class="btn btn-sm btn-outline-primary me-1">
                                                    ${resource.name}
                                                </a>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="app.navigateToSection('daily-schedule')" data-bs-dismiss="modal">
                            View Full Schedule
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Handle checkbox changes in modal
        modal.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const taskId = e.target.dataset.taskId;
                if (taskId) {
                    if (e.target.checked) {
                        this.app.completeTask(taskId);
                    } else {
                        this.app.uncompleteTask(taskId);
                    }
                    this.app.saveProgress();
                }
            }
        });

        // Remove modal after hiding
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    // ===== EVENT GENERATION =====
    generateCalendarEvents() {
        this.calendarEvents = [];

        DSA_ROADMAP.weeks.forEach(week => {
            week.days.forEach((day, dayIndex) => {
                // Calculate date for this day (assuming linear progression)
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + (week.id - 1) * 7 + dayIndex);

                const taskId = `week-${week.id}-day-${day.day.toLowerCase()}`;
                const isCompleted = this.app.progress.completedTasks?.includes(taskId) || false;

                this.calendarEvents.push({
                    date: startDate.toISOString().split('T')[0],
                    title: day.topic,
                    description: day.subtopic,
                    timeRequired: day.timeRequired,
                    difficulty: day.difficulty,
                    week: week.id,
                    day: day.day,
                    taskId: taskId,
                    completed: isCompleted,
                    isProject: day.isProject || false,
                    resources: day.resources || []
                });
            });
        });
    }

    getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.calendarEvents.filter(event => event.date === dateStr);
    }

    // ===== UTILITY METHODS =====
    isWeekCompleted(weekId) {
        const weekData = DSA_ROADMAP.weeks.find(week => week.id === weekId);
        if (!weekData) return false;

        const weekTasks = weekData.days.map(day =>
            `week-${weekId}-day-${day.day.toLowerCase()}`
        );

        return weekTasks.every(taskId =>
            this.app.progress.completedTasks?.includes(taskId)
        );
    }

    calculateWeekProgress(weekId) {
        const weekData = DSA_ROADMAP.weeks.find(week => week.id === weekId);
        if (!weekData) return 0;

        const weekTasks = weekData.days.map(day =>
            `week-${weekId}-day-${day.day.toLowerCase()}`
        );

        const completedTasks = weekTasks.filter(taskId =>
            this.app.progress.completedTasks?.includes(taskId)
        );

        return Math.round((completedTasks.length / weekTasks.length) * 100);
    }

    isDayToday(day, weekId) {
        const today = new Date();
        const currentWeek = this.app.currentWeek;
        const todayDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

        return weekId === currentWeek && day.day === todayDayOfWeek;
    }

    isDateToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    exportSchedule() {
        const scheduleData = {
            weeks: DSA_ROADMAP.weeks.map(week => ({
                id: week.id,
                title: week.title,
                goal: week.goal,
                days: week.days.map(day => ({
                    day: day.day,
                    topic: day.topic,
                    timeRequired: day.timeRequired,
                    difficulty: day.difficulty,
                    completed: this.app.progress.completedTasks?.includes(
                        `week-${week.id}-day-${day.day.toLowerCase()}`
                    ) || false
                }))
            })),
            progress: {
                currentWeek: this.app.currentWeek,
                completedTasks: this.app.progress.completedTasks || [],
                overallProgress: Math.round((this.app.progress.daysCompleted || 0) / 98 * 100)
            },
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(scheduleData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `dsa-schedule-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        this.app.showNotification('Schedule Exported', 'Your learning schedule has been exported!', 'success');
    }

    // ===== PUBLIC API =====
    refreshCalendar() {
        this.generateCalendarEvents();
        if (this.currentView === 'calendar') {
            this.updateCalendarView();
        } else {
            this.loadSelectedWeekSchedule();
        }
    }

    goToWeek(weekId) {
        this.selectedWeek = weekId;
        this.app.currentWeek = weekId;
        this.loadSelectedWeekSchedule();
    }

    goToToday() {
        const today = new Date();
        this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        this.updateCalendarView();
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarController;
}