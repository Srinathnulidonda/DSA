// Timetable management
class TimetableManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentWeek = 1;
        this.weekData = {};
        this.calendarView = false;
    }

    async loadTimetable() {
        await this.populateWeekSelector();
        await this.loadWeekData(this.dashboard.userData.currentWeek);
        this.renderWeekOverview();
        this.renderDailySchedule();
    }

    async populateWeekSelector() {
        const selector = document.getElementById('week-selector');
        if (!selector) return;

        selector.innerHTML = '';
        for (let i = 1; i <= 14; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Week ${i}`;
            if (i === this.dashboard.userData.currentWeek) {
                option.selected = true;
            }
            selector.appendChild(option);
        }
    }

    async loadWeekData(weekNumber) {
        try {
            const response = await fetch(`timetable/week-${weekNumber.toString().padStart(2, '0')}.json`);
            if (response.ok) {
                this.weekData = await response.json();
                this.currentWeek = weekNumber;
                return this.weekData;
            } else {
                throw new Error(`Failed to load week ${weekNumber} data`);
            }
        } catch (error) {
            console.error('Error loading week data:', error);
            this.weekData = this.getFallbackWeekData(weekNumber);
            return this.weekData;
        }
    }

    getFallbackWeekData(weekNumber) {
        // Fallback data structure
        const topics = [
            'Programming Fundamentals', 'Arrays & Strings', 'Linked Lists', 'Stacks & Queues',
            'Hash Tables', 'Trees (Part 1)', 'Trees (Part 2) & Heaps', 'Graphs (Part 1)',
            'Graphs (Part 2)', 'Sorting & Searching', 'Dynamic Programming', 'Advanced Algorithms',
            'System Design', 'Competitive Programming'
        ];

        return {
            week: weekNumber,
            title: `Week ${weekNumber}: ${topics[weekNumber - 1] || 'Advanced Topics'}`,
            description: `Master ${topics[weekNumber - 1] || 'advanced concepts'} through hands-on practice and projects.`,
            project: `Project ${weekNumber}: Build a practical application`,
            days: this.generateWeekDays(weekNumber, topics[weekNumber - 1] || 'Advanced Topics')
        };
    }

    generateWeekDays(weekNumber, mainTopic) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayActivities = [
            'Learn fundamentals and setup environment',
            'Practice basic operations and methods',
            'Implement advanced techniques',
            'Work on practical applications',
            'Start project implementation',
            'Continue project development',
            'Complete project and review'
        ];

        return days.map((day, index) => ({
            day,
            topic: index < 5 ? `${mainTopic} - Day ${index + 1}` : 'Project Work',
            activities: dayActivities[index],
            time: '2 hrs',
            resources: this.getDefaultResources(),
            project: index >= 4 ? `Work on Week ${weekNumber} project` : null
        }));
    }

    getDefaultResources() {
        return [
            { name: 'VisuAlgo', url: 'https://visualgo.net/', type: 'visualizer' },
            { name: 'LeetCode', url: 'https://leetcode.com/', type: 'practice' },
            { name: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/', type: 'tutorial' }
        ];
    }

    renderWeekOverview() {
        const container = document.getElementById('week-overview');
        if (!container || !this.weekData) return;

        const completedTasks = this.getWeekCompletedTasks();
        const totalTasks = this.weekData.days.length * 3; // 3 tasks per day average
        const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

        container.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h3 class="week-title mb-2">${this.weekData.title}</h3>
                    <p class="week-description text-muted mb-3">${this.weekData.description}</p>
                    <div class="week-project">
                        <h6 class="text-primary mb-2">
                            <i class="fas fa-project-diagram me-2"></i>Week Project
                        </h6>
                        <p class="mb-0">${this.weekData.project}</p>
                    </div>
                </div>
                <div class="col-md-4 text-center">
                    <div class="week-progress">
                        <div class="progress-circle mb-3" data-percentage="${progressPercentage}">
                            <div class="progress-circle-inner">
                                <span class="progress-percentage">${progressPercentage}%</span>
                                <span class="progress-label">Complete</span>
                            </div>
                        </div>
                        <div class="week-stats">
                            <div class="stat-item">
                                <strong>${completedTasks}/${totalTasks}</strong>
                                <small class="text-muted d-block">Tasks Completed</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getWeekCompletedTasks() {
        if (!this.weekData) return 0;

        return this.weekData.days.reduce((count, day) => {
            const dayKey = `week-${this.currentWeek}-${day.day.toLowerCase()}`;
            const tasks = [
                `${dayKey}-topic`,
                `${dayKey}-activities`,
                `${dayKey}-project`
            ];

            return count + tasks.filter(taskId =>
                this.dashboard.userData.completedTasks[taskId]
            ).length;
        }, 0);
    }

    renderDailySchedule() {
        const container = document.getElementById('daily-schedule');
        if (!container || !this.weekData) return;

        container.innerHTML = this.weekData.days.map((day, index) => {
            const dayKey = `week-${this.currentWeek}-${day.day.toLowerCase()}`;
            const isToday = this.isToday(day.day);

            return `
                <div class="col-12 mb-4">
                    <div class="day-card ${isToday ? 'border-primary' : ''} card-entrance" style="animation-delay: ${index * 0.1}s">
                        <div class="day-header">
                            <div class="d-flex align-items-center">
                                <h5 class="day-title mb-0">
                                    ${day.day}
                                    ${isToday ? '<span class="badge bg-primary ms-2">Today</span>' : ''}
                                </h5>
                                <div class="ms-auto">
                                    <span class="time-badge">
                                        <i class="fas fa-clock me-1"></i>${day.time}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="day-content">
                            <div class="topic-section mb-3">
                                <h6 class="section-title">
                                    <i class="fas fa-book me-2 text-primary"></i>Topic
                                </h6>
                                <div class="d-flex align-items-center">
                                    <input type="checkbox" class="form-check-input me-3" 
                                           ${this.dashboard.userData.completedTasks[`${dayKey}-topic`] ? 'checked' : ''}
                                           onchange="dashboard.toggleTask('${dayKey}-topic')">
                                    <span class="topic-text">${day.topic}</span>
                                </div>
                            </div>
                            
                            <div class="activities-section mb-3">
                                <h6 class="section-title">
                                    <i class="fas fa-tasks me-2 text-success"></i>Activities
                                </h6>
                                <div class="d-flex align-items-center">
                                    <input type="checkbox" class="form-check-input me-3" 
                                           ${this.dashboard.userData.completedTasks[`${dayKey}-activities`] ? 'checked' : ''}
                                           onchange="dashboard.toggleTask('${dayKey}-activities')">
                                    <span class="activities-text">${day.activities}</span>
                                </div>
                            </div>
                            
                            ${day.project ? `
                                <div class="project-section mb-3">
                                    <h6 class="section-title">
                                        <i class="fas fa-project-diagram me-2 text-warning"></i>Project
                                    </h6>
                                    <div class="d-flex align-items-center">
                                        <input type="checkbox" class="form-check-input me-3" 
                                               ${this.dashboard.userData.completedTasks[`${dayKey}-project`] ? 'checked' : ''}
                                               onchange="dashboard.toggleTask('${dayKey}-project')">
                                        <span class="project-text">${day.project}</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="resources-section">
                                <h6 class="section-title">
                                    <i class="fas fa-link me-2 text-info"></i>Resources
                                </h6>
                                <div class="resources-list">
                                    ${this.renderResourceLinks(day.resources)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderResourceLinks(resources) {
        if (!resources || !Array.isArray(resources)) return '';

        return resources.map(resource => `
            <a href="${resource.url}" target="_blank" class="resource-link" 
               data-bs-toggle="tooltip" title="${resource.type}">
                <i class="fas fa-external-link-alt me-1"></i>
                ${resource.name}
            </a>
        `).join('');
    }

    isToday(dayName) {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return today.toLowerCase() === dayName.toLowerCase();
    }

    async changeWeek() {
        const selector = document.getElementById('week-selector');
        if (selector) {
            const newWeek = parseInt(selector.value);
            await this.loadWeekData(newWeek);
            this.renderWeekOverview();
            this.renderDailySchedule();
        }
    }

    toggleCalendarView() {
        this.calendarView = !this.calendarView;

        if (this.calendarView) {
            this.showCalendarModal();
        }
    }

    showCalendarModal() {
        const modal = new bootstrap.Modal(document.getElementById('calendarModal'));
        this.renderCalendar();
        modal.show();
    }

    renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (!container) return;

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        let calendarHTML = `
            <div class="calendar-header mb-3">
                <h4>${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
            </div>
            <div class="calendar-grid">
                <div class="calendar-day-header">Sun</div>
                <div class="calendar-day-header">Mon</div>
                <div class="calendar-day-header">Tue</div>
                <div class="calendar-day-header">Wed</div>
                <div class="calendar-day-header">Thu</div>
                <div class="calendar-day-header">Fri</div>
                <div class="calendar-day-header">Sat</div>
        `;

        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const hasTask = this.hasTasksOnDate(date);
            const isCompleted = this.isDateCompleted(date);

            calendarHTML += `
                <div class="calendar-day ${hasTask ? 'has-tasks' : ''} ${isCompleted ? 'completed' : ''}"
                     onclick="timetable.showDayDetails('${date.toISOString()}')">
                    <span class="calendar-day-number">${day}</span>
                    ${hasTask ? '<div class="calendar-day-indicator"></div>' : ''}
                </div>
            `;
        }

        calendarHTML += '</div>';
        container.innerHTML = calendarHTML;
    }

    hasTasksOnDate(date) {
        // Check if there are scheduled tasks for this date
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const week = this.getWeekForDate(date);

        return week >= 1 && week <= 14;
    }

    isDateCompleted(date) {
        // Check if all tasks for this date are completed
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const week = this.getWeekForDate(date);

        if (week < 1 || week > 14) return false;

        const dayKey = `week-${week}-${dayName}`;
        const tasks = [
            `${dayKey}-topic`,
            `${dayKey}-activities`,
            `${dayKey}-project`
        ];

        return tasks.every(taskId => this.dashboard.userData.completedTasks[taskId]);
    }

    getWeekForDate(date) {
        // Calculate which week this date falls into
        // This is a simplified calculation - you might want to adjust based on your course start date
        const startDate = new Date('2025-01-01'); // Adjust this to your course start date
        const diffTime = Math.abs(date - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.ceil(diffDays / 7);
    }

    showDayDetails(dateString) {
        const date = new Date(dateString);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const week = this.getWeekForDate(date);

        if (week >= 1 && week <= 14) {
            // Load the week and show day details
            this.loadWeekData(week).then(() => {
                const dayData = this.weekData.days.find(d =>
                    d.day.toLowerCase() === dayName.toLowerCase()
                );

                if (dayData) {
                    this.showDayModal(dayData, date);
                }
            });
        }
    }

    showDayModal(dayData, date) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            ${dayData.day} - ${date.toLocaleDateString()}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="day-details">
                            <h6><i class="fas fa-book me-2"></i>Topic</h6>
                            <p>${dayData.topic}</p>
                            
                            <h6><i class="fas fa-tasks me-2"></i>Activities</h6>
                            <p>${dayData.activities}</p>
                            
                            ${dayData.project ? `
                                <h6><i class="fas fa-project-diagram me-2"></i>Project</h6>
                                <p>${dayData.project}</p>
                            ` : ''}
                            
                            <h6><i class="fas fa-link me-2"></i>Resources</h6>
                            <div class="resources-list">
                                ${this.renderResourceLinks(dayData.resources)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }
}

// Global functions
function loadWeekData() {
    window.timetable.changeWeek();
}

function toggleCalendarView() {
    window.timetable.toggleCalendarView();
}

// Initialize when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.dashboard) {
            window.timetable = new TimetableManager(window.dashboard);

            // Override dashboard's loadTimetable method
            window.dashboard.loadTimetable = () => {
                window.timetable.loadTimetable();
            };
        }
    }, 100);
});