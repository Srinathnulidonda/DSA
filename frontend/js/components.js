// Reusable UI Components

// Create Progress Ring Component
function createProgressRing(percentage, size = 120, strokeWidth = 8) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return `
        <svg width="${size}" height="${size}" class="progress-ring">
            <circle
                cx="${size / 2}"
                cy="${size / 2}"
                r="${radius}"
                stroke="#e5e7eb"
                stroke-width="${strokeWidth}"
                fill="none"
            />
            <circle
                cx="${size / 2}"
                cy="${size / 2}"
                r="${radius}"
                stroke="#6366f1"
                stroke-width="${strokeWidth}"
                fill="none"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                stroke-linecap="round"
                transform="rotate(-90 ${size / 2} ${size / 2})"
                style="transition: stroke-dashoffset 0.5s ease"
            />
            <text
                x="50%"
                y="50%"
                text-anchor="middle"
                dy="0.3em"
                font-size="24"
                font-weight="bold"
                fill="#1e293b"
            >
                ${percentage}%
            </text>
        </svg>
    `;
}

// Create Activity Timeline Component
function createActivityTimeline(activities) {
    if (!activities || activities.length === 0) {
        return '<p class="text-muted text-center">No recent activity</p>';
    }

    return activities.map((activity, index) => `
        <div class="timeline-item ${index === activities.length - 1 ? 'last' : ''}">
            <div class="timeline-marker">
                <i class="fas fa-${activity.icon || 'circle'}"></i>
            </div>
            <div class="timeline-content">
                <h6 class="mb-1">${activity.title}</h6>
                <p class="text-muted mb-0">${activity.description}</p>
                <small class="text-muted">${formatDate(activity.timestamp)}</small>
            </div>
        </div>
    `).join('');
}

