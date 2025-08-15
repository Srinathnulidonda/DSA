// dashboard.js - Dashboard specific functionality

let dashboardCharts = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
    initializeCharts();
    setupEventListeners();
    startRealtimeUpdates();
});

// Load dashboard data
async function loadDashboardData() {
    try {
        window.DSAApp.showLoader();

        // Load all dashboard data in parallel
        const [dashboardData, streakData, notificationsData] = await Promise.all([
            window.API.getDashboardData(),
            window.API.getStreaks(),
            window.API.getNotifications(true)
        ]);

        // Update UI with data
        updateDashboardStats(dashboardData.data);
        updateStreakDisplay(streakData.data);
        updateNotificationBadge(notificationsData.data.unread_count);
        updateRecentActivity(dashboardData.data.recent_activity);
        updateWeekProgress(dashboardData.data);

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        window.DSAApp.showToast('Failed to load dashboard data', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
}

// Update dashboard statistics
function updateDashboardStats(data) {
    const { statistics } = data;

    // Update stat cards
    document.querySelector('#totalCompleted').textContent = statistics.total_completed;
    document.querySelector('#completionRate').textContent = `${statistics.completion_rate}%`;
    document.querySelector('#weekTimeMinutes').textContent = window.DSAApp.formatTime(statistics.week_time_minutes);
    document.querySelector('#weekPomodoros').textContent = statistics.week_pomodoros;

    // Animate counters
    animateCounters();
}

// Update streak display
function updateStreakDisplay(streakData) {
    const { current_streak, longest_streak, total_days_active } = streakData;

    document.querySelector('#currentStreak').textContent = `${current_streak} Days`;
    document.querySelector('#longestStreak').textContent = `Best: ${longest_streak} days`;

    // Update streak fire animation if on streak
    if (current_streak > 0) {
        document.querySelector('.streak-fire').classList.add('animate-pulse');
    }

    // Check for milestone achievements
    checkStreakMilestones(current_streak);
}

// Initialize charts
function initializeCharts() {
    // Progress Chart
    const progressCtx = document.getElementById('progressChart')?.getContext('2d');
    if (progressCtx) {
        dashboardCharts.progress = new Chart(progressCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Study Time (minutes)',
                    data: [],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Topics Completed',
                    data: [],
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Update week progress
function updateWeekProgress(data) {
    const weekProgressContainer = document.querySelector('.week-timeline');
    if (!weekProgressContainer) return;

    // Get current week data
    const currentWeek = getCurrentWeek();
    const weekData = window.DSAApp.ROADMAP[currentWeek - 1];

    if (!weekData) return;

    // Update week title
    document.querySelector('#weekTitle').textContent = `Week ${weekData.week}: ${weekData.title}`;

    // Update day cards
    weekData.days.forEach((day, index) => {
        const dayCard = weekProgressContainer.querySelector(`.day-card:nth-child(${index + 1})`);
        if (dayCard) {
            updateDayCard(dayCard, day, currentWeek, index + 1);
        }
    });
}

// Update individual day card
function updateDayCard(card, dayData, week, day) {
    const isCompleted = checkDayCompleted(week, day);
    const isCurrent = checkCurrentDay(week, day);

    card.classList.remove('bg-success', 'bg-warning', 'bg-light');
    card.classList.add(isCompleted ? 'bg-success' : isCurrent ? 'bg-warning' : 'bg-light');

    card.innerHTML = `
        <small class="text-muted">${dayData.day}</small>
        <h6 class="mb-0 mt-1">${dayData.topic}</h6>
        ${isCompleted ? '<i class="fas fa-check-circle text-success mt-2"></i>' :
            isCurrent ? '<div class="progress mt-2" style="height: 4px;"><div class="progress-bar bg-warning" style="width: 60%"></div></div>' :
                '<i class="fas fa-lock text-muted mt-2"></i>'}
    `;
}

// Update recent activity
function updateRecentActivity(activities) {
    const activityContainer = document.querySelector('.activity-list');
    if (!activityContainer) return;

    activityContainer.innerHTML = activities.map(activity => `
        <div class="activity-item d-flex align-items-start mb-3 animate-fadeIn">
            <div class="activity-icon bg-${getActivityColor(activity.type)} bg-opacity-10 rounded-circle p-2 me-3">
                <i class="fas fa-${getActivityIcon(activity.type)} text-${getActivityColor(activity.type)}"></i>
            </div>
            <div class="flex-grow-1">
                <h6 class="mb-1">${activity.title}</h6>
                <small class="text-muted">${formatTimeAgo(activity.created_at)}</small>
            </div>
        </div>
    `).join('');
}

// Get activity icon based on type
function getActivityIcon(type) {
    const icons = {
        'completed': 'check',
        'achievement': 'trophy',
        'note': 'sticky-note',
        'streak': 'fire'
    };
    return icons[type] || 'circle';
}

// Get activity color based on type
function getActivityColor(type) {
    const colors = {
        'completed': 'success',
        'achievement': 'warning',
        'note': 'info',
        'streak': 'danger'
    };
    return colors[type] || 'secondary';
}

// Format time ago
function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;

    return date.toLocaleDateString();
}

// Check streak milestones
function checkStreakMilestones(currentStreak) {
    const milestones = [7, 14, 30, 60, 100];

    if (milestones.includes(currentStreak)) {
        showAchievementToast({
            title: `${currentStreak} Day Streak!`,
            message: 'Amazing dedication! Keep it up!',
            badge: `/assets/images/badges/streak-${currentStreak}.svg`
        });
    }
}

// Show achievement toast
function showAchievementToast(achievement) {
    const toastHTML = `
        <div class="toast align-items-center" role="alert">
            <div class="toast-header bg-success text-white">
                <i class="fas fa-trophy me-2"></i>
                <strong class="me-auto">Achievement Unlocked!</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                <div class="d-flex align-items-center">
                    <img src="${achievement.badge}" alt="Badge" style="width: 50px;" class="me-3">
                    <div>
                        <h6 class="mb-0">${achievement.title}</h6>
                        <small class="text-muted">${achievement.message}</small>
                    </div>
                </div>
            </div>
        </div>
    `;

    const toastContainer = document.querySelector('.toast-container');
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = toastContainer.lastElementChild;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    // Play achievement sound
    playAchievementSound();
}

// Play achievement sound
function playAchievementSound() {
    const audio = new Audio('/assets/sounds/achievement.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Could not play sound'));
}

// Setup event listeners
function setupEventListeners() {
    // Continue learning button
    document.querySelector('#continueLearning')?.addEventListener('click', continueLearning);

    // View progress button
    document.querySelector('#viewProgress')?.addEventListener('click', () => {
        window.location.href = '/progress.html';
    });

    // Chart time range selector
    document.querySelectorAll('.chart-range-selector button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            updateChartRange(e.target.dataset.range);
        });
    });
}

// Continue learning function
async function continueLearning() {
    try {
        // Get current progress
        const progressData = await window.API.getProgress();
        const nextTopic = findNextTopic(progressData.data.progress);

        if (nextTopic) {
            // Redirect to roadmap with topic highlighted
            window.location.href = `/roadmap.html?week=${nextTopic.week}&day=${nextTopic.day}`;
        } else {
            window.DSAApp.showToast('You have completed all topics!', 'success');
        }
    } catch (error) {
        console.error('Failed to get next topic:', error);
        window.location.href = '/roadmap.html';
    }
}

// Find next topic to study
function findNextTopic(progress) {
    for (let week = 1; week <= 14; week++) {
        for (let day = 1; day <= 7; day++) {
            const key = `week${week}_day${day}`;
            if (!progress[key] || !progress[key].completed) {
                return { week, day };
            }
        }
    }
    return null;
}

// Get current week number
function getCurrentWeek() {
    // This is a simplified version - in production, calculate based on user's start date
    const startDate = new Date('2024-01-01'); // Example start date
    const currentDate = new Date();
    const weeksDiff = Math.floor((currentDate - startDate) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(Math.max(1, weeksDiff + 1), 14);
}

// Check if a day is completed
function checkDayCompleted(week, day) {
    // This would check against actual user progress
    // For demo, mark some as completed
    return week < getCurrentWeek() || (week === getCurrentWeek() && day < 3);
}

// Check if this is the current day
function checkCurrentDay(week, day) {
    return week === getCurrentWeek() && day === 3; // Example current day
}

// Start real-time updates
function startRealtimeUpdates() {
    // Update time-based elements every minute
    setInterval(() => {
        updateTimeBasedElements();
    }, 60000);

    // Refresh dashboard data every 5 minutes
    setInterval(() => {
        loadDashboardData();
    }, 300000);
}

// Update time-based elements
function updateTimeBasedElements() {
    // Update "time ago" displays
    document.querySelectorAll('[data-timestamp]').forEach(el => {
        const timestamp = el.dataset.timestamp;
        el.textContent = formatTimeAgo(timestamp);
    });
}

// Animate counters
function animateCounters() {
    document.querySelectorAll('.counter').forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 1000;
        const step = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current);
        }, 16);
    });
}

// Update chart range
async function updateChartRange(range) {
    try {
        const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
        const analyticsData = await window.API.getAnalytics(days);

        updateChartData(dashboardCharts.progress, analyticsData.data);
    } catch (error) {
        console.error('Failed to update chart:', error);
    }
}

// Update chart data
function updateChartData(chart, data) {
    if (!chart) return;

    chart.data.labels = data.progress_timeline.map(d => formatChartDate(d.date));
    chart.data.datasets[0].data = data.progress_timeline.map(d => d.time_spent);
    chart.data.datasets[1].data = data.progress_timeline.map(d => d.completed);

    chart.update();
}

// Format date for chart
function formatChartDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}