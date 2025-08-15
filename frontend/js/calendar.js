// calendar.js - Calendar functionality

let calendar;
let calendarEvents = [];
let selectedEvent = null;

// Initialize calendar
document.addEventListener('DOMContentLoaded', async () => {
    initializeCalendar();
    await loadCalendarEvents();
    setupEventListeners();
    updateTodaySchedule();
    updateWeeklyGoals();
});

// Initialize FullCalendar
function initializeCalendar() {
    const calendarEl = document.getElementById('fullCalendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        height: 'auto',
        events: [],
        editable: true,
        selectable: true,
        selectMirror: true,
        eventClick: handleEventClick,
        select: handleDateSelect,
        eventDrop: handleEventDrop,
        eventResize: handleEventResize,
        eventDidMount: function (info) {
            // Add tooltips to events
            const tooltip = new bootstrap.Tooltip(info.el, {
                title: info.event.extendedProps.description || info.event.title,
                placement: 'top',
                trigger: 'hover'
            });
        }
    });

    calendar.render();
}

// Load calendar events
async function loadCalendarEvents() {
    try {
        const response = await window.API.getCalendarEvents();
        calendarEvents = response.data.events;

        // Add events to calendar
        calendarEvents.forEach(event => {
            calendar.addEvent({
                id: event.id,
                title: event.title,
                start: event.start_time,
                end: event.end_time,
                backgroundColor: event.color,
                borderColor: event.color,
                extendedProps: {
                    description: event.description,
                    event_type: event.event_type,
                    recurring: event.recurring
                }
            });
        });

    } catch (error) {
        console.error('Failed to load calendar events:', error);
        window.DSAApp.showToast('Failed to load calendar events', 'error');
    }
}

// Handle event click
function handleEventClick(info) {
    selectedEvent = info.event;

    // Show event details modal
    showEventDetailsModal(info.event);
}

// Handle date select
function handleDateSelect(info) {
    // Pre-fill form with selected date
    document.querySelector('input[name="start_time"]').value = formatDateTimeLocal(info.start);
    document.querySelector('input[name="end_time"]').value = formatDateTimeLocal(info.end || addHours(info.start, 1));

    // Show add event modal
    const modal = new bootstrap.Modal(document.getElementById('addEventModal'));
    modal.show();

    // Clear selection
    calendar.unselect();
}

// Handle event drop (drag and drop)
async function handleEventDrop(info) {
    try {
        await window.API.updateCalendarEvent(info.event.id, {
            start_time: info.event.start.toISOString(),
            end_time: info.event.end.toISOString()
        });

        window.DSAApp.showToast('Event updated successfully', 'success');
    } catch (error) {
        console.error('Failed to update event:', error);
        window.DSAApp.showToast('Failed to update event', 'error');
        info.revert();
    }
}

// Handle event resize
async function handleEventResize(info) {
    try {
        await window.API.updateCalendarEvent(info.event.id, {
            start_time: info.event.start.toISOString(),
            end_time: info.event.end.toISOString()
        });

        window.DSAApp.showToast('Event duration updated', 'success');
    } catch (error) {
        console.error('Failed to resize event:', error);
        window.DSAApp.showToast('Failed to update event', 'error');
        info.revert();
    }
}

