// Analytics functionality

class AnalyticsManager {
    constructor() {
        this.analyticsData = null;
        this.currentPeriod = 7; // days
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadAnalyticsData();
        this.setupEventListeners();
        this.renderMetrics();
        this.renderCharts();
        this.renderInsights();
        this.renderTables();
    }

    async loadAnalyticsData() {
        try {
            const [analyticsResponse, progressResponse, dashboardResponse] = await Promise.all([
                api.get(`${API_ENDPOINTS.analytics}?days=${this.currentPeriod}`),
                api.get(API_ENDPOINTS.progress),
                api.get(API_ENDPOINTS.dashboard)
            ]);

            this.analyticsData = {
                ...analyticsResponse,
                progress: progressResponse,
                dashboard: dashboardResponse
            };

        } catch (error) {
            console.error('Failed to load analytics data:', error);
            notificationManager.error('Failed to load analytics data');
        }
    }

    setupEventListeners() {
        // Period selection
        const period7d = document.getElementById('period7d');
        const period30d = document.getElementById('period30d');
        const period90d = document.getElementById('period90d');

        [period7d, period30d, period90d].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    const period = parseInt(btn.id.match(/\d+/)[0]);
                    this.changePeriod(period);
                });
            }
        });

        // Export button
        const exportAnalyticsBtn = document.getElementById('exportAnalyticsBtn');
        if (exportAnalyticsBtn) {
            exportAnalyticsBtn.addEventListener('click', () => {
                this.exportAnalytics();
            });
        }

        // Pattern toggle buttons
        const hourlyPatternBtn = document.getElementById('hourlyPatternBtn');
        const weeklyPatternBtn = document.getElementById('weeklyPatternBtn');

        if (hourlyPatternBtn) {
            hourlyPatternBtn.addEventListener('click', () => {
                this.switchPatternView('hourly');
            });
        }

        if (weeklyPatternBtn) {
            weeklyPatternBtn.addEventListener('click', () => {
                this.switchPatternView('weekly');
            });
        }
    }

    renderMetrics() {
        if (!this.analyticsData) return;

        // Calculate metrics
        const metrics = this.calculateMetrics();

        // Learning Velocity
        this.updateElement('#learningVelocity', metrics.learningVelocity);
        this.updateElement('#velocityChange', 'topics/week');

        // Average Session Time
        this.updateElement('#avgSessionTime', `${metrics.avgSessionTime}m`);
        this.updateElement('#sessionTimeChange', 'per session');

        // Focus Score
        this.updateElement('#focusScore', `${metrics.focusScore}%`);
        this.updateElement('#focusChange', 'efficiency');

        // Consistency Score
        this.updateElement('#consistencyScore', `${metrics.consistencyScore}%`);
        this.updateElement('#consistencyChange', 'daily study');

        // Performance Metrics
        this.updateElement('#completionRate', `${metrics.completionRate}%`);
        this.updateProgressBar('completionRateBar', metrics.completionRate);

        this.updateElement('#retentionRate', `${metrics.retentionRate}%`);
        this.updateProgressBar('retentionRateBar', metrics.retentionRate);

        this.updateElement('#streakConsistency', `${metrics.streakConsistency}%`);
        this.updateProgressBar('streakConsistencyBar', metrics.streakConsistency);

        this.updateElement('#goalAchievement', `${metrics.goalAchievement}%`);
        this.updateProgressBar('goalAchievementBar', metrics.goalAchievement);
    }

    calculateMetrics() {
        const progressData = this.analyticsData.progress || {};
        const dashboardData = this.analyticsData.dashboard || {};
        const progressTimeline = this.analyticsData.progress_timeline || [];

        // Learning Velocity (topics per week)
        const topicsCompleted = progressTimeline.reduce((sum, day) => sum + (day.completed || 0), 0);
        const weeks = Math.max(1, this.currentPeriod / 7);
        const learningVelocity = Math.round(topicsCompleted / weeks * 10) / 10;

        // Average Session Time
        const totalTime = progressTimeline.reduce((sum, day) => sum + (day.time_spent || 0), 0);
        const sessions = progressTimeline.filter(day => day.completed > 0).length;
        const avgSessionTime = sessions > 0 ? Math.round(totalTime / sessions) : 0;

        // Focus Score (percentage of planned time actually spent)
        const plannedTime = this.currentPeriod * 120; // 2 hours per day planned
        const actualTime = totalTime;
        const focusScore = Math.min(100, Math.round((actualTime / plannedTime) * 100));

        // Consistency Score (percentage of days with activity)
        const activeDays = progressTimeline.filter(day => day.completed > 0).length;
        const consistencyScore = Math.round((activeDays / this.currentPeriod) * 100);

        // Other metrics
        const statistics = dashboardData.statistics || {};
        const completionRate = Math.round(((statistics.total_completed || 0) / 98) * 100);
        const retentionRate = 85; // Mock value
        const streakConsistency = Math.round(((statistics.current_streak || 0) / this.currentPeriod) * 100);
        const goalAchievement = Math.round(((statistics.total_completed || 0) / (this.currentPeriod * 1)) * 100);

        return {
            learningVelocity,
            avgSessionTime,
            focusScore,
            consistencyScore,
            completionRate,
            retentionRate,
            streakConsistency,
            goalAchievement
        };
    }

    renderCharts() {
        this.renderProgressOverTimeChart();
        this.renderStudyPatternsChart();
        this.renderTopicDistributionChart();
    }

    renderProgressOverTimeChart() {
        const canvas = document.getElementById('progressOverTimeChart');
        if (!canvas || !this.analyticsData) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.charts.progressOverTime) {
            this.charts.progressOverTime.destroy();
        }

        // Prepare data
        const progressTimeline = this.analyticsData.progress_timeline || [];
        const labels = progressTimeline.map(item =>
            new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        const topicsData = progressTimeline.map(item => item.completed || 0);
        const hoursData = progressTimeline.map(item => Math.round((item.time_spent || 0) / 60 * 10) / 10);

        this.charts.progressOverTime = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Topics Completed',
                        data: topicsData,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Hours Studied',
                        data: hoursData,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
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

    renderStudyPatternsChart() {
        const canvas = document.getElementById('studyPatternsChart');
        if (!canvas || !this.analyticsData) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.charts.studyPatterns) {
            this.charts.studyPatterns.destroy();
        }

        // For hourly pattern, show 24 hours
        const hourlyData = new Array(24).fill(0);
        const learningHours = this.analyticsData.learning_hours || {};

        Object.entries(learningHours).forEach(([hour, count]) => {
            hourlyData[parseInt(hour)] = count;
        });

        this.charts.studyPatterns = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Study Sessions',
                    data: hourlyData,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.parsed.y} sessions at ${context.label}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderTopicDistributionChart() {
        const canvas = document.getElementById('topicDistributionChart');
        if (!canvas || !this.analyticsData) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.charts.topicDistribution) {
            this.charts.topicDistribution.destroy();
        }

        // Calculate topic distribution from progress data
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
        const progress = this.analyticsData.progress?.progress || {};
        const topicCounts = {};
        let total = 0;

        Object.values(progress).forEach(item => {
            if (item.completed && item.topic) {
                const category = this.categorizeTopics(item.topic);
                topicCounts[category] = (topicCounts[category] || 0) + 1;
                total++;
            }
        });

        return {
            labels: Object.keys(topicCounts),
            data: Object.values(topicCounts),
            total
        };
    }

    categorizeTopics(topic) {
        const topicLower = topic.toLowerCase();

        if (topicLower.includes('array') || topicLower.includes('string')) return 'Arrays & Strings';
        if (topicLower.includes('linked') || topicLower.includes('list')) return 'Linked Lists';
        if (topicLower.includes('stack') || topicLower.includes('queue')) return 'Stacks & Queues';
        if (topicLower.includes('tree')) return 'Trees';
        if (topicLower.includes('graph')) return 'Graphs';
        if (topicLower.includes('hash')) return 'Hashing';
        if (topicLower.includes('sort') || topicLower.includes('search')) return 'Algorithms';
        if (topicLower.includes('dynamic')) return 'Dynamic Programming';

        return 'Other';
    }

    renderInsights() {
        const insightsList = document.getElementById('insightsList');
        if (!insightsList || !this.analyticsData) return;

        const insights = this.generateInsights();

        insightsList.innerHTML = insights.map(insight => `
            <div class="p-3 rounded-lg ${insight.bgColor}">
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 rounded-full ${insight.iconBgColor} flex items-center justify-center flex-shrink-0">
                        <i class="bi ${insight.icon} ${insight.iconColor}"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900 dark:text-white text-sm">${insight.title}</h4>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">${insight.description}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    generateInsights() {
        const metrics = this.calculateMetrics();
        const insights = [];

        // Best study time insight
        const learningHours = this.analyticsData.learning_hours || {};
        const bestHour = Object.entries(learningHours).sort(([, a], [, b]) => b - a)[0];
        if (bestHour) {
            insights.push({
                title: 'Peak Study Time',
                description: `You're most productive at ${bestHour[0]}:00 with ${bestHour[1]} sessions`,
                icon: 'bi-sun',
                bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                iconBgColor: 'bg-yellow-100 dark:bg-yellow-900',
                iconColor: 'text-yellow-600 dark:text-yellow-400'
            });
        }

        // Consistency insight
        if (metrics.consistencyScore >= 80) {
            insights.push({
                title: 'Excellent Consistency',
                description: `You've studied ${metrics.consistencyScore}% of days this period!`,
                icon: 'bi-trophy',
                bgColor: 'bg-green-50 dark:bg-green-900/20',
                iconBgColor: 'bg-green-100 dark:bg-green-900',
                iconColor: 'text-green-600 dark:text-green-400'
            });
        } else if (metrics.consistencyScore < 50) {
            insights.push({
                title: 'Improve Consistency',
                description: 'Try to study a little bit every day for better retention',
                icon: 'bi-lightbulb',
                bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                iconBgColor: 'bg-blue-100 dark:bg-blue-900',
                iconColor: 'text-blue-600 dark:text-blue-400'
            });
        }

        // Velocity insight
        if (metrics.learningVelocity > 5) {
            insights.push({
                title: 'Fast Learner',
                description: `You're completing ${metrics.learningVelocity} topics per week!`,
                icon: 'bi-speedometer2',
                bgColor: 'bg-purple-50 dark:bg-purple-900/20',
                iconBgColor: 'bg-purple-100 dark:bg-purple-900',
                iconColor: 'text-purple-600 dark:text-purple-400'
            });
        }

        // Focus insight
        if (metrics.avgSessionTime > 60) {
            insights.push({
                title: 'Deep Focus Sessions',
                description: `Your average session is ${metrics.avgSessionTime} minutes`,
                icon: 'bi-clock',
                bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
                iconBgColor: 'bg-indigo-100 dark:bg-indigo-900',
                iconColor: 'text-indigo-600 dark:text-indigo-400'
            });
        }

        return insights.slice(0, 4);
    }

    renderTables() {
        this.renderWeeklyBreakdown();
        this.renderTopTopics();
    }

    renderWeeklyBreakdown() {
        const table = document.getElementById('weeklyBreakdownTable');
        if (!table || !this.analyticsData) return;

        const weeklyData = this.getWeeklyBreakdown();

        table.innerHTML = weeklyData.map(week => `
            <tr>
                <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">Week ${week.week}</td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${week.topics}</td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${week.hours}h</td>
                <td class="px-4 py-3">
                    <div class="flex items-center">
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: ${week.progress}%"></div>
                        </div>
                        <span class="text-xs text-gray-600 dark:text-gray-400">${week.progress}%</span>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getWeeklyBreakdown() {
        // Mock data - in real app, this would be calculated from actual progress
        const weeks = [];
        for (let i = 1; i <= 4; i++) {
            weeks.push({
                week: i,
                topics: Math.floor(Math.random() * 7) + 1,
                hours: Math.floor(Math.random() * 15) + 5,
                progress: Math.floor(Math.random() * 100)
            });
        }
        return weeks;
    }

    renderTopTopics() {
        const container = document.getElementById('topTopicsList');
        if (!container || !this.analyticsData) return;

        const topTopics = this.getTopTopics();

        container.innerHTML = topTopics.map((topic, index) => `
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full ${this.getIndexColor(index)} text-white flex items-center justify-center font-medium text-sm">
                        ${index + 1}
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white text-sm">${topic.name}</h4>
                        <p class="text-xs text-gray-600 dark:text-gray-400">${topic.time}m spent</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">${topic.completed}</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">completed</div>
                </div>
            </div>
        `).join('');
    }

    getTopTopics() {
        // Mock data - in real app, this would be calculated from actual progress
        return [
            { name: 'Arrays & Strings', completed: 12, time: 240 },
            { name: 'Trees', completed: 8, time: 180 },
            { name: 'Dynamic Programming', completed: 6, time: 320 },
            { name: 'Graphs', completed: 5, time: 150 },
            { name: 'Sorting & Searching', completed: 4, time: 90 }
        ];
    }

    getIndexColor(index) {
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
        return colors[index % colors.length];
    }

    changePeriod(days) {
        this.currentPeriod = days;

        // Update button states
        ['7', '30', '90'].forEach(period => {
            const btn = document.getElementById(`period${period}d`);
            if (btn) {
                if (period == days) {
                    btn.className = 'px-3 py-1 text-sm font-medium bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-md shadow-sm';
                } else {
                    btn.className = 'px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-white dark:hover:bg-gray-600';
                }
            }
        });

        // Reload data and refresh charts
        this.loadAnalyticsData().then(() => {
            this.renderMetrics();
            this.renderCharts();
            this.renderInsights();
            this.renderTables();
        });
    }

    switchPatternView(view) {
        // Update button states
        const hourlyBtn = document.getElementById('hourlyPatternBtn');
        const weeklyBtn = document.getElementById('weeklyPatternBtn');

        if (view === 'hourly') {
            if (hourlyBtn) hourlyBtn.className = 'px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md';
            if (weeklyBtn) weeklyBtn.className = 'px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md';
        } else {
            if (weeklyBtn) weeklyBtn.className = 'px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md';
            if (hourlyBtn) hourlyBtn.className = 'px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md';
        }

        // Re-render study patterns chart with different view
        this.renderStudyPatternsChart();
    }

    async exportAnalytics() {
        try {
            const exportData = {
                period: `${this.currentPeriod} days`,
                metrics: this.calculateMetrics(),
                analytics: this.analyticsData,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `dsa-analytics-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            notificationManager.success('Analytics data exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            notificationManager.error('Failed to export analytics data');
        }
    }

    updateElement(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    updateProgressBar(id, percentage) {
        const bar = document.getElementById(id);
        if (bar) {
            bar.style.width = `${Math.min(100, percentage)}%`;
        }
    }
}

// Initialize analytics manager when on analytics page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('analytics')) {
        window.analyticsManager = new AnalyticsManager();
    }
});