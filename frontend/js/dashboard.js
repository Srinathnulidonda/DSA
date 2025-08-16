// Dashboard functionality

class DashboardManager {
    constructor() {
        this.dashboardData = null;
        this.progressChart = null;
        this.motivationalQuotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
            "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
            "It is during our darkest moments that we must focus to see the light. - Aristotle",
            "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
            "Believe you can and you're halfway there. - Theodore Roosevelt",
            "The only impossible journey is the one you never begin. - Tony Robbins",
            "In the middle of difficulty lies opportunity. - Albert Einstein",
            "Success is walking from failure to failure with no loss of enthusiasm. - Winston Churchill",
            "Your time is limited, don't waste it living someone else's life. - Steve Jobs"
        ];
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.setupMotivationalQuote();
        this.setupProgressChart();
        this.setupTodaySchedule();
        this.setupStreakCalendar();
        this.setupRecentActivity();
        this.setupNotifications();
        this.setupQuickActions();
        this.setupAutoRefresh();
    }

    async loadDashboardData() {
        try {
            const loader = loadingManager.show('#dashboardContainer', 'Loading dashboard...');

            // Load multiple endpoints concurrently
            const [dashboardData, streakData, progressData] = await Promise.all([
                api.get(API_ENDPOINTS.dashboard),
                api.get(API_ENDPOINTS.streaks),
                api.get(API_ENDPOINTS.progress)
            ]);

            this.dashboardData = {
                ...dashboardData,
                streaks: streakData,
                progress: progressData
            };

            this.updateDashboardStats();
            loadingManager.hide(loader);

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            notificationManager.error('Failed to load dashboard data');
            loadingManager.hideAll();
        }
    }

    updateDashboardStats() {
        if (!this.dashboardData) return;

        const { statistics, streak } = this.dashboardData;

        // Update quick stats
        this.updateElement('#totalCompleted', statistics.total_completed || 0);
        this.updateElement('#totalTime', this.formatHours(statistics.total_time_minutes || 0));
        this.updateElement('#totalPomodoros', statistics.total_pomodoros || 0);
        this.updateElement('#completionRate', `${statistics.completion_rate || 0}%`);

        // Update streak display
        this.updateElement('#currentStreak', streak.current || 0);
        this.updateElement('#streakDays', streak.current || 0);

        // Update progress bar if exists
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${statistics.completion_rate || 0}%`;
        }
    }

    updateElement(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    formatHours(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    setupMotivationalQuote() {
        const quoteElement = document.getElementById('motivationalQuote');
        if (quoteElement) {
            const randomQuote = this.motivationalQuotes[Math.floor(Math.random() * this.motivationalQuotes.length)];
            quoteElement.textContent = randomQuote;
        }
    }

    async setupProgressChart() {
        const canvas = document.getElementById('progressChart');
        if (!canvas) return;

        try {
            // Get analytics data for the chart
            const analyticsData = await api.get(`${API_ENDPOINTS.analytics}?days=7`);

            const ctx = canvas.getContext('2d');

            // Prepare data for the last 7 days
            const last7Days = this.getLast7Days();
            const progressData = last7Days.map(date => {
                const dayData = analyticsData.progress_timeline.find(p => p.date === date);
                return dayData ? dayData.completed : 0;
            });

            const timeData = last7Days.map(date => {
                const dayData = analyticsData.progress_timeline.find(p => p.date === date);
                return dayData ? dayData.time_spent : 0;
            });

            this.progressChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last7Days.map(date => this.formatChartDate(date)),
                    datasets: [
                        {
                            label: 'Topics Completed',
                            data: progressData,
                            borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#3B82F6',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6
                        },
                        {
                            label: 'Time Spent (minutes)',
                            data: timeData,
                            borderColor: '#8B5CF6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#8B5CF6',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#3B82F6',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6B7280'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: {
                                color: 'rgba(107, 114, 128, 0.1)'
                            },
                            ticks: {
                                color: '#6B7280',
                                stepSize: 1
                            },
                            title: {
                                display: true,
                                text: 'Topics Completed',
                                color: '#6B7280'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                color: '#6B7280'
                            },
                            title: {
                                display: true,
                                text: 'Time (minutes)',
                                color: '#6B7280'
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });

        } catch (error) {
            console.error('Failed to setup progress chart:', error);
        }
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(dateUtils.formatDate(date));
        }
        return days;
    }

    formatChartDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    async setupTodaySchedule() {
        const scheduleContainer = document.getElementById('todaySchedule');
        if (!scheduleContainer) return;

        try {
            // Get current week and day
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            const currentWeek = Math.ceil(((today - startOfYear) / 86400000 + 1) / 7);
            const currentDay = today.getDay() === 0 ? 7 : today.getDay(); // Convert Sunday (0) to 7

            // Get roadmap data
            const roadmapData = await api.get(API_ENDPOINTS.roadmap);
            const currentWeekData = roadmapData.roadmap.find(week => week.week <= Math.min(currentWeek, 14));

            if (!currentWeekData) {
                scheduleContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No schedule available for today</p>';
                return;
            }

            const todayData = currentWeekData.days[currentDay - 1];
            if (!todayData) {
                scheduleContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No schedule available for today</p>';
                return;
            }

            // Get user progress for today
            const progressData = await api.get(API_ENDPOINTS.progress);
            const todayProgress = progressData.progress[`week${currentWeekData.week}_day${currentDay}`];

            scheduleContainer.innerHTML = `
                <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-semibold text-gray-900 dark:text-white">Week ${currentWeekData.week} - ${todayData.topic}</h3>
                        <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                            ${todayData.time_estimate} min
                        </span>
                    </div>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-3">${todayData.activities}</p>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            ${todayProgress && todayProgress.completed ?
                    '<i class="bi bi-check-circle-fill text-green-500"></i><span class="text-sm text-green-600 dark:text-green-400">Completed</span>' :
                    '<i class="bi bi-circle text-gray-400"></i><span class="text-sm text-gray-500 dark:text-gray-400">Pending</span>'
                }
                        </div>
                        <button onclick="dashboardManager.markAsCompleted(${currentWeekData.week}, ${currentDay})" 
                                class="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${todayProgress && todayProgress.completed ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${todayProgress && todayProgress.completed ? 'disabled' : ''}>
                            ${todayProgress && todayProgress.completed ? 'Completed' : 'Mark Complete'}
                        </button>
                    </div>
                </div>

                <div class="space-y-3">
                    <h4 class="font-medium text-gray-900 dark:text-white mb-2">Resources</h4>
                    ${todayData.resources.map(resourceKey => {
                    // In a real app, you'd fetch resource details from the backend
                    return `
                            <a href="#" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <div class="flex items-center space-x-3">
                                    <i class="bi bi-link-45deg text-blue-600 dark:text-blue-400"></i>
                                    <span class="text-sm font-medium text-gray-900 dark:text-white">${resourceKey}</span>
                                </div>
                                <i class="bi bi-arrow-up-right text-gray-400"></i>
                            </a>
                        `;
                }).join('')}
                </div>

                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600 dark:text-gray-400">Today's Goal</span>
                        <span class="font-medium text-gray-900 dark:text-white">${todayData.time_estimate} minutes</span>
                    </div>
                    ${todayProgress && todayProgress.time_spent ? `
                        <div class="flex items-center justify-between text-sm mt-1">
                            <span class="text-gray-600 dark:text-gray-400">Time Spent</span>
                            <span class="font-medium text-green-600 dark:text-green-400">${todayProgress.time_spent} minutes</span>
                        </div>
                    ` : ''}
                </div>
            `;

        } catch (error) {
            console.error('Failed to setup today schedule:', error);
            scheduleContainer.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load today\'s schedule</p>';
        }
    }

    async markAsCompleted(week, day) {
        try {
            await api.post(API_ENDPOINTS.progress, {
                week: week,
                day: day,
                completed: true,
                time_spent: 0
            });

            notificationManager.success('Great job! Task marked as completed.');

            // Refresh the dashboard
            await this.loadDashboardData();
            this.setupTodaySchedule();

            // Show achievement if it's a streak milestone
            this.checkForAchievements();

        } catch (error) {
            console.error('Failed to mark as completed:', error);
            notificationManager.error('Failed to update progress');
        }
    }

    async setupStreakCalendar() {
        const streakCalendar = document.getElementById('streakCalendar');
        if (!streakCalendar || !this.dashboardData) return;

        const { streaks } = this.dashboardData;
        const activityHistory = streaks.activity_history || {};

        // Generate last 7 days
        const last7Days = this.getLast7Days();

        streakCalendar.innerHTML = last7Days.map(date => {
            const hasActivity = activityHistory[date] > 0;
            const isToday = dateUtils.isToday(date);

            let classes = 'w-8 h-8 rounded-sm flex items-center justify-center text-xs';

            if (isToday && hasActivity) {
                classes += ' bg-gradient-to-br from-blue-500 to-green-500 text-white';
            } else if (isToday) {
                classes += ' bg-blue-500 text-white';
            } else if (hasActivity) {
                classes += ' bg-green-500 text-white';
            } else {
                classes += ' bg-gray-200 dark:bg-gray-700 text-gray-400';
            }

            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);

            return `<div class="${classes}" title="${date}">${dayOfWeek}</div>`;
        }).join('');
    }

    async setupRecentActivity() {
        const activityContainer = document.getElementById('recentActivity');
        if (!activityContainer || !this.dashboardData) return;

        const { recent_activity } = this.dashboardData;

        if (!recent_activity || recent_activity.length === 0) {
            activityContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>';
            return;
        }

        activityContainer.innerHTML = recent_activity.map(activity => `
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <i class="bi bi-check-circle text-green-600 dark:text-green-400"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">Week ${activity.week} - ${activity.topic}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${dateUtils.formatRelative(activity.completed_at)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">Day ${activity.day}</div>
                </div>
            </div>
        `).join('');
    }

    async setupNotifications() {
        try {
            const notifications = await api.get(`${API_ENDPOINTS.notifications}?limit=5`);

            // Update notification badge
            const notificationBadge = document.getElementById('notificationBadge');
            if (notificationBadge) {
                if (notifications.unread_count > 0) {
                    notificationBadge.textContent = notifications.unread_count;
                    notificationBadge.classList.remove('hidden');
                } else {
                    notificationBadge.classList.add('hidden');
                }
            }

            // Setup notification dropdown
            this.setupNotificationDropdown(notifications.notifications);

        } catch (error) {
            console.error('Failed to setup notifications:', error);
        }
    }

    setupNotificationDropdown(notifications) {
        const notificationToggle = document.getElementById('notificationToggle');
        const notificationDropdown = document.getElementById('notificationDropdown');
        const notificationList = document.getElementById('notificationList');

        if (!notificationToggle || !notificationDropdown || !notificationList) return;

        // Toggle dropdown
        notificationToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && !notificationToggle.contains(e.target)) {
                notificationDropdown.classList.add('hidden');
            }
        });

        // Populate notifications
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="p-4 text-center text-gray-500 dark:text-gray-400">
                    <i class="bi bi-bell text-2xl mb-2"></i>
                    <p>No notifications</p>
                </div>
            `;
        } else {
            notificationList.innerHTML = notifications.map(notification => `
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
                     onclick="dashboardManager.markNotificationRead('${notification.id}')">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-900 dark:text-white">${notification.title}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${notification.message}</p>
                            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${dateUtils.formatRelative(notification.created_at)}</p>
                        </div>
                        ${!notification.is_read ? '<div class="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>' : ''}
                    </div>
                </div>
            `).join('');
        }
    }

    async markNotificationRead(notificationId) {
        try {
            await api.put(`${API_ENDPOINTS.notifications}/${notificationId}/read`);
            // Refresh notifications
            this.setupNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    setupQuickActions() {
        // Setup profile dropdown
        const profileToggle = document.getElementById('profileToggle');
        const profileDropdown = document.getElementById('profileDropdown');

        if (profileToggle && profileDropdown) {
            profileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!profileDropdown.contains(e.target) && !profileToggle.contains(e.target)) {
                    profileDropdown.classList.add('hidden');
                }
            });
        }

        // Setup search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(globalSearch.value);
                }
            });
        }
    }

    async performSearch(query) {
        if (!query.trim()) return;

        try {
            const results = await api.get(`${API_ENDPOINTS.search}?q=${encodeURIComponent(query)}`);
            // Handle search results (you can implement a search results modal)
            console.log('Search results:', results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    checkForAchievements() {
        if (!this.dashboardData) return;

        const { statistics, streak } = this.dashboardData;

        // Check for streak achievements
        if (streak.current === 7) {
            this.showAchievement('Week Warrior!', 'You\'ve maintained a 7-day streak!');
        } else if (streak.current === 30) {
            this.showAchievement('Month Master!', 'Amazing! 30 days in a row!');
        }

        // Check for progress achievements
        if (statistics.total_completed === 1) {
            this.showAchievement('First Steps!', 'You\'ve completed your first topic!');
        } else if (statistics.total_completed === 50) {
            this.showAchievement('Half Century!', 'You\'ve completed 50 topics!');
        }

        // Check for time achievements
        const totalHours = Math.floor(statistics.total_time_minutes / 60);
        if (totalHours === 10) {
            this.showAchievement('Time Tracker!', 'You\'ve studied for 10 hours!');
        } else if (totalHours === 100) {
            this.showAchievement('Century Scholar!', 'Incredible! 100 hours of study!');
        }
    }

    showAchievement(title, description) {
        const modal = document.getElementById('achievementModal');
        const titleEl = document.getElementById('achievementTitle');
        const descEl = document.getElementById('achievementDescription');
        const closeBtn = document.getElementById('closeAchievement');

        if (modal && titleEl && descEl) {
            titleEl.textContent = title;
            descEl.textContent = description;
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });

            // Auto close after 5 seconds
            setTimeout(() => {
                if (!modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
            }, 5000);
        }
    }

    setupAutoRefresh() {
        // Refresh dashboard data every 5 minutes
        setInterval(async () => {
            await this.loadDashboardData();
        }, 5 * 60 * 1000);

        // Refresh streak calendar at midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeUntilMidnight = tomorrow.getTime() - now.getTime();

        setTimeout(() => {
            this.setupStreakCalendar();
            // Set up daily refresh
            setInterval(() => {
                this.setupStreakCalendar();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilMidnight);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard') || window.location.pathname === '/') {
        const dashboardManager = new DashboardManager();
        window.dashboardManager = dashboardManager;
    }
});