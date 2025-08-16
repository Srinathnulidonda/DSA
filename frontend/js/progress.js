// Progress tracking functionality

class ProgressManager {
    constructor() {
        this.progressData = null;
        this.analyticsData = null;
        this.currentView = 'weekly';
        this.currentPeriod = 7; // days
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadProgressData();
        await this.loadAnalyticsData();
        this.setupEventListeners();
        this.renderProgressOverview();
        this.renderCharts();
        this.renderTimeline();
        this.renderAchievements();
        this.renderGoals();
    }

    async loadProgressData() {
        try {
            const response = await api.get(API_ENDPOINTS.progress);
            this.progressData = response;
        } catch (error) {
            console.error('Failed to load progress data:', error);
            notificationManager.error('Failed to load progress data');
        }
    }

    async loadAnalyticsData() {
        try {
            const response = await api.get(`${API_ENDPOINTS.analytics}?days=${this.currentPeriod}`);
            this.analyticsData = response;
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            this.analyticsData = null;
        }
    }

    setupEventListeners() {
        // View toggle buttons
        const weeklyViewBtn = document.getElementById('weeklyViewBtn');
        const monthlyViewBtn = document.getElementById('monthlyViewBtn');
        const overallViewBtn = document.getElementById('overallViewBtn');

        [weeklyViewBtn, monthlyViewBtn, overallViewBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.switchView(btn.id.replace('ViewBtn', '').toLowerCase());
                });
            }
        });

        // Timeline filter buttons
        const timelineAllBtn = document.getElementById('timelineAllBtn');
        const timelineWeekBtn = document.getElementById('timelineWeekBtn');
        const timelineMonthBtn = document.getElementById('timelineMonthBtn');

        [timelineAllBtn, timelineWeekBtn, timelineMonthBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.filterTimeline(btn.id.replace('timeline', '').replace('Btn', '').toLowerCase());
                });
            }
        });

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportProgress();
            });
        }

        // Update goals button
        const updateGoalsBtn = document.getElementById('updateGoalsBtn');
        if (updateGoalsBtn) {
            updateGoalsBtn.addEventListener('click', () => {
                modalManager.open('goalUpdateModal');
            });
        }

        // Goal update form
        const goalUpdateForm = document.getElementById('goalUpdateForm');
        if (goalUpdateForm) {
            goalUpdateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateGoals();
            });
        }

        // Topic view toggle
        const topicViewToggle = document.getElementById('topicViewToggle');
        if (topicViewToggle) {
            topicViewToggle.addEventListener('click', () => {
                this.toggleTopicView();
            });
        }
    }

    renderProgressOverview() {
        if (!this.progressData) return;

        const { statistics } = this.progressData;

        // Update overview cards
        this.updateElement('#completedTopics', statistics.total_completed || 0);
        this.updateElement('#totalStudyTime', this.formatHours(statistics.total_time_minutes || 0));
        this.updateElement('#currentStreak', statistics.current_streak || 0);
        this.updateElement('#currentWeek', this.calculateCurrentWeek());

        // Update completion rate
        const completionRate = Math.round(((statistics.total_completed || 0) / 98) * 100);
        this.updateElement('#completionRate', `${completionRate}% complete`);

        // Update average daily time
        const totalDays = Math.max(1, this.getDaysSinceStart());
        const avgDaily = Math.round((statistics.total_time_minutes || 0) / totalDays);
        this.updateElement('#averageDaily', `${avgDaily}m avg/day`);

        // Update longest streak
        this.updateElement('#longestStreak', `${statistics.longest_streak || 0} best`);

        // Update week progress
        const currentWeek = this.calculateCurrentWeek();
        const weekProgress = this.getWeekProgress(currentWeek);
        const weekCompletionRate = Math.round((weekProgress.completed / 7) * 100);
        this.updateElement('#weekProgress', `${weekCompletionRate}% this week`);
    }

    renderCharts() {
        this.renderWeeklyProgressChart();
        this.renderTopicDistributionChart();
    }

    renderWeeklyProgressChart() {
        const canvas = document.getElementById('weeklyProgressChart');
        if (!canvas || !this.analyticsData) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.charts.weeklyProgress) {
            this.charts.weeklyProgress.destroy();
        }

        // Prepare data based on current view
        let labels, completedData, timeData;

        if (this.currentView === 'weekly') {
            // Last 7 days
            labels = this.getLast7Days().map(date =>
                new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
            );

            const progressTimeline = this.analyticsData.progress_timeline || [];
            completedData = this.getLast7Days().map(date => {
                const dayData = progressTimeline.find(p => p.date === date);
                return dayData ? dayData.completed : 0;
            });

            timeData = this.getLast7Days().map(date => {
                const dayData = progressTimeline.find(p => p.date === date);
                return dayData ? Math.round(dayData.time_spent / 60) : 0;
            });
        } else if (this.currentView === 'monthly') {
            // Last 4 weeks
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            const weeklyProgress = this.analyticsData.weekly_progress || [];
            completedData = weeklyProgress.slice(-4).map(w => w.completed || 0);
            timeData = weeklyProgress.slice(-4).map(w => Math.round((w.time_spent || 0) / 60));
        } else {
            // Overall - by week number
            const weeklyProgress = this.analyticsData.weekly_progress || [];
            labels = weeklyProgress.map(w => `Week ${w.week}`);
            completedData = weeklyProgress.map(w => w.completed || 0);
            timeData = weeklyProgress.map(w => Math.round((w.time_spent || 0) / 60));
        }

        this.charts.weeklyProgress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Topics Completed',
                        data: completedData,
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Study Hours',
                        data: timeData,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 2,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Topics'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Hours'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    renderTopicDistributionChart() {
        const canvas = document.getElementById('topicDistributionChart');
        if (!canvas || !this.progressData) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.charts.topicDistribution) {
            this.charts.topicDistribution.destroy();
        }

        // Calculate topic distribution
        const topicData = this.calculateTopicDistribution();

        this.charts.topicDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topicData.labels,
                datasets: [{
                    data: topicData.data,
                    backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
                        '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const percentage = Math.round((context.parsed / topicData.total) * 100);
                                return `${context.label}: ${context.parsed} topics (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    calculateTopicDistribution() {
        if (!this.progressData || !this.progressData.progress) {
            return { labels: [], data: [], total: 0 };
        }

        const topicCounts = {};
        let total = 0;

        // Group by topic categories (simplified)
        Object.values(this.progressData.progress).forEach(progress => {
            if (progress.completed) {
                const topic = this.categorizeProgress(progress);
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                total++;
            }
        });

        const labels = Object.keys(topicCounts);
        const data = Object.values(topicCounts);

        return { labels, data, total };
    }

    categorizeProgress(progress) {
        // This is a simplified categorization - you might want to enhance this
        const topic = progress.topic || 'Other';

        if (topic.toLowerCase().includes('array')) return 'Arrays & Strings';
        if (topic.toLowerCase().includes('linked')) return 'Linked Lists';
        if (topic.toLowerCase().includes('stack') || topic.toLowerCase().includes('queue')) return 'Stacks & Queues';
        if (topic.toLowerCase().includes('tree')) return 'Trees';
        if (topic.toLowerCase().includes('graph')) return 'Graphs';
        if (topic.toLowerCase().includes('sort') || topic.toLowerCase().includes('search')) return 'Algorithms';
        if (topic.toLowerCase().includes('dynamic')) return 'Dynamic Programming';

        return 'Other';
    }

    renderTimeline() {
        const timelineContainer = document.getElementById('progressTimeline');
        if (!timelineContainer || !this.progressData) return;

        const recentProgress = this.getRecentProgress();

        if (recentProgress.length === 0) {
            timelineContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="bi bi-clock-history text-gray-400 text-2xl"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">No recent progress to display</p>
                </div>
            `;
            return;
        }

        timelineContainer.innerHTML = recentProgress.map(progress => `
            <div class="flex items-start space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${progress.completed
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            }">
                        <i class="bi ${progress.completed ? 'bi-check-circle-fill' : 'bi-play-circle'}"></i>
                    </div>
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <h4 class="font-medium text-gray-900 dark:text-white">
                            Week ${progress.week} - ${progress.topic}
                        </h4>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                            ${progress.completion_date ? dateUtils.formatRelative(progress.completion_date) : 'In progress'}
                        </span>
                    </div>
                    
                    <div class="mt-1 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span><i class="bi bi-clock mr-1"></i>${progress.time_spent || 0} minutes</span>
                        <span><i class="bi bi-calendar-day mr-1"></i>Day ${progress.day}</span>
                    </div>
                    
                    ${progress.notes ? `
                        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">${progress.notes}</p>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    getRecentProgress() {
        if (!this.progressData || !this.progressData.progress) return [];

        return Object.entries(this.progressData.progress)
            .filter(([key, progress]) => progress.completion_date)
            .map(([key, progress]) => ({
                ...progress,
                key
            }))
            .sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date))
            .slice(0, 10);
    }

    renderAchievements() {
        const achievementsList = document.getElementById('achievementsList');
        if (!achievementsList) return;

        const achievements = this.generateAchievements();

        if (achievements.length === 0) {
            achievementsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-trophy text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">Complete topics to unlock achievements!</p>
                </div>
            `;
            return;
        }

        achievementsList.innerHTML = achievements.map(achievement => `
            <div class="flex items-center space-x-3 p-3 bg-gradient-to-r ${achievement.gradient} rounded-lg">
                <div class="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <i class="bi ${achievement.icon} text-white text-lg"></i>
                </div>
                <div class="flex-1">
                    <h4 class="font-medium text-white">${achievement.title}</h4>
                    <p class="text-xs text-white text-opacity-80">${achievement.description}</p>
                </div>
            </div>
        `).join('');
    }

    generateAchievements() {
        if (!this.progressData) return [];

        const achievements = [];
        const stats = this.progressData.statistics;
        const totalCompleted = stats.total_completed || 0;
        const currentStreak = stats.current_streak || 0;
        const totalTime = stats.total_time_minutes || 0;

        // Completion milestones
        if (totalCompleted >= 1) {
            achievements.push({
                title: 'First Steps',
                description: 'Completed your first topic',
                icon: 'bi-star',
                gradient: 'from-blue-500 to-blue-600'
            });
        }

        if (totalCompleted >= 10) {
            achievements.push({
                title: 'Getting Started',
                description: 'Completed 10 topics',
                icon: 'bi-award',
                gradient: 'from-green-500 to-green-600'
            });
        }

        if (totalCompleted >= 50) {
            achievements.push({
                title: 'Half Century',
                description: 'Completed 50 topics',
                icon: 'bi-trophy',
                gradient: 'from-yellow-500 to-yellow-600'
            });
        }

        // Streak achievements
        if (currentStreak >= 7) {
            achievements.push({
                title: 'Week Warrior',
                description: '7-day learning streak',
                icon: 'bi-fire',
                gradient: 'from-orange-500 to-red-500'
            });
        }

        if (currentStreak >= 30) {
            achievements.push({
                title: 'Month Master',
                description: '30-day learning streak',
                icon: 'bi-lightning',
                gradient: 'from-purple-500 to-pink-500'
            });
        }

        // Time achievements
        const totalHours = Math.floor(totalTime / 60);
        if (totalHours >= 10) {
            achievements.push({
                title: 'Time Investor',
                description: '10+ hours of study time',
                icon: 'bi-clock',
                gradient: 'from-indigo-500 to-purple-500'
            });
        }

        return achievements.slice(0, 3); // Show only top 3
    }

    renderGoals() {
        // This would be populated from user preferences or settings
        const topicsGoal = 7; // Weekly goal
        const timeGoal = 10; // Hours per week

        // Calculate current week progress
        const currentWeekProgress = this.getCurrentWeekProgress();

        // Update goals display
        this.updateElement('#topicsGoal', `${currentWeekProgress.topics}/${topicsGoal}`);
        this.updateElement('#timeGoal', `${Math.round(currentWeekProgress.hours)}h/${timeGoal}h`);

        // Update progress bars
        const topicsProgress = Math.round((currentWeekProgress.topics / topicsGoal) * 100);
        const timeProgress = Math.round((currentWeekProgress.hours / timeGoal) * 100);

        const topicsGoalBar = document.getElementById('topicsGoalBar');
        const timeGoalBar = document.getElementById('timeGoalBar');

        if (topicsGoalBar) topicsGoalBar.style.width = `${Math.min(100, topicsProgress)}%`;
        if (timeGoalBar) timeGoalBar.style.width = `${Math.min(100, timeProgress)}%`;
    }

    getCurrentWeekProgress() {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const recentProgress = this.getRecentProgress();
        const thisWeekProgress = recentProgress.filter(progress =>
            new Date(progress.completion_date) >= startOfWeek
        );

        const topics = thisWeekProgress.filter(p => p.completed).length;
        const hours = thisWeekProgress.reduce((sum, p) => sum + (p.time_spent || 0), 0) / 60;

        return { topics, hours };
    }

    // Utility methods
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

    calculateCurrentWeek() {
        // This would be calculated based on user's start date
        // For now, using a simple calculation
        const daysSinceStart = this.getDaysSinceStart();
        return Math.min(14, Math.ceil(daysSinceStart / 7));
    }

    getDaysSinceStart() {
        // Assume user started at registration
        const startDate = new Date('2024-01-01'); // This should come from user data
        const now = new Date();
        return Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    }

    getWeekProgress(week) {
        if (!this.progressData || !this.progressData.progress) {
            return { completed: 0, totalTime: 0 };
        }

        let completed = 0;
        let totalTime = 0;

        for (let day = 1; day <= 7; day++) {
            const key = `week${week}_day${day}`;
            const progress = this.progressData.progress[key];

            if (progress && progress.completed) {
                completed++;
            }
            if (progress && progress.time_spent) {
                totalTime += progress.time_spent;
            }
        }

        return { completed, totalTime };
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    }

    switchView(view) {
        this.currentView = view;

        // Update button states
        ['weekly', 'monthly', 'overall'].forEach(v => {
            const btn = document.getElementById(`${v}ViewBtn`);
            if (btn) {
                if (v === view) {
                    btn.className = 'px-3 py-1 text-sm font-medium bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-md shadow-sm';
                } else {
                    btn.className = 'px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-white dark:hover:bg-gray-600';
                }
            }
        });

        // Update period for data loading
        if (view === 'weekly') {
            this.currentPeriod = 7;
        } else if (view === 'monthly') {
            this.currentPeriod = 30;
        } else {
            this.currentPeriod = 90;
        }

        // Reload data and charts
        this.loadAnalyticsData().then(() => {
            this.renderCharts();
        });
    }

    filterTimeline(filter) {
        // Update button states
        ['all', 'week', 'month'].forEach(f => {
            const btn = document.getElementById(`timeline${f.charAt(0).toUpperCase() + f.slice(1)}Btn`);
            if (btn) {
                if (f === filter) {
                    btn.className = 'px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md';
                } else {
                    btn.className = 'px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md';
                }
            }
        });

        // Apply filter and re-render timeline
        this.timelineFilter = filter;
        this.renderTimeline();
    }

    async updateGoals() {
        const topicsPerWeek = parseInt(document.getElementById('topicsPerWeek').value);
        const hoursPerWeek = parseInt(document.getElementById('hoursPerWeek').value);

        try {
            // This would typically update user preferences
            await api.put(API_ENDPOINTS.profile, {
                preferences: {
                    weekly_topics_goal: topicsPerWeek,
                    weekly_hours_goal: hoursPerWeek
                }
            });

            modalManager.close('goalUpdateModal');
            notificationManager.success('Goals updated successfully!');

            // Re-render goals section
            this.renderGoals();

        } catch (error) {
            console.error('Failed to update goals:', error);
            notificationManager.error('Failed to update goals');
        }
    }

    toggleTopicView() {
        // Toggle between detailed and summary view
        const button = document.getElementById('topicViewToggle');
        if (button.textContent.includes('View All')) {
            button.textContent = 'View Summary';
            // Show detailed topic breakdown
        } else {
            button.textContent = 'View All';
            // Show summary view
        }
    }

    exportProgress() {
        try {
            const data = {
                overview: this.progressData.statistics,
                progress: this.progressData.progress,
                analytics: this.analyticsData,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            notificationManager.success('Progress data exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            notificationManager.error('Failed to export progress data');
        }
    }
}

// Initialize progress manager when on progress page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('progress')) {
        window.progressManager = new ProgressManager();
    }
});