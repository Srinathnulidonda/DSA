// progress.js - Progress tracking functionality

let progressCharts = {};
let progressData = {};

// Initialize progress page
document.addEventListener('DOMContentLoaded', async () => {
    await loadProgressData();
    initializeCharts();
    setupEventListeners();
    renderProgressTable();
});

// Load progress data
async function loadProgressData() {
    try {
        window.DSAApp.showLoader();

        const [progress, analytics, streaks] = await Promise.all([
            window.API.getProgress(),
            window.API.getAnalytics(30),
            window.API.getStreaks()
        ]);

        progressData = {
            progress: progress.data,
            analytics: analytics.data,
            streaks: streaks.data
        };

        updateProgressStats();
        updateAchievements();

    } catch (error) {
        console.error('Failed to load progress data:', error);
        window.DSAApp.showToast('Failed to load progress data', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
}

// Update progress statistics
function updateProgressStats() {
    const { statistics } = progressData.progress;

    // Update stat cards
    document.querySelector('#totalStudyTime').textContent = window.DSAApp.formatTime(statistics.total_time_minutes);
    document.querySelector('#topicsCompleted').textContent = `${statistics.total_completed} / 98`;
    document.querySelector('#completionPercentage').textContent = `${statistics.completion_percentage}%`;

    // Update streak info
    document.querySelector('#currentStreak').textContent = `${progressData.streaks.current_streak} Days`;
    document.querySelector('#bestStreak').textContent = `Best: ${progressData.streaks.longest_streak} days`;

    // Calculate problems solved (mock data for demo)
    const problemsSolved = Math.floor(statistics.total_completed * 3.7);
    document.querySelector('#problemsSolved').textContent = problemsSolved;
}

// Initialize charts
function initializeCharts() {
    // Study Time Chart
    const studyTimeCtx = document.getElementById('studyTimeChart')?.getContext('2d');
    if (studyTimeCtx) {
        progressCharts.studyTime = new Chart(studyTimeCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Study Time (minutes)',
                    data: [],
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return value + ' min';
                            }
                        }
                    }
                }
            }
        });
    }

    // Topic Distribution Chart
    const topicCtx = document.getElementById('topicChart')?.getContext('2d');
    if (topicCtx) {
        progressCharts.topics = new Chart(topicCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Update charts with data
    updateCharts();
}

// Update charts with data
function updateCharts() {
    const { progress_timeline, weekly_progress } = progressData.analytics;

    // Update study time chart
    if (progressCharts.studyTime && progress_timeline) {
        progressCharts.studyTime.data.labels = progress_timeline.map(d =>
            new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        progressCharts.studyTime.data.datasets[0].data = progress_timeline.map(d => d.time_spent);
        progressCharts.studyTime.update();
    }

    // Update topic distribution
    updateTopicDistribution();
}

// Update topic distribution chart
function updateTopicDistribution() {
    if (!progressCharts.topics) return;

    // Calculate topic distribution from progress
    const topicCounts = {};
    const { progress } = progressData.progress;

    Object.entries(progress).forEach(([key, value]) => {
        if (value.completed) {
            const weekNum = parseInt(key.match(/week(\d+)/)[1]);
            const week = window.DSAApp.ROADMAP[weekNum - 1];
            if (week) {
                const topic = week.title.split(' ')[0]; // Simplified topic extraction
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
        }
    });

    // Update chart
    progressCharts.topics.data.labels = Object.keys(topicCounts);
    progressCharts.topics.data.datasets[0].data = Object.values(topicCounts);
    progressCharts.topics.update();
}

// Update achievements
function updateAchievements() {
    const achievementsContainer = document.querySelector('.achievements-grid');
    if (!achievementsContainer) return;

    // Define achievements
    const achievements = [
        {
            id: 'streak-30',
            title: 'Fire Starter',
            description: '30 Day Streak',
            icon: 'fire',
            unlocked: progressData.streaks.longest_streak >= 30
        },
        {
            id: 'week-master',
            title: 'Week Master',
            description: 'Complete 5 Weeks',
            icon: 'calendar-check',
            unlocked: progressData.progress.statistics.total_completed >= 35
        },
        {
            id: 'problem-solver',
            title: 'Problem Solver',
            description: 'Solve 100 Problems',
            icon: 'code',
            unlocked: progressData.progress.statistics.total_completed >= 27
        },
        {
            id: 'early-bird',
            title: 'Early Bird',
            description: 'Study before 6 AM',
            icon: 'sun',
            unlocked: false // Would check actual study times
        }
    ];

    // Render achievements
    achievementsContainer.innerHTML = achievements.map(achievement => `
        <div class="col-md-3 col-6 mb-3">
            <div class="achievement-card text-center p-3 rounded-3 bg-light ${achievement.unlocked ? '' : 'opacity-50'}">
                <div class="achievement-icon mb-2">
                    ${achievement.unlocked ?
            `<i class="fas fa-${achievement.icon} fs-1 text-warning"></i>` :
            `<i class="fas fa-lock fs-1 text-muted"></i>`
        }
                </div>
                <h6 class="fw-bold mb-1">${achievement.unlocked ? achievement.title : '???'}</h6>
                <small class="text-muted">${achievement.description}</small>
            </div>
        </div>
    `).join('');
}

// Render progress table
function renderProgressTable() {
    const tableBody = document.getElementById('progressTableBody');
    if (!tableBody) return;

    const { progress } = progressData.progress;
    const rows = [];

    // Convert progress to table rows
    window.DSAApp.ROADMAP.forEach((week, weekIndex) => {
        week.days.forEach((day, dayIndex) => {
            const key = `week${weekIndex + 1}_day${dayIndex + 1}`;
            const progressEntry = progress[key] || {};

            rows.push({
                week: weekIndex + 1,
                day: dayIndex + 1,
                topic: day.topic,
                completed: progressEntry.completed || false,
                timeSpent: progressEntry.time_spent || 0,
                completionDate: progressEntry.completion_date,
                activities: day.activities
            });
        });
    });

    // Render table rows
    tableBody.innerHTML = rows.map(row => `
        <tr class="${row.completed ? 'table-success' : ''}">
            <td>Week ${row.week}</td>
            <td>${row.topic}</td>
            <td>
                ${row.completed ?
            '<span class="badge bg-success">Completed</span>' :
            '<span class="badge bg-secondary">Pending</span>'
        }
            </td>
            <td>${window.DSAApp.formatTime(row.timeSpent)}</td>
            <td>${row.completionDate ? new Date(row.completionDate).toLocaleDateString() : '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewTopicDetails(${row.week}, ${row.day})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// View topic details
window.viewTopicDetails = function (week, day) {
    const weekData = window.DSAApp.ROADMAP[week - 1];
    const dayData = weekData.days[day - 1];

    // Create modal
    const modalHTML = `
        <div class="modal fade" id="topicDetailModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">${dayData.topic}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Week ${week}, Day ${day}</strong></p>
                        <p>${dayData.activities}</p>
                        <p><i class="fas fa-clock me-2"></i>Estimated time: ${dayData.time_estimate} minutes</p>
                        
                        ${dayData.resources.length > 0 ? `
                            <h6 class="fw-bold mt-3">Resources:</h6>
                            <div class="list-group">
                                ${dayData.resources.map(resourceId => {
        const resource = window.DSAApp.RESOURCES[resourceId];
        return resource ? `
                                        <a href="${resource.url}" target="_blank" class="list-group-item list-group-item-action">
                                            <i class="fas fa-external-link-alt me-2"></i>${resource.title}
                                        </a>
                                    ` : '';
    }).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="startStudying(${week}, ${day})">
                            Start Studying
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('topicDetailModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('topicDetailModal'));
    modal.show();
};

// Start studying
window.startStudying = function (week, day) {
    window.location.href = `/study.html?week=${week}&day=${day}`;
};

// Generate progress report
window.generateReport = async function () {
    try {
        window.DSAApp.showLoader();
        window.DSAApp.showToast('Generating progress report...', 'info');

        // Prepare report data
        const reportData = {
            user: window.DSAApp.AppState.user,
            progress: progressData.progress,
            streaks: progressData.streaks,
            generatedAt: new Date().toISOString()
        };

        // In a real app, this would call a backend API to generate PDF
        // For demo, we'll create a printable view
        createPrintableReport(reportData);

    } catch (error) {
        console.error('Failed to generate report:', error);
        window.DSAApp.showToast('Failed to generate report', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Create printable report
function createPrintableReport(data) {
    const reportWindow = window.open('', '_blank');

    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>DSA Progress Report - ${data.user.username}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                @media print {
                    .no-print { display: none; }
                }
                body { font-family: Arial, sans-serif; }
                .header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
            </style>
        </head>
        <body class="p-4">
            <div class="header">
                <h1>DSA Learning Progress Report</h1>
                <p>Generated for: ${data.user.username} | Date: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h2>Summary</h2>
            <ul>
                <li>Total Study Time: ${window.DSAApp.formatTime(data.progress.statistics.total_time_minutes)}</li>
                <li>Topics Completed: ${data.progress.statistics.total_completed} / 98 (${data.progress.statistics.completion_percentage}%)</li>
                <li>Current Streak: ${data.streaks.current_streak} days</li>
                <li>Longest Streak: ${data.streaks.longest_streak} days</li>
            </ul>
            
            <h2>Weekly Progress</h2>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Week</th>
                        <th>Completion</th>
                        <th>Time Spent</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateWeeklyReportRows()}
                </tbody>
            </table>
            
            <button class="btn btn-primary no-print" onclick="window.print()">Print Report</button>
        </body>
        </html>
    `;

    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
}

// Generate weekly report rows
function generateWeeklyReportRows() {
    const weeklyData = [];

    for (let week = 1; week <= 14; week++) {
        let completed = 0;
        let timeSpent = 0;

        for (let day = 1; day <= 7; day++) {
            const key = `week${week}_day${day}`;
            const progress = progressData.progress.progress[key];
            if (progress?.completed) {
                completed++;
                timeSpent += progress.time_spent || 0;
            }
        }

        weeklyData.push(`
            <tr>
                <td>Week ${week}</td>
                <td>${completed} / 7 days</td>
                <td>${window.DSAApp.formatTime(timeSpent)}</td>
            </tr>
        `);
    }

    return weeklyData.join('');
}

// Setup event listeners
function setupEventListeners() {
    // Time range buttons
    document.querySelectorAll('.btn-group button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Remove active class from all buttons
            e.target.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Update chart based on selected range
            const range = e.target.textContent.toLowerCase();
            await updateChartRange(range);
        });
    });

    // Search functionality
    const searchInput = document.querySelector('input[placeholder="Search topics..."]');
    if (searchInput) {
        searchInput.addEventListener('input', filterProgressTable);
    }
}

// Update chart range
async function updateChartRange(range) {
    try {
        const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
        const analytics = await window.API.getAnalytics(days);

        progressData.analytics = analytics.data;
        updateCharts();
    } catch (error) {
        console.error('Failed to update chart range:', error);
    }
}

// Filter progress table
function filterProgressTable(event) {
    const query = event.target.value.toLowerCase();
    const rows = document.querySelectorAll('#progressTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}