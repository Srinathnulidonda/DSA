// js/components.js
// Reusable UI components

class DSAComponents {
    // Progress Ring Component
    static createProgressRing(percentage, size = 60, strokeWidth = 4) {
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        return `
            <div class="progress-ring" style="width: ${size}px; height: ${size}px;">
                <svg width="${size}" height="${size}">
                    <circle 
                        cx="${size / 2}" 
                        cy="${size / 2}" 
                        r="${radius}" 
                        class="progress-ring-circle"
                        stroke="#e5e7eb"
                        stroke-width="${strokeWidth}"
                        fill="none"
                    ></circle>
                    <circle 
                        cx="${size / 2}" 
                        cy="${size / 2}" 
                        r="${radius}" 
                        class="progress-ring-progress"
                        stroke="#3b82f6"
                        stroke-width="${strokeWidth}"
                        fill="none"
                        stroke-linecap="round"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"
                        style="transform: rotate(-90deg); transform-origin: 50% 50%;"
                    ></circle>
                </svg>
                <div class="position-absolute top-50 start-50 translate-middle">
                    <strong>${percentage}%</strong>
                </div>
            </div>
        `;
    }

    // Stats Card Component
    static createStatsCard(title, value, icon, color = 'primary', trend = null) {
        const trendHtml = trend ? `
            <div class="mt-2">
                <span class="badge bg-${trend.positive ? 'success' : 'danger'}">
                    <i class="fas fa-arrow-${trend.positive ? 'up' : 'down'} me-1"></i>
                    ${trend.value}
                </span>
                <small class="ms-2 text-muted">${trend.label}</small>
            </div>
        ` : '';

        return `
            <div class="card stats-card bg-gradient-to-r from-${color}-500 to-${color}-600 text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="mb-1">${value}</h3>
                            <p class="mb-0 opacity-75">${title}</p>
                        </div>
                        <i class="${icon} text-4xl opacity-50"></i>
                    </div>
                    ${trendHtml}
                </div>
            </div>
        `;
    }

    // Empty State Component
    static createEmptyState(icon, title, message, action = null) {
        const actionHtml = action ? `
            <button class="btn btn-primary" onclick="${action.onClick}">
                <i class="${action.icon} me-2"></i>${action.text}
            </button>
        ` : '';

        return `
            <div class="text-center py-5">
                <i class="${icon} text-muted text-6xl mb-3"></i>
                <h5 class="text-muted mb-3">${title}</h5>
                <p class="text-muted mb-4">${message}</p>
                ${actionHtml}
            </div>
        `;
    }

    // Achievement Badge Component
    static createAchievementBadge(achievement) {
        const opacity = achievement.unlocked ? '1' : '0.5';
        const badgeClass = achievement.unlocked ? `bg-${achievement.color}` : 'bg-secondary';

        return `
            <div class="achievement-card p-3 border rounded h-100" style="opacity: ${opacity}">
                <div class="d-flex align-items-center mb-2">
                    <div class="achievement-icon ${badgeClass} text-white rounded-circle p-2 me-3">
                        <i class="${achievement.icon}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${achievement.title}</h6>
                        <small class="text-muted">${achievement.description}</small>
                    </div>
                    ${achievement.unlocked ?
                '<i class="fas fa-check-circle text-success"></i>' :
                '<i class="fas fa-lock text-muted"></i>'
            }
                </div>
                ${achievement.date ?
                `<small class="text-muted">Unlocked: ${new Date(achievement.date).toLocaleDateString()}</small>` :
                ''
            }
            </div>
        `;
    }

