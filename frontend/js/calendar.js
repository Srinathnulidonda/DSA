// Calendar functionality

class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.events = [];
        this.view = 'month'; // month, week, day
        this.selectedDate = null;
        this.init();
    }

    async init() {
        await this.loadEvents();
        this.setupEventListeners();
        this.renderCalendar();
        this.updateTodaysFocus();
        this.updateStats();
    }

    async loadEvents() {
        try {
            const startOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const endOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

            const response = await api.get(`${API_ENDPOINTS.calendar}?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`);
            this.events = response.events || [];
        } catch (error) {
            console.error('Failed to load events:', error);
            this.events = [];
        }
    }

    setupEventListeners() {
        // Navigation
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');
        const todayBtn = document.getElementById('todayBtn');

        if (prevMonth) {
            prevMonth.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.loadEvents();
                this.renderCalendar();
            });
        }

        if (nextMonth) {
            nextMonth.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.loadEvents();
                this.renderCalendar();
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.currentDate = new Date();
                this.loadEvents();
                this.renderCalendar();
            });
        }

        // View toggles
        const monthViewBtn = document.getElementById('monthViewBtn');
        const weekViewBtn = document.getElementById('weekViewBtn');
        const dayViewBtn = document.getElementById('dayViewBtn');

        [monthViewBtn, weekViewBtn, dayViewBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.switchView(btn.id.replace('ViewBtn', ''));
                });
            }
        });

        // Add event
        const addEventBtn = document.getElementById('addEventBtn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => {
                this.showAddEventModal();
            });
        }

        // Quick add form
        const quickAddForm = document.getElementById('quickAddForm');
        if (quickAddForm) {
            quickAddForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleQuickAdd();
            });
        }

        // Add event form
        const addEventForm = document.getElementById('addEventForm');
        if (addEventForm) {
            addEventForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddEvent();
            });
        }

        // Event color picker
        const eventColor = document.getElementById('eventColor');
        const eventColorText = document.getElementById('eventColorText');

        if (eventColor && eventColorText) {
            eventColor.addEventListener('input', (e) => {
                eventColorText.value = e.target.value;
            });

            eventColorText.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    eventColor.value = e.target.value;
                }
            });
        }

        // Filter buttons
        const filterButtons = ['filterAllBtn', 'filterStudyBtn', 'filterProjectBtn', 'filterDeadlineBtn'];
        filterButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.setFilter(btnId.replace('filter', '').replace('Btn', '').toLowerCase());
                });
            }
        });

        // Modal close handlers
        const closeEventModal = document.getElementById('closeEventModal');
        const cancelEvent = document.getElementById('cancelEvent');
        const closeEventDetailModal = document.getElementById('closeEventDetailModal');

        [closeEventModal, cancelEvent, closeEventDetailModal].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    modalManager.closeAll();
                });
            }
        });
    }

    renderCalendar() {
        this.updateCurrentMonth();

        switch (this.view) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
        }

        this.renderEventsList();
    }

    updateCurrentMonth() {
        const currentMonthEl = document.getElementById('currentMonth');
        if (currentMonthEl) {
            currentMonthEl.textContent = this.currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        }
    }

    renderMonthView() {
        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) return;

        // Get first day of month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        calendarGrid.innerHTML = '';

        // Header row
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekDays.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Calendar days
        for (let i = 0; i < 42; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);

            const dayElement = this.createDayElement(currentDay);
            calendarGrid.appendChild(dayElement);
        }
    }

    createDayElement(date) {
        const dayDiv = document.createElement('div');
        const isCurrentMonth = date.getMonth() === this.currentDate.getMonth();
        const isToday = this.isToday(date);
        const dayEvents = this.getEventsForDate(date);

        dayDiv.className = `min-h-24 p-2 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800' : ''
            } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}`;

        dayDiv.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}">${date.getDate()}</span>
                ${dayEvents.length > 0 ? `<span class="text-xs text-gray-500">${dayEvents.length}</span>` : ''}
            </div>
            <div class="space-y-1">
                ${dayEvents.slice(0, 3).map(event => `
                    <div class="text-xs p-1 rounded truncate" style="background-color: ${event.color}20; color: ${event.color}">
                        ${event.title}
                    </div>
                `).join('')}
                ${dayEvents.length > 3 ? `<div class="text-xs text-gray-500">+${dayEvents.length - 3} more</div>` : ''}
            </div>
        `;

        dayDiv.addEventListener('click', () => {
            this.selectedDate = new Date(date);
            this.showDayEvents(date);
        });

        return dayDiv;
    }

    getEventsForDate(date) {
        return this.events.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate.toDateString() === date.toDateString();
        });
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    showDayEvents(date) {
        const events = this.getEventsForDate(date);
        const modal = document.getElementById('eventDetailModal');
        const title = document.getElementById('eventDetailTitle');
        const content = document.getElementById('eventDetailContent');

        if (!modal || !title || !content) return;

        title.textContent = `Events for ${date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        })}`;

        if (events.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="bi bi-calendar-x text-gray-400 text-2xl"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 mb-4">No events scheduled for this day</p>
                    <button onclick="calendarManager.showAddEventModal('${date.toISOString()}')" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Add Event
                    </button>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="space-y-4">
                    ${events.map(event => `
                        <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <h4 class="font-medium text-gray-900 dark:text-white">${event.title}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${event.description || 'No description'}</p>
                                    <div class="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span><i class="bi bi-clock mr-1"></i>${this.formatEventTime(event)}</span>
                                        <span class="px-2 py-1 rounded-full text-xs" style="background-color: ${event.color}20; color: ${event.color}">
                                            ${event.event_type}
                                        </span>
                                    </div>
                                </div>
                                <button onclick="calendarManager.editEvent('${event.id}')" 
                                        class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <i class="bi bi-pencil"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    
                    <button onclick="calendarManager.showAddEventModal('${date.toISOString()}')" 
                            class="w-full mt-4 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors">
                        <i class="bi bi-plus mr-2"></i>Add Event
                    </button>
                </div>
            `;
        }

        modalManager.open('eventDetailModal');
    }

    formatEventTime(event) {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);

        return `${start.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        })} - ${end.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        })}`;
    }

    renderEventsList() {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        const upcomingEvents = this.events
            .filter(event => new Date(event.start_time) >= new Date())
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(0, 10);

        if (upcomingEvents.length === 0) {
            eventsList.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="bi bi-calendar text-gray-400 text-2xl"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 mb-4">No upcoming events</p>
                    <button onclick="calendarManager.showAddEventModal()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Create Your First Event
                    </button>
                </div>
            `;
            return;
        }

        eventsList.innerHTML = upcomingEvents.map(event => `
            <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                 onclick="calendarManager.showEventDetail('${event.id}')">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900 dark:text-white">${event.title}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${this.formatEventDateTime(event)}</p>
                        <div class="flex items-center space-x-2 mt-2">
                            <span class="px-2 py-1 rounded-full text-xs" style="background-color: ${event.color}20; color: ${event.color}">
                                ${event.event_type}
                            </span>
                            ${event.recurring ? '<span class="text-xs text-gray-500"><i class="bi bi-arrow-repeat"></i></span>' : ''}
                        </div>
                    </div>
                    <div class="text-right text-sm text-gray-500 dark:text-gray-400">
                        ${dateUtils.formatRelative(event.start_time)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    formatEventDateTime(event) {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        const today = new Date();

        let dateStr = '';
        if (start.toDateString() === today.toDateString()) {
            dateStr = 'Today';
        } else if (start.toDateString() === new Date(today.getTime() + 86400000).toDateString()) {
            dateStr = 'Tomorrow';
        } else {
            dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        const timeStr = `${start.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        })} - ${end.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        })}`;

        return `${dateStr} • ${timeStr}`;
    }

    updateTodaysFocus() {
        const todaysFocus = document.getElementById('todaysFocus');
        if (!todaysFocus) return;

        const today = new Date();
        const todaysEvents = this.getEventsForDate(today);

        if (todaysEvents.length === 0) {
            todaysFocus.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-calendar-check text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">No events scheduled for today</p>
                </div>
            `;
            return;
        }

        todaysFocus.innerHTML = todaysEvents.map(event => `
            <div class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 class="font-medium text-gray-900 dark:text-white text-sm">${event.title}</h4>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">${this.formatEventTime(event)}</p>
            </div>
        `).join('');
    }

    updateStats() {
        const monthStudySessions = document.getElementById('monthStudySessions');
        const monthProjectHours = document.getElementById('monthProjectHours');
        const monthCompleted = document.getElementById('monthCompleted');

        if (!monthStudySessions || !monthProjectHours || !monthCompleted) return;

        const thisMonth = this.events.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate.getMonth() === this.currentDate.getMonth() &&
                eventDate.getFullYear() === this.currentDate.getFullYear();
        });

        const studySessions = thisMonth.filter(e => e.event_type === 'study').length;
        const projectHours = thisMonth
            .filter(e => e.event_type === 'project')
            .reduce((total, event) => {
                const duration = (new Date(event.end_time) - new Date(event.start_time)) / (1000 * 60 * 60);
                return total + duration;
            }, 0);
        const completed = thisMonth.filter(e => new Date(e.end_time) < new Date()).length;

        monthStudySessions.textContent = studySessions;
        monthProjectHours.textContent = `${Math.round(projectHours)}h`;
        monthCompleted.textContent = completed;
    }

    showAddEventModal(preselectedDate = null) {
        const modal = document.getElementById('addEventModal');
        if (!modal) return;

        // Pre-fill with selected date
        if (preselectedDate) {
            const date = new Date(preselectedDate);
            const dateStr = date.toISOString().split('T')[0];
            const timeStr = '09:00';

            document.getElementById('eventStartDate').value = dateStr;
            document.getElementById('eventEndDate').value = dateStr;
            document.getElementById('eventStartTime').value = timeStr;
            document.getElementById('eventEndTime').value = '10:00';
        } else {
            // Set to current date/time
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().slice(0, 5);

            document.getElementById('eventStartDate').value = dateStr;
            document.getElementById('eventEndDate').value = dateStr;
            document.getElementById('eventStartTime').value = timeStr;

            const endTime = new Date(now.getTime() + 60 * 60 * 1000);
            document.getElementById('eventEndTime').value = endTime.toTimeString().slice(0, 5);
        }

        modalManager.open('addEventModal');
    }

    async handleQuickAdd() {
        const title = document.getElementById('quickTitle').value.trim();
        const date = document.getElementById('quickDate').value;
        const time = document.getElementById('quickTime').value;
        const type = document.getElementById('quickType').value;

        if (!title || !date || !time) {
            notificationManager.error('Please fill in all fields');
            return;
        }

        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour default

        await this.createEvent({
            title,
            event_type: type,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            color: this.getDefaultColorForType(type)
        });

        // Clear form
        document.getElementById('quickAddForm').reset();
        document.getElementById('quickDate').value = new Date().toISOString().split('T')[0];
    }

    async handleAddEvent() {
        const formData = new FormData(document.getElementById('addEventForm'));

        const startDateTime = new Date(`${formData.get('startDate')}T${formData.get('startTime')}`);
        const endDateTime = new Date(`${formData.get('endDate')}T${formData.get('endTime')}`);

        if (endDateTime <= startDateTime) {
            notificationManager.error('End time must be after start time');
            return;
        }

        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            event_type: formData.get('eventType'),
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            color: formData.get('color'),
            recurring: document.getElementById('eventRecurring').checked
        };

        await this.createEvent(eventData);
        modalManager.close('addEventModal');
        document.getElementById('addEventForm').reset();
    }

    async createEvent(eventData) {
        try {
            await api.post(API_ENDPOINTS.calendar, eventData);
            await this.loadEvents();
            this.renderCalendar();
            this.updateTodaysFocus();
            this.updateStats();
            notificationManager.success('Event created successfully');
        } catch (error) {
            console.error('Failed to create event:', error);
            notificationManager.error('Failed to create event');
        }
    }

    getDefaultColorForType(type) {
        const colors = {
            study: '#3B82F6',
            project: '#10B981',
            deadline: '#EF4444',
            review: '#8B5CF6'
        };
        return colors[type] || '#6B7280';
    }

    switchView(view) {
        this.view = view;

        // Update button states
        ['month', 'week', 'day'].forEach(v => {
            const btn = document.getElementById(`${v}ViewBtn`);
            if (btn) {
                if (v === view) {
                    btn.className = 'px-3 py-2 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg';
                } else {
                    btn.className = 'px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg';
                }
            }
        });

        this.renderCalendar();
    }

    setFilter(filter) {
        // Update filter buttons
        ['all', 'study', 'project', 'deadline'].forEach(f => {
            const btn = document.getElementById(`filter${f.charAt(0).toUpperCase() + f.slice(1)}Btn`);
            if (btn) {
                if (f === filter) {
                    btn.className = 'px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md';
                } else {
                    btn.className = 'px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md';
                }
            }
        });

        // Apply filter
        this.currentFilter = filter;
        this.renderEventsList();
    }
}

// Initialize calendar manager when on calendar page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('calendar')) {
        window.calendarManager = new CalendarManager();
    }
});