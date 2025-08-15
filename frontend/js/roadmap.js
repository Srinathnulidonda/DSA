// roadmap.js - Roadmap page functionality

let roadmapData = [];
let userProgress = {};
let currentFilter = 'all';

// Initialize roadmap
document.addEventListener('DOMContentLoaded', async () => {
    await loadRoadmapData();
    renderRoadmap();
    setupEventListeners();
    checkURLParams();
    AOS.init({ duration: 1000, once: true });
});

// Load roadmap data
async function loadRoadmapData() {
    try {
        window.DSAApp.showLoader();

        const [roadmapResponse, progressResponse] = await Promise.all([
            window.API.getRoadmap(),
            window.API.getProgress()
        ]);

        roadmapData = roadmapResponse.data.roadmap;
        userProgress = progressResponse.data.progress;

        updateProgressOverview(progressResponse.data.statistics);

    } catch (error) {
        console.error('Failed to load roadmap data:', error);
        window.DSAApp.showToast('Failed to load roadmap', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
}

// Render roadmap
function renderRoadmap() {
    const container = document.getElementById('roadmapContainer');
    if (!container) return;

    container.innerHTML = '';

    roadmapData.forEach((week, index) => {
        if (shouldShowWeek(week, index + 1)) {
            container.appendChild(createWeekCard(week, index + 1));
        }
    });
}

// Should show week based on filter
function shouldShowWeek(week, weekNumber) {
    if (currentFilter === 'all') return true;

    const weekProgress = getWeekProgress(weekNumber);

    if (currentFilter === 'completed') {
        return weekProgress.completed === 7;
    } else if (currentFilter === 'current') {
        return weekProgress.completed > 0 && weekProgress.completed < 7;
    }

    return true;
}

// Get week progress
function getWeekProgress(weekNumber) {
    let completed = 0;
    let totalTime = 0;

    for (let day = 1; day <= 7; day++) {
        const key = `week${weekNumber}_day${day}`;
        if (userProgress[key]?.completed) {
            completed++;
            totalTime += userProgress[key].time_spent || 0;
        }
    }

    return { completed, totalTime };
}

// Create week card
function createWeekCard(week, weekNumber) {
    const weekProgress = getWeekProgress(weekNumber);
    const status = getWeekStatus(weekProgress);

    const card = document.createElement('div');
    card.className = `week-card ${status}`;
    card.setAttribute('data-aos', 'fade-up');
    card.setAttribute('data-aos-delay', weekNumber * 50);

    card.innerHTML = `
        <div class="card border-0 shadow-sm rounded-4 hover-shadow">
            <div class="card-body p-4">
                <div class="row align-items-center">
                    <div class="col-lg-8">
                        <div class="d-flex align-items-center mb-3">
                            <h4 class="fw-bold mb-0">Week ${week.week}: ${week.title}</h4>
                            ${renderStatusBadge(status)}
                        </div>
                        <p class="text-muted mb-3">${week.goal}</p>
                        
                        <div class="progress mb-3" style="height: 8px;">
                            <div class="progress-bar bg-gradient-to-r from-blue-500 to-purple-600" 
                                 style="width: ${(weekProgress.completed / 7) * 100}%"></div>
                        </div>
                        
                        <div class="d-flex flex-wrap gap-3 text-sm">
                            <span><i class="fas fa-check-circle text-success me-1"></i> ${weekProgress.completed}/7 days</span>
                            <span><i class="fas fa-clock text-info me-1"></i> ${window.DSAApp.formatTime(weekProgress.totalTime)}</span>
                            <span><i class="fas fa-project-diagram text-warning me-1"></i> ${week.project.title}</span>
                        </div>
                    </div>
                    <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
                        <button class="btn btn-primary rounded-pill" onclick="viewWeekDetails(${weekNumber})">
                            <i class="fas fa-arrow-right me-2"></i> View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Get week status
function getWeekStatus(weekProgress) {
    if (weekProgress.completed === 7) return 'completed';
    if (weekProgress.completed > 0) return 'current';
    return 'locked';
}

// Render status badge
function renderStatusBadge(status) {
    const badges = {
        completed: '<span class="badge bg-success ms-3">Completed</span>',
        current: '<span class="badge bg-warning ms-3">In Progress</span>',
        locked: '<span class="badge bg-secondary ms-3">Locked</span>'
    };
    return badges[status] || '';
}

// View week details
function viewWeekDetails(weekNumber) {
    const week = roadmapData[weekNumber - 1];
    if (!week) return;

    const modal = new bootstrap.Modal(document.getElementById('weekDetailModal'));

    document.getElementById('weekModalTitle').textContent = `Week ${week.week}: ${week.title}`;
    document.getElementById('weekModalBody').innerHTML = renderWeekDetails(week, weekNumber);

    modal.show();
}

// Render week details
function renderWeekDetails(week, weekNumber) {
    let detailsHTML = `
        <div class="mb-4">
            <h5 class="fw-bold mb-3">Weekly Goal</h5>
            <p>${week.goal}</p>
        </div>
        
        <div class="mb-4">
            <h5 class="fw-bold mb-3">Daily Schedule</h5>
            <div class="row">
    `;

    week.days.forEach((day, index) => {
        const dayNumber = index + 1;
        const key = `week${weekNumber}_day${dayNumber}`;
        const isCompleted = userProgress[key]?.completed;

        detailsHTML += `
            <div class="col-md-6 mb-3">
                <div class="day-detail-card p-3 rounded-3 bg-light ${isCompleted ? 'completed' : ''}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold mb-0">${day.day}: ${day.topic}</h6>
                        ${isCompleted ? '<i class="fas fa-check-circle text-success"></i>' : ''}
                    </div>
                    <p class="text-muted small mb-2">${day.activities}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i> ${day.time_estimate} min
                        </small>
                        ${day.resources.length > 0 ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="showResources([${day.resources.map(r => `'${r}'`).join(',')}])">
                                <i class="fas fa-book me-1"></i> Resources
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    detailsHTML += `
            </div>
        </div>
        
        <div class="mb-4">
            <h5 class="fw-bold mb-3">Week Project</h5>
            <div class="project-card p-4 rounded-3 bg-primary bg-opacity-10">
                <h6 class="fw-bold text-primary mb-2">${week.project.title}</h6>
                <p class="mb-3">${week.project.description}</p>
                <div class="d-flex flex-wrap gap-2">
                    ${week.project.skills.map(skill =>
        `<span class="badge bg-primary">${skill}</span>`
    ).join('')}
                </div>
            </div>
        </div>
    `;

    return detailsHTML;
}

// Show resources
async function showResources(resourceIds) {
    try {
        const resourcesResponse = await window.API.getResources();
        const allResources = resourcesResponse.data.resources;

        const selectedResources = resourceIds.map(id => allResources[id]).filter(Boolean);

        // Create resources modal
        const modalHTML = `
            <div class="modal fade" id="resourcesModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">Learning Resources</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                ${selectedResources.map(resource => `
                                    <div class="col-md-6 mb-3">
                                        <div class="resource-card p-3 rounded-3 border">
                                            <div class="d-flex align-items-start">
                                                <div class="resource-icon me-3">
                                                    <i class="fas fa-${getResourceIcon(resource.type)} fs-4 text-primary"></i>
                                                </div>
                                                <div class="flex-grow-1">
                                                    <h6 class="mb-1">${resource.title}</h6>
                                                    <span class="badge bg-secondary mb-2">${resource.type}</span>
                                                    <br>
                                                    <a href="${resource.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                                                        Open Resource <i class="fas fa-external-link-alt ms-1"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('resourcesModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const resourcesModal = new bootstrap.Modal(document.getElementById('resourcesModal'));
        resourcesModal.show();

    } catch (error) {
        console.error('Failed to load resources:', error);
        window.DSAApp.showToast('Failed to load resources', 'error');
    }
}

// Get resource icon
function getResourceIcon(type) {
    const icons = {
        'text': 'file-alt',
        'video': 'video',
        'interactive': 'laptop-code',
        'practice': 'code'
    };
    return icons[type] || 'book';
}

// Update progress overview
function updateProgressOverview(statistics) {
    const overviewCard = document.querySelector('.progress-overview');
    if (!overviewCard) return;

    // Update progress bar
    const progressBar = overviewCard.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${statistics.completion_percentage}%`;
        progressBar.textContent = `${statistics.completion_percentage}% Complete`;
    }

    // Update stats
    document.querySelector('#weeksCompleted').textContent = Math.floor(statistics.total_completed / 7);
    document.querySelector('#totalTimeInvested').textContent = window.DSAApp.formatTime(statistics.total_time_minutes);
}

// Filter by status
window.filterByStatus = function (status) {
    currentFilter = status;
    renderRoadmap();

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === status) {
            btn.classList.add('active');
        }
    });
};

// Start week
window.startWeek = function () {
    const modal = bootstrap.Modal.getInstance(document.getElementById('weekDetailModal'));
    modal.hide();

    // Get current week from modal
    const weekTitle = document.getElementById('weekModalTitle').textContent;
    const weekNumber = parseInt(weekTitle.match(/Week (\d+)/)[1]);

    // Navigate to first incomplete day
    const firstIncompleteDay = findFirstIncompleteDay(weekNumber);
    if (firstIncompleteDay) {
        window.location.href = `/study.html?week=${weekNumber}&day=${firstIncompleteDay}`;
    }
};

// Find first incomplete day in week
function findFirstIncompleteDay(weekNumber) {
    for (let day = 1; day <= 7; day++) {
        const key = `week${weekNumber}_day${day}`;
        if (!userProgress[key]?.completed) {
            return day;
        }
    }
    return 1; // Default to day 1 if all completed
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchRoadmap');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchRoadmap, 300));
    }

    // Export roadmap
    document.getElementById('exportRoadmap')?.addEventListener('click', exportRoadmap);
}

// Search roadmap
function searchRoadmap(event) {
    const query = event.target.value.toLowerCase();

    document.querySelectorAll('.week-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? 'block' : 'none';
    });
}

// Export roadmap as PDF
async function exportRoadmap() {
    try {
        window.DSAApp.showToast('Generating roadmap PDF...', 'info');

        // In a real app, this would call a backend API to generate PDF
        // For now, we'll create a simple print view
        window.print();

    } catch (error) {
        console.error('Failed to export roadmap:', error);
        window.DSAApp.showToast('Failed to export roadmap', 'error');
    }
}

// Check URL params
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const week = urlParams.get('week');
    const day = urlParams.get('day');

    if (week) {
        // Scroll to specific week
        setTimeout(() => {
            const weekCard = document.querySelector(`.week-card:nth-child(${week})`);
            if (weekCard) {
                weekCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                weekCard.classList.add('highlight');

                // Open week details if day is specified
                if (day) {
                    viewWeekDetails(parseInt(week));
                }
            }
        }, 500);
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}