    // Resource Card Component
    static createResourceCard(resource) {
        const typeColors = {
            video: 'danger',
            text: 'primary',
            practice: 'success',
            interactive: 'warning'
        };

        const typeIcons = {
            video: 'fa-video',
            text: 'fa-file-alt',
            practice: 'fa-code',
            interactive: 'fa-hand-pointer'
        };

        return `
            <div class="resource-card h-100">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0">${resource.title}</h6>
                    <span class="badge resource-type-${resource.type}">
                        <i class="fas ${typeIcons[resource.type]} me-1"></i>
                        ${resource.type}
                    </span>
                </div>
                ${resource.description ? `<p class="text-muted small mb-3">${resource.description}</p>` : ''}
                <div class="d-flex justify-content-between align-items-center">
                    ${resource.duration ?
                `<small class="text-muted"><i class="fas fa-clock me-1"></i>${resource.duration}</small>` :
                '<span></span>'
            }
                    <a href="${resource.url}" target="_blank" class="btn btn-outline-${typeColors[resource.type]} btn-sm">
                        <i class="fas fa-external-link-alt me-1"></i>Open
                    </a>
                </div>
            </div>
        `;
    }

    // Timeline Item Component
    static createTimelineItem(item) {
        return `
            <div class="timeline-item">
                <div class="timeline-marker ${item.completed ? 'bg-success' : 'bg-primary'}"></div>
                <div class="timeline-content">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${item.title}</h6>
                            <p class="text-muted mb-1">${item.description}</p>
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>${item.date}
                            </small>
                        </div>
                        ${item.completed ?
                '<i class="fas fa-check-circle text-success"></i>' :
                `<span class="badge bg-primary">${item.status || 'Pending'}</span>`
            }
                    </div>
                </div>
            </div>
        `;
    }

