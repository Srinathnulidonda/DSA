// Calendar Module
const Calendar = {
    instance: null,

    // Initialize calendar
    init: function () {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        this.instance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            height: 'auto',
            events: this.generateEvents(),
            eventClick: this.handleEventClick,
            eventDidMount: this.customizeEvent,
            dayCellDidMount: this.customizeDayCell,
            datesSet: this.handleDatesChange
        });

        // Render calendar when section is shown
        const calendarSection = document.getElementById('calendar-section');
        if (calendarSection) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style' &&
                        calendarSection.style.display !== 'none' &&
                        this.instance) {
                        this.instance.render();
                    }
                });
            });

            observer.observe(calendarSection, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
    },

    // Generate calendar events from roadmap
    generateEvents: function () {
        const events = [];
        const startDate = this.getStartDate();
        const userProgress = window.app ? window.app.userProgress : { completedTopics: [] };

        window.dsaRoadmap.forEach((week, weekIndex) => {
            week.days.forEach((day, dayIndex) => {
                const eventDate = new Date(startDate);
                eventDate.setDate(eventDate.getDate() + (weekIndex * 7) + dayIndex);

                const dayId = `week-${weekIndex}-day-${dayIndex}`;
                const isCompleted = userProgress.completedTopics.includes(dayId);

                events.push({
                    id: dayId,
                    title: day.topic,
                    date: eventDate.toISOString().split('T')[0],
                    backgroundColor: isCompleted ? '#10b981' : '#6366f1',
                    borderColor: isCompleted ? '#10b981' : '#6366f1',
                    extendedProps: {
                        week: week.week,
                        weekTitle: week.title,
                        day: day,
                        completed: isCompleted,
                        weekIndex: weekIndex,
                        dayIndex: dayIndex
                    }
                });
            });

            // Add project deadline
            if (week.project) {
                const projectDate = new Date(startDate);
                projectDate.setDate(projectDate.getDate() + (weekIndex * 7) + 6); // Sunday

                const projectStatus = userProgress.projectStatus ?
                    userProgress.projectStatus[week.project.name] : 'not-started';

                events.push({
                    id: `project-${weekIndex}`,
                    title: `📋 ${week.project.name}`,
                    date: projectDate.toISOString().split('T')[0],
                    backgroundColor: this.getProjectColor(projectStatus),
                    borderColor: this.getProjectColor(projectStatus),
                    extendedProps: {
                        type: 'project',
                        project: week.project,
                        status: projectStatus,
                        weekIndex: weekIndex
                    }
                });
            }
        });

        // Add milestone events
        this.addMilestoneEvents(events, startDate);

        return events;
    },

    // Get start date for the roadmap
    getStartDate: function () {
        // Check if user has a saved start date
        const savedStartDate = localStorage.getItem('roadmapStartDate');
        if (savedStartDate) {
            return new Date(savedStartDate);
        }

        // Otherwise, start from next Monday
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;

        const startDate = new Date(today);
        startDate.setDate(today.getDate() + daysUntilMonday);
        startDate.setHours(0, 0, 0, 0);

        // Save start date
        localStorage.setItem('roadmapStartDate', startDate.toISOString());

        return startDate;
    },

    // Get project color based on status
    getProjectColor: function (status) {
        const colors = {
            'completed': '#10b981',
            'in-progress': '#f59e0b',
            'not-started': '#6b7280'
        };
        return colors[status] || colors['not-started'];
    },

    // Add milestone events
    addMilestoneEvents: function (events, startDate) {
        const milestones = [
            { week: 4, title: '🎯 Month 1 Complete', color: '#8b5cf6' },
            { week: 8, title: '🎯 Month 2 Complete', color: '#8b5cf6' },
            { week: 12, title: '🎯 Month 3 Complete', color: '#8b5cf6' },
            { week: 14, title: '🏆 Course Complete!', color: '#f59e0b' }
        ];

        milestones.forEach(milestone => {
            const milestoneDate = new Date(startDate);
            milestoneDate.setDate(milestoneDate.getDate() + (milestone.week * 7));

            events.push({
                id: `milestone-${milestone.week}`,
                title: milestone.title,
                date: milestoneDate.toISOString().split('T')[0],
                backgroundColor: milestone.color,
                borderColor: milestone.color,
                extendedProps: {
                    type: 'milestone',
                    week: milestone.week
                }
            });
        });
    },

    // Handle event click
    handleEventClick: function (info) {
        const event = info.event;
        const props = event.extendedProps;

        if (props.type === 'project') {
            // Show project details
            const modal = Calendar.createProjectModal(props.project, props.status);
            document.body.appendChild(modal);
        } else if (props.type === 'milestone') {
            // Show milestone celebration
            Utils.showToast(event.title, 'success');
        } else {
            // Show topic details
            const modal = Calendar.createTopicModal(props);
            document.body.appendChild(modal);
        }
    },

    // Create topic modal
    createTopicModal: function (props) {
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Week ${props.week}: ${props.day.topic}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Activities:</strong> ${props.day.activities}</p>
                        <p><strong>Time Required:</strong> ${props.day.time}</p>
                        <p><strong>Status:</strong> 
                            <span class="badge bg-${props.completed ? 'success' : 'secondary'}">
                                ${props.completed ? 'Completed' : 'Not Started'}
                            </span>
                        </p>
                        <div class="mt-3">
                            <h6>Resources:</h6>
                            <ul class="list-unstyled">
                                ${props.day.resources.map(res => `
                                    <li>
                                        <a href="${res.url}" target="_blank" class="text-decoration-none">
                                            <i class="fas fa-external-link-alt"></i> ${res.name}
                                        </a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                        ${!props.completed ? `
                            <button type="button" class="btn btn-primary" 
                                onclick="Calendar.markTopicComplete('week-${props.weekIndex}-day-${props.dayIndex}', ${props.weekIndex}); this.closest('.modal').remove()">
                                Mark as Complete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        return modal;
    },

    // Create project modal
    createProjectModal: function (project, status) {
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${project.name}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <p>${project.description}</p>
                        <p><strong>Difficulty:</strong> 
                            <span class="badge bg-${Roadmap.getDifficultyColor(project.difficulty)}">
                                ${project.difficulty}
                            </span>
                        </p>
                        <p><strong>Status:</strong> 
                            <span class="badge bg-${this.getProjectColor(status).replace('#', '')}">
                                ${status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        return modal;
    },

    // Mark topic as complete from calendar
    markTopicComplete: function (dayId, weekIndex) {
        window.toggleDayComplete(dayId, weekIndex);

        // Update calendar event
        const event = this.instance.getEventById(dayId);
        if (event) {
            event.setProp('backgroundColor', '#10b981');
            event.setProp('borderColor', '#10b981');
            event.setExtendedProp('completed', true);
        }
    },

    // Customize event appearance
    customizeEvent: function (info) {
        const event = info.event;
        const element = info.el;

        // Add icons based on type
        if (event.extendedProps.type === 'project') {
            element.style.fontWeight = 'bold';
        } else if (event.extendedProps.type === 'milestone') {
            element.style.fontWeight = 'bold';
            element.style.fontSize = '0.9em';
        }

        // Add completion checkmark
        if (event.extendedProps.completed) {
            const checkmark = document.createElement('span');
            checkmark.innerHTML = ' ✓';
            checkmark.style.color = 'white';
            element.querySelector('.fc-event-title').appendChild(checkmark);
        }
    },

    // Customize day cell appearance
    customizeDayCell: function (info) {
        const date = info.date;
        const cell = info.el;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Highlight today
        if (date.getTime() === today.getTime()) {
            cell.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        }

        // Highlight weekends
        if (date.getDay() === 0 || date.getDay() === 6) {
            cell.style.backgroundColor = 'rgba(243, 244, 246, 0.5)';
        }
    },

    // Handle calendar view change
    handleDatesChange: function (info) {
        // You can add logic here to load events dynamically
        // based on the visible date range
    },

    // Switch to specific date
    goToDate: function (date) {
        if (this.instance) {
            this.instance.gotoDate(date);
        }
    },

    // Get calendar view
    getView: function () {
        return this.instance ? this.instance.view.type : null;
    },

    // Change calendar view
    changeView: function (viewName) {
        if (this.instance) {
            this.instance.changeView(viewName);
        }
    },

    // Refresh calendar events
    refresh: function () {
        if (this.instance) {
            this.instance.removeAllEvents();
            this.instance.addEventSource(this.generateEvents());
        }
    },

    // Export calendar as ICS
    exportAsICS: function () {
        const events = this.generateEvents();
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//DSA Learning Dashboard//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        events.forEach(event => {
            const startDate = new Date(event.date);
            const endDate = new Date(event.date);
            endDate.setDate(endDate.getDate() + 1);

            icsContent.push('BEGIN:VEVENT');
            icsContent.push(`UID:${event.id}@dsa-learning.com`);
            icsContent.push(`DTSTART:${this.formatICSDate(startDate)}`);
            icsContent.push(`DTEND:${this.formatICSDate(endDate)}`);
            icsContent.push(`SUMMARY:${event.title}`);

            if (event.extendedProps.day) {
                icsContent.push(`DESCRIPTION:${event.extendedProps.day.activities}`);
            }

            icsContent.push('END:VEVENT');
        });

        icsContent.push('END:VCALENDAR');

        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `dsa-schedule-${new Date().toISOString().split('T')[0]}.ics`;
        link.click();

        Utils.showToast('Calendar exported successfully!', 'success');
    },

    // Format date for ICS
    formatICSDate: function (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
};

// Export Calendar module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calendar;
}