// Save event
window.saveEvent = async function () {
    const form = document.getElementById('addEventForm');
    const formData = new FormData(form);

    const eventData = {
        title: formData.get('title'),
        event_type: formData.get('event_type'),
        start_time: new Date(formData.get('start_time')).toISOString(),
        end_time: new Date(formData.get('end_time')).toISOString(),
        description: formData.get('description'),
        color: formData.get('color'),
        recurring: formData.get('recurring') === 'on',
        reminder_minutes: 30
    };

    try {
        window.DSAApp.showLoader();

        const response = await window.API.createCalendarEvent(eventData);
        const newEvent = response.data;

        // Add to calendar
        calendar.addEvent({
            id: newEvent.event_id,
            title: eventData.title,
            start: eventData.start_time,
            end: eventData.end_time,
            backgroundColor: eventData.color,
            borderColor: eventData.color,
            extendedProps: {
                description: eventData.description,
                event_type: eventData.event_type,
                recurring: eventData.recurring
            }
        });

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('addEventModal')).hide();

        // Reset form
        form.reset();

        window.DSAApp.showToast('Event created successfully', 'success');

        // Update today's schedule
        updateTodaySchedule();

    } catch (error) {
        console.error('Failed to create event:', error);
        window.DSAApp.showToast('Failed to create event', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Show event details modal
function showEventDetailsModal(event) {
    const modalHTML = `
        <div class="modal fade" id="eventDetailsModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">${event.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><i class="fas fa-calendar me-2"></i> ${formatEventDate(event.start, event.end)}</p>
                        <p><i class="fas fa-tag me-2"></i> ${event.extendedProps.event_type || 'Study Session'}</p>
                        ${event.extendedProps.description ? `<p><i class="fas fa-info-circle me-2"></i> ${event.extendedProps.description}</p>` : ''}
                        ${event.extendedProps.recurring ? '<p><i class="fas fa-sync me-2"></i> Recurring event</p>' : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger" onclick="deleteEvent('${event.id}')">
                            <i class="fas fa-trash me-2"></i> Delete
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('eventDetailsModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
    modal.show();
}

// Delete event
window.deleteEvent = async function (eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
        await window.API.deleteCalendarEvent(eventId);

        // Remove from calendar
        const event = calendar.getEventById(eventId);
        if (event) event.remove();

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('eventDetailsModal')).hide();

        window.DSAApp.showToast('Event deleted successfully', 'success');

        // Update today's schedule
        updateTodaySchedule();

    } catch (error) {
        console.error('Failed to delete event:', error);
        window.DSAApp.showToast('Failed to delete event', 'error');
    }
};

// Update today's schedule
function updateTodaySchedule() {
    const scheduleList = document.querySelector('.schedule-list');
    if (!scheduleList) return;

    const today = new Date();
    const todayEvents = calendar.getEvents().filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.toDateString() === today.toDateString();
    }).sort((a, b) => new Date(a.start) - new Date(b.start));

    if (todayEvents.length === 0) {
        scheduleList.innerHTML = '<p class="text-muted text-center">No events scheduled for today</p>';
        return;
    }

    scheduleList.innerHTML = todayEvents.map(event => `
        <div class="schedule-item d-flex align-items-start mb-3">
            <div class="time-slot me-3">
                <small class="text-muted">${formatTime(event.start)}</small>
            </div>
            <div class="flex-grow-1">
                <h6 class="mb-1">${event.title}</h6>
                <small class="text-muted">${calculateDuration(event.start, event.end)}</small>
            </div>
        </div>
    `).join('');
}

// Update weekly goals
async function updateWeeklyGoals() {
    try {
        // Get this week's data
        const weekStart = getWeekStart();
        const weekEnd = getWeekEnd();

        const events = await window.API.getCalendarEvents(
            weekStart.toISOString(),
            weekEnd.toISOString()
        );

        // Calculate progress
        const studyHours = calculateStudyHours(events.data.events);
        const topicsCompleted = calculateTopicsCompleted();
        const problemsSolved = calculateProblemsSolved();

        // Update UI
        updateGoalProgress('studyTime', studyHours, 20);
        updateGoalProgress('topics', topicsCompleted, 7);
        updateGoalProgress('problems', problemsSolved, 25);

    } catch (error) {
        console.error('Failed to update weekly goals:', error);
    }
}

// Update goal progress
function updateGoalProgress(goalType, current, target) {
    const percentage = Math.min((current / target) * 100, 100);

    document.querySelector(`#${goalType}Current`).textContent = current;
    document.querySelector(`#${goalType}Target`).textContent = target;
    document.querySelector(`#${goalType}Progress .progress-bar`).style.width = `${percentage}%`;
}

// Setup event listeners
function setupEventListeners() {
    // Color picker for events
    document.querySelectorAll('.color-picker').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.color-picker').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelector('input[name="color"]').value = this.dataset.color;
        });
    });

    // Calendar view switcher
    document.querySelectorAll('.view-switcher button').forEach(btn => {
        btn.addEventListener('click', function () {
            calendar.changeView(this.dataset.view);
        });
    });
}

// Utility functions
function formatDateTimeLocal(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
}

function formatEventDate(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate.toDateString() === endDate.toDateString()) {
        return `${startDate.toLocaleDateString()} ${formatTime(startDate)} - ${formatTime(endDate)}`;
    } else {
        return `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;
    }
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function calculateDuration(start, end) {
    const duration = (new Date(end) - new Date(start)) / (1000 * 60);
    if (duration < 60) {
        return `${duration} minutes`;
    } else {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
}

function getWeekStart() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
}

function getWeekEnd() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + 6;
    return new Date(today.setDate(diff));
}

function calculateStudyHours(events) {
    return events.reduce((total, event) => {
        if (event.event_type === 'study' || event.event_type === 'practice') {
            const duration = (new Date(event.end_time) - new Date(event.start_time)) / (1000 * 60 * 60);
            return total + duration;
        }
        return total;
    }, 0).toFixed(1);
}

function calculateTopicsCompleted() {
    // Mock calculation - in real app would check actual progress
    return 4;
}

function calculateProblemsSolved() {
    // Mock calculation - in real app would check actual progress
    return 15;
}