    // Task Card Component
    static createTaskCard(task) {
        const priorityColors = {
            high: 'danger',
            medium: 'warning',
            low: 'success'
        };

        return `
            <div class="task-card mb-3 p-3 border rounded ${task.completed ? 'opacity-75' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="form-check">
                        <input 
                            class="form-check-input" 
                            type="checkbox" 
                            id="task-${task.id}"
                            ${task.completed ? 'checked' : ''}
                            onchange="toggleTask('${task.id}')"
                        >
                        <label class="form-check-label ${task.completed ? 'text-decoration-line-through' : ''}" 
                               for="task-${task.id}">
                            <h6 class="mb-1">${task.title}</h6>
                            <p class="text-muted mb-1 small">${task.description}</p>
                            <div class="d-flex gap-2 mt-1">
                                ${task.dueDate ?
                `<small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>${task.dueDate}
                                    </small>` : ''
            }
                                ${task.priority ?
                `<span class="badge bg-${priorityColors[task.priority]}">${task.priority}</span>` : ''
            }
                                ${task.tags ?
                task.tags.map(tag =>
                    `<span class="badge bg-secondary">${tag}</span>`
                ).join('') : ''
            }
                            </div>
                        </label>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-link text-muted p-0" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="#" onclick="editTask('${task.id}')">
                                <i class="fas fa-edit me-2"></i>Edit
                            </a></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteTask('${task.id}')">
                                <i class="fas fa-trash me-2"></i>Delete
                            </a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    // Notification Item Component
    static createNotificationItem(notification) {
        const typeIcons = {
            info: 'fa-info-circle text-info',
            success: 'fa-check-circle text-success',
            warning: 'fa-exclamation-triangle text-warning',
            error: 'fa-exclamation-circle text-danger'
        };

        return `
            <div class="notification-item p-3 border-bottom ${notification.is_read ? '' : 'bg-light'}">
                <div class="d-flex align-items-start">
                    <div class="flex-shrink-0 me-3">
                        <i class="fas ${typeIcons[notification.type] || typeIcons.info}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${notification.title}</h6>
                        <p class="mb-1 small">${notification.message}</p>
                        <small class="text-muted">
                            ${DSAApp.DateUtils.relative(notification.created_at)}
                        </small>
                    </div>
                    ${!notification.is_read ?
                `<button class="btn btn-sm btn-link" onclick="markNotificationRead('${notification.id}')">
                            <i class="fas fa-times"></i>
                        </button>` : ''
            }
                </div>
            </div>
        `;
    }

    // Chart Legend Component
    static createChartLegend(items) {
        return `
            <div class="d-flex flex-wrap gap-3">
                ${items.map(item => `
                    <div class="d-flex align-items-center">
                        <div class="bg-${item.color} rounded me-2" 
                             style="width: 12px; height: 12px;"></div>
                        <small>${item.label}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Search Result Component
    static createSearchResult(result) {
        const typeIcons = {
            note: 'fa-sticky-note',
            resource: 'fa-book',
            topic: 'fa-graduation-cap',
            user: 'fa-user'
        };

        return `
            <div class="search-result" onclick="navigateToResult('${result.type}', '${result.id}')">
                <div class="d-flex align-items-start">
                    <div class="flex-shrink-0 me-3">
                        <i class="fas ${typeIcons[result.type] || 'fa-file'} text-primary"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${this.highlightSearchTerm(result.title, result.searchTerm)}</h6>
                        <p class="mb-1 small text-muted">
                            ${this.highlightSearchTerm(result.excerpt, result.searchTerm)}
                        </p>
                        <small class="text-muted">${result.type} • ${result.date}</small>
                    </div>
                </div>
            </div>
        `;
    }

    // Highlight search term in text
    static highlightSearchTerm(text, term) {
        if (!term) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Pagination Component
    static createPagination(currentPage, totalPages, onPageChange) {
        if (totalPages <= 1) return '';

        let pages = [];
        const maxVisible = 5;

        // Calculate page range
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        let html = '<nav><ul class="pagination justify-content-center">';

        // Previous button
        html += `
            <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="${onPageChange}(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // First page and ellipsis
        if (start > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="${onPageChange}(1)">1</a>
                </li>
            `;
            if (start > 2) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Page numbers
        for (let i = start; i <= end; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="${onPageChange}(${i})">${i}</a>
                </li>
            `;
        }

        // Last page and ellipsis
        if (end < totalPages) {
            if (end < totalPages - 1) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="${onPageChange}(${totalPages})">${totalPages}</a>
                </li>
            `;
        }

        // Next button
        html += `
            <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="${onPageChange}(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        html += '</ul></nav>';
        return html;
    }

    // User Avatar Component
    static createUserAvatar(user, size = 'md') {
        const sizes = {
            sm: 32,
            md: 48,
            lg: 64,
            xl: 96
        };

        const sizeValue = sizes[size] || sizes.md;

        if (user.avatar_url) {
            return `
                <img src="${user.avatar_url}" 
                     alt="${user.name}" 
                     class="rounded-circle"
                     style="width: ${sizeValue}px; height: ${sizeValue}px; object-fit: cover;">
            `;
        } else {
            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            return `
                <div class="avatar-placeholder rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                     style="width: ${sizeValue}px; height: ${sizeValue}px; font-size: ${sizeValue / 3}px;">
                    ${initials}
                </div>
            `;
        }
    }

    // Badge Component
    static createBadge(text, color = 'primary', icon = null) {
        const iconHtml = icon ? `<i class="${icon} me-1"></i>` : '';
        return `<span class="badge bg-${color}">${iconHtml}${text}</span>`;
    }

    // Alert Component
    static createAlert(message, type = 'info', dismissible = true) {
        const icons = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        return `
            <div class="alert alert-${type} ${dismissible ? 'alert-dismissible' : ''} fade show" role="alert">
                <i class="fas ${icons[type]} me-2"></i>
                ${message}
                ${dismissible ? '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>' : ''}
            </div>
        `;
    }

    // Loading Button Component
    static createLoadingButton(text, loadingText = 'Loading...', icon = null) {
        const iconHtml = icon ? `<i class="${icon} me-2"></i>` : '';

        return `
            <button type="button" class="btn btn-primary position-relative" disabled>
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                ${loadingText}
            </button>
        `;
    }
}

// Export for use
window.DSAComponents = DSAComponents;