// Create Stats Card Component
function createStatsCard(title, value, icon, color = 'primary', trend = null) {
    return `
        <div class="card border-0 shadow-sm stats-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="text-muted mb-2">${title}</h6>
                        <h3 class="mb-0">${value}</h3>
                        ${trend ? `
                            <small class="text-${trend.positive ? 'success' : 'danger'}">
                                <i class="fas fa-arrow-${trend.positive ? 'up' : 'down'}"></i>
                                ${trend.value}
                            </small>
                        ` : ''}
                    </div>
                    <div class="stats-icon bg-${color} bg-opacity-10">
                        <i class="fas fa-${icon} text-${color}"></i>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Create Empty State Component
function createEmptyState(icon, title, message, actionButton = null) {
    return `
        <div class="empty-state text-center py-5">
            <div class="mb-4">
                <i class="fas fa-${icon} text-muted" style="font-size: 4rem;"></i>
            </div>
            <h5 class="mb-2">${title}</h5>
            <p class="text-muted mb-4">${message}</p>
            ${actionButton ? `
                <a href="${actionButton.href}" class="btn btn-primary">
                    ${actionButton.text}
                </a>
            ` : ''}
        </div>
    `;
}

// Create Loading Skeleton
function createLoadingSkeleton(type = 'card', count = 1) {
    const skeletons = {
        card: `
            <div class="card border-0 shadow-sm">
                <div class="card-body">
                    <div class="skeleton-text" style="width: 60%;"></div>
                    <div class="skeleton-text" style="width: 40%;"></div>
                    <div class="skeleton-box" style="height: 100px; margin-top: 1rem;"></div>
                </div>
            </div>
        `,
        list: `
            <div class="d-flex align-items-center mb-3">
                <div class="skeleton-box me-3" style="width: 40px; height: 40px; border-radius: 50%;"></div>
                <div class="flex-grow-1">
                    <div class="skeleton-text" style="width: 60%;"></div>
                    <div class="skeleton-text" style="width: 40%;"></div>
                </div>
            </div>
        `,
        table: `
            <tr>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
            </tr>
        `
    };

    return Array(count).fill(skeletons[type] || skeletons.card).join('');
}

// Create Notification Item
function createNotificationItem(notification) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    return `
        <div class="notification-item p-3 border-bottom ${notification.is_read ? '' : 'bg-light'}">
            <div class="d-flex">
                <div class="me-3">
                    <i class="fas fa-${icons[notification.type] || icons.info} text-${notification.type}"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${notification.title}</h6>
                    <p class="mb-1 text-muted small">${notification.message}</p>
                    <small class="text-muted">${formatDate(notification.created_at)}</small>
                </div>
                ${!notification.is_read ? `
                    <button class="btn btn-sm btn-link" onclick="markNotificationRead('${notification.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Create Resource Card
function createResourceCard(resource) {
    const typeIcons = {
        text: 'book',
        video: 'play-circle',
        interactive: 'laptop-code',
        practice: 'code'
    };

    const typeColors = {
        text: 'primary',
        video: 'danger',
        interactive: 'success',
        practice: 'warning'
    };

    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 border-0 shadow-sm hover-shadow">
                <div class="card-body">
                    <div class="d-flex align-items-start mb-3">
                        <div class="me-3">
                            <div class="bg-${typeColors[resource.type]} bg-opacity-10 rounded-circle p-3">
                                <i class="fas fa-${typeIcons[resource.type]} text-${typeColors[resource.type]} fs-4"></i>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <h5 class="card-title mb-1">${resource.title}</h5>
                            <span class="badge bg-${typeColors[resource.type]} bg-opacity-10 text-${typeColors[resource.type]}">
                                ${resource.type}
                            </span>
                        </div>
                    </div>
                    <a href="${resource.url}" target="_blank" class="btn btn-outline-primary w-100">
                        Open Resource <i class="fas fa-external-link-alt ms-2"></i>
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Create Calendar Day
function createCalendarDay(date, events = [], isToday = false, isCurrentMonth = true) {
    const hasEvents = events.length > 0;
    const isCompleted = events.some(e => e.completed);

    return `
        <div class="calendar-day ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''} ${hasEvents ? 'has-events' : ''}">
            <div class="day-number">${date.getDate()}</div>
            ${hasEvents ? `
                <div class="day-events">
                    ${events.slice(0, 3).map(event => `
                        <div class="event-dot ${event.completed ? 'completed' : ''}" 
                             title="${event.title}"></div>
                    `).join('')}
                    ${events.length > 3 ? `<span class="more-events">+${events.length - 3}</span>` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

// Create Search Results
function createSearchResults(results, query) {
    if (!results || Object.keys(results).length === 0) {
        return createEmptyState('search', 'No Results Found', `No results found for "${query}"`);
    }

    let html = '';

    // Resources
    if (results.resources && results.resources.length > 0) {
        html += `
            <div class="mb-4">
                <h5 class="mb-3">Resources (${results.resources_total || results.resources.length})</h5>
                <div class="row">
                    ${results.resources.map(resource => createResourceCard(resource)).join('')}
                </div>
            </div>
        `;
    }

    // Roadmap
    if (results.roadmap && results.roadmap.length > 0) {
        html += `
            <div class="mb-4">
                <h5 class="mb-3">Roadmap Weeks</h5>
                ${results.roadmap.map(week => `
                    <div class="card mb-2">
                        <div class="card-body">
                            <h6 class="mb-1">Week ${week.week}: ${week.title}</h6>
                            <p class="text-muted mb-0">${week.goal}</p>
                            <a href="roadmap.html?week=${week.week}" class="stretched-link"></a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Notes
    if (results.notes && results.notes.length > 0) {
        html += `
            <div class="mb-4">
                <h5 class="mb-3">Notes</h5>
                ${results.notes.map(note => `
                    <div class="card mb-2">
                        <div class="card-body">
                            <h6 class="mb-1">${note.title}</h6>
                            <p class="text-muted mb-2">${note.content}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${formatDate(note.updated_at)}</small>
                                <a href="notes.html?id=${note.id}" class="btn btn-sm btn-outline-primary">
                                    View Note
                                </a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return html;
}

// Export components
window.UIComponents = {
    createProgressRing,
    createActivityTimeline,
    createStatsCard,
    createEmptyState,
    createLoadingSkeleton,
    createNotificationItem,
    createResourceCard,
    createCalendarDay,
    createSearchResults
};