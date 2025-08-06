// Timetable and Calendar Management

let calendar = null;
let currentView = 'list';

// Load timetable section
function loadTimetable() {
    if (currentView === 'list') {
        loadListView();
    } else {
        loadCalendarView();
    }
}

// Change view between list and calendar
function changeView(view) {
    currentView = view;

    document.getElementById('listView').classList.toggle('d-none', view !== 'list');
    document.getElementById('calendarView').classList.toggle('d-none', view !== 'calendar');

    if (view === 'calendar' && !calendar) {
        initializeCalendar();
    }

    loadTimetable();
}

// List View
function loadListView() {
    const listView = document.getElementById('listView');
    if (!listView) return;

    let html = '<div class="accordion week-accordion" id="weekAccordion">';

    for (let week = 1; week <= 14; week++) {
        const weekData = DSA_ROADMAP[`week${week}`];
        const isCurrentWeek = week === userProgress?.currentWeek;

        html += `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${week}">
                    <button class="accordion-button ${!isCurrentWeek ? 'collapsed' : ''}" 
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target="#collapse${week}" 
                            aria-expanded="${isCurrentWeek}">
                        <span class="me-3">Week ${week}</span>
                        <span class="text-primary">${weekData.title}</span>
                        ${isCurrentWeek ? '<span class="badge bg-primary ms-auto me-3">Current Week</span>' : ''}
                        ${week < userProgress?.currentWeek ? '<span class="badge bg-success ms-auto me-3">Completed</span>' : ''}
                    </button>
                </h2>
                <div id="collapse${week}" 
                     class="accordion-collapse collapse ${isCurrentWeek ? 'show' : ''}" 
                     data-bs-parent="#weekAccordion">
                    <div class="accordion-body">
                        ${generateWeekContent(week, weekData)}
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    listView.innerHTML = html;
}

function generateWeekContent(weekNum, weekData) {
    let html = '<div class="timeline">';

    weekData.days.forEach((day, index) => {
        const dayNum = index + 1;
        const isCompleted = checkDayCompletion(weekNum, dayNum);
        const isCurrentDay = weekNum === userProgress?.currentWeek && dayNum === userProgress?.currentDay;

        html += `
            <div class="timeline-item ${isCompleted ? 'completed' : ''} ${isCurrentDay ? 'current' : ''}">
                <div class="day-card">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">Day ${dayNum}: ${day.topic}</h6>
                        ${isCompleted ? '<span class="badge bg-success">Completed</span>' : ''}
                        ${isCurrentDay ? '<span class="badge bg-primary">Today</span>' : ''}
                    </div>
                    
                    <div class="mb-3">
                        <strong>Activities:</strong>
                        <ul class="mt-1 mb-0">
                            ${day.activities.map(activity => `<li>${activity}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="mb-3">
                        <strong>Resources:</strong>
                        <div class="resource-links mt-1">
                            ${day.resources.map(resource => `
                                <a href="${resource.url}" target="_blank" title="${resource.description || ''}">
                                    <i class="fas fa-external-link-alt me-1"></i>${resource.name}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                    
                    ${day.practice ? `
                        <div class="mb-3">
                            <strong>Practice:</strong>
                            <div class="resource-links mt-1">
                                ${day.practice.map(practice => `
                                    <a href="${practice.url}" target="_blank" class="text-warning">
                                        <i class="fas fa-code me-1"></i>${practice.name}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${day.project ? `
                        <div class="alert alert-info mt-3">
                            <i class="fas fa-project-diagram me-2"></i>
                            <strong>Project:</strong> ${day.project}
                        </div>
                    ` : ''}
                    
                    <div class="text-end">
                        <small class="text-muted">Estimated time: ${day.time}</small>
                        ${!isCompleted && currentUser ? `
                            <button class="btn btn-sm btn-outline-primary ms-2" 
                                    onclick="markDayComplete(${weekNum}, ${dayNum})">
                                <i class="fas fa-check me-1"></i>Mark Complete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Calendar View
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: generateCalendarEvents(),
        eventClick: function (info) {
            showDayDetails(info.event);
        },
        eventDidMount: function (info) {
            // Add tooltips
            info.el.setAttribute('data-bs-toggle', 'tooltip');
            info.el.setAttribute('data-bs-placement', 'top');
            info.el.setAttribute('title', info.event.extendedProps.description);
            new bootstrap.Tooltip(info.el);
        }
    });

    calendar.render();
}

function generateCalendarEvents() {
    const events = [];
    const startDate = getStartDate();

    for (let week = 1; week <= 14; week++) {
        const weekData = DSA_ROADMAP[`week${week}`];

        weekData.days.forEach((day, index) => {
            const dayNum = index + 1;
            const eventDate = new Date(startDate);
            eventDate.setDate(startDate.getDate() + (week - 1) * 7 + dayNum - 1);

            const isCompleted = checkDayCompletion(week, dayNum);
            const isCurrentDay = week === userProgress?.currentWeek && dayNum === userProgress?.currentDay;

            events.push({
                title: day.topic,
                start: eventDate.toISOString().split('T')[0],
                backgroundColor: isCompleted ? '#10b981' : (isCurrentDay ? '#6366f1' : '#8b5cf6'),
                borderColor: isCompleted ? '#10b981' : (isCurrentDay ? '#6366f1' : '#8b5cf6'),
                extendedProps: {
                    week: week,
                    day: dayNum,
                    description: day.activities.join(', '),
                    completed: isCompleted,
                    ...day
                }
            });
        });
    }

    return events;
}

function getStartDate() {
    // Calculate start date based on current progress
    const today = new Date();
    const currentWeek = userProgress?.currentWeek || 1;
    const currentDay = userProgress?.currentDay || 1;

    const daysElapsed = (currentWeek - 1) * 7 + currentDay - 1;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysElapsed);

    return startDate;
}

// Day Details Modal
function showDayDetails(event) {
    const props = event.extendedProps;

    const modalHTML = `
        <div class="modal fade" id="dayDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            Week ${props.week}, Day ${props.day}: ${event.title}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-4">
                            <h6 class="text-primary">Activities</h6>
                            <ul>
                                ${props.activities.map(activity => `<li>${activity}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="mb-4">
                            <h6 class="text-primary">Learning Resources</h6>
                            <div class="list-group">
                                ${props.resources.map(resource => `
                                    <a href="${resource.url}" target="_blank" 
                                       class="list-group-item list-group-item-action">
                                        <div class="d-flex w-100 justify-content-between">
                                            <h6 class="mb-1">${resource.name}</h6>
                                            <small><i class="fas fa-external-link-alt"></i></small>
                                        </div>
                                        ${resource.description ? `<p class="mb-1">${resource.description}</p>` : ''}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                        
                        ${props.practice ? `
                            <div class="mb-4">
                                <h6 class="text-warning">Practice Problems</h6>
                                <div class="list-group">
                                    ${props.practice.map(practice => `
                                        <a href="${practice.url}" target="_blank" 
                                           class="list-group-item list-group-item-action">
                                            <i class="fas fa-code me-2"></i>${practice.name}
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${props.project ? `
                            <div class="alert alert-info">
                                <h6 class="alert-heading">
                                    <i class="fas fa-project-diagram me-2"></i>Project
                                </h6>
                                <p class="mb-0">${props.project}</p>
                            </div>
                        ` : ''}
                        
                        <div class="text-end">
                            <small class="text-muted">Estimated time: ${props.time}</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        ${!props.completed && currentUser ? `
                            <button class="btn btn-primary" 
                                    onclick="markDayComplete(${props.week}, ${props.day})">
                                <i class="fas fa-check me-1"></i>Mark as Complete
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('dayDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add and show modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('dayDetailsModal'));
    modal.show();
}

// Completion tracking
function checkDayCompletion(week, day) {
    // Check if user has completed this day
    // This would check against the Firebase completions data
    if (!userProgress) return false;

    if (week < userProgress.currentWeek) return true;
    if (week === userProgress.currentWeek && day < userProgress.currentDay) return true;

    return false;
}

async function markDayComplete(week, day) {
    if (!currentUser) {
        showNotification('Please login to track progress', 'warning');
        return;
    }

    try {
        await dbAPI.markTopicComplete(currentUser.uid, week, day, 'daily');

        // Update UI
        showNotification(`Week ${week}, Day ${day} marked as complete!`, 'success');

        // Refresh view
        loadTimetable();

        // Close modal if open
        const modal = bootstrap.Modal.getInstance(document.getElementById('dayDetailsModal'));
        if (modal) modal.hide();

    } catch (error) {
        console.error('Error marking day complete:', error);
        showNotification('Error updating progress', 'error');
    }
}

// Study Plan Generator
function generateStudyPlan() {
    if (!userProgress) {
        showNotification('Please login to generate a study plan', 'warning');
        return;
    }

    const remainingWeeks = 14 - userProgress.currentWeek + 1;
    const remainingDays = remainingWeeks * 7 - userProgress.currentDay + 1;
    const hoursPerDay = 2; // Default study hours

    const studyPlan = {
        startDate: new Date(),
        endDate: new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000),
        totalDays: remainingDays,
        hoursPerDay: hoursPerDay,
        totalHours: remainingDays * hoursPerDay,
        schedule: generateDailySchedule(remainingDays)
    };

    showStudyPlanModal(studyPlan);
}

function generateDailySchedule(days) {
    const schedule = [];
    const startDate = new Date();

    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        schedule.push({
            date: date.toISOString().split('T')[0],
            dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
            studyHours: 2,
            topics: [] // Would be filled with actual topics
        });
    }

    return schedule;
}

function showStudyPlanModal(studyPlan) {
    const modalHTML = `
        <div class="modal fade" id="studyPlanModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Your Personalized Study Plan</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h3 class="text-primary">${studyPlan.totalDays}</h3>
                                        <p class="mb-0">Days Remaining</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h3 class="text-primary">${studyPlan.totalHours}</h3>
                                        <p class="mb-0">Total Study Hours</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Study ${studyPlan.hoursPerDay} hours per day to complete the course by 
                            <strong>${studyPlan.endDate.toLocaleDateString()}</strong>
                        </div>
                        
                        <div class="text-center mt-4">
                            <button class="btn btn-primary" onclick="downloadStudyPlan()">
                                <i class="fas fa-download me-2"></i>Download Study Plan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('studyPlanModal'));
    modal.show();
}

// Export functions
window.changeView = changeView;
window.markDayComplete = markDayComplete;
window.generateStudyPlan = generateStudyPlan;
