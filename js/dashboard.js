// ===== DASHBOARD CONTROLLER =====

class DashboardController {
    constructor(app) {
        this.app = app;
        this.charts = {};
        this.currentWeekData = null;
        this.todayTasks = [];
        this.streakCalendar = null;

        this.init();
    }

    init() {
        this.setupDashboardEventListeners();
        this.initializeCharts();
    }

    setupDashboardEventListeners() {
        // Task completion handlers
        document.addEventListener('change', (e) => {
            if (e.target.matches('.task-checkbox')) {
                this.handleTaskToggle(e.target);
            }
        });

        // Quick action handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.quick-action-btn') || e.target.closest('.quick-action-btn')) {
                this.handleQuickAction(e.target.closest('.quick-action-btn'));
            }
        });

        // Refresh handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.refresh-dashboard')) {
                this.refreshDashboard();
            }
        });
    }

    // ===== MAIN DASHBOARD LOADING =====
    loadDashboard() {
        this.updateDashboardStats();
        this.loadTodayTasks();
        this.updateHeroSection();
        this.loadQuickResources();
        this.updateWeekProgress();
        this.loadRecentActivity();
        this.updateAchievements();
        this.updateCharts();
        this.showTodayDate();
    }

    updateDashboardStats() {
        const stats = this.calculateDetailedStats();

        // Update main stat cards
        this.updateStatCard('totalDaysCompleted', stats.daysCompleted, 98, 'days');
        this.updateStatCard('totalProjectsCompleted', stats.projectsCompleted, 15, 'projects');
        this.updateStatCard('totalProblemsSolved', stats.problemsSolved, 500, 'problems');
        this.updateStatCard('currentStreakDays', stats.currentStreak, 30, 'days');

        // Update hero stats
        this.updateHeroStats(stats);

        // Update trend indicators
        this.updateTrendIndicators(stats);
    }

    updateStatCard(elementId, current, total, unit) {
        const numberElement = document.getElementById(elementId);
        const progressElement = document.getElementById(elementId.replace('total', '').replace('current', '') + 'ProgressBar');
        const textElement = document.getElementById(elementId.replace('total', '').replace('current', '') + 'ProgressText');

        if (numberElement) {
            this.animateNumber(numberElement, current);
        }

        if (progressElement) {
            const percentage = Math.min((current / total) * 100, 100);
            this.animateProgressBar(progressElement, percentage);
        }

        if (textElement) {
            textElement.textContent = `${current}/${total} ${unit}`;
        }
    }

    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - currentValue) / 20);

        if (currentValue < targetValue) {
            element.textContent = Math.min(currentValue + increment, targetValue);
            setTimeout(() => this.animateNumber(element, targetValue), 50);
        }
    }

    animateProgressBar(element, targetPercentage) {
        element.style.width = `${targetPercentage}%`;
    }

    updateHeroStats(stats) {
        const heroStreak = document.getElementById('heroStreak');
        const heroProgress = document.getElementById('heroProgress');

        if (heroStreak) {
            heroStreak.textContent = `🔥 ${stats.currentStreak} day streak`;
        }

        if (heroProgress) {
            const overallProgress = Math.round((stats.daysCompleted / 98) * 100);
            heroProgress.textContent = `📚 ${overallProgress}% complete`;
        }
    }

    updateTrendIndicators(stats) {
        // Calculate weekly trends
        const weeklyTrends = this.calculateWeeklyTrends();

        // Update trend displays in stat cards
        document.querySelectorAll('.stat-trend').forEach((trend, index) => {
            const trendData = weeklyTrends[index];
            if (trendData) {
                const icon = trend.querySelector('i');
                const text = trend.querySelector('span');

                if (icon && text) {
                    icon.className = trendData.trend > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
                    text.textContent = trendData.text;
                    trend.className = `stat-trend ${trendData.trend > 0 ? 'trend-up' : 'trend-down'}`;
                }
            }
        });
    }

    calculateWeeklyTrends() {
        // Mock trend calculations - in real app, this would analyze historical data
        return [
            { trend: 1, text: '+2 this week' },
            { trend: 1, text: '+1 this week' },
            { trend: 1, text: '+5 today' },
            { trend: 1, text: 'On fire!' }
        ];
    }

    updateHeroSection() {
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');

        if (heroTitle) {
            const hour = new Date().getHours();
            let greeting = 'Welcome back';

            if (hour < 12) greeting = 'Good morning';
            else if (hour < 18) greeting = 'Good afternoon';
            else greeting = 'Good evening';

            const name = this.app.progress.settings?.displayName || 'Coder';
            heroTitle.textContent = `${greeting}, ${name}! 👋`;
        }

        if (heroSubtitle) {
            const motivationalMessages = [
                'Ready to master Data Structures & Algorithms?',
                'Let\'s continue your DSA journey!',
                'Time to level up your coding skills!',
                'Every day brings you closer to mastery!',
                'Consistency is the key to success!'
            ];

            const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
            const messageIndex = dayOfYear % motivationalMessages.length;
            heroSubtitle.textContent = motivationalMessages[messageIndex];
        }
    }

    // ===== TODAY'S TASKS =====
    loadTodayTasks() {
        const container = document.getElementById('todayTasksContainer');
        if (!container) return;

        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Find current week's tasks
        const currentWeekData = DSA_ROADMAP.weeks.find(week => week.id === this.app.currentWeek);
        if (!currentWeekData) {
            container.innerHTML = this.getNoTasksHTML();
            return;
        }

        // Get today's task (adjust for Sunday = 0)
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0, Sunday = 6
        const todayTask = currentWeekData.days[adjustedDay];

        if (todayTask) {
            this.todayTasks = [todayTask];
            container.innerHTML = this.generateTodayTasksHTML(todayTask, currentWeekData.id);
        } else {
            container.innerHTML = this.getNoTasksHTML();
        }

        // Update task completion states
        this.updateTaskCompletionStates();
    }

    generateTodayTasksHTML(task, weekId) {
        const taskId = `week-${weekId}-day-${task.day.toLowerCase()}`;
        const isCompleted = this.app.progress.completedTasks?.includes(taskId) || false;
        const isProject = task.isProject || false;

        return `
            <div class="task-item ${isCompleted ? 'completed' : ''}" data-task-id="${taskId}">
                <div class="task-header">
                    <input type="checkbox" class="form-check-input task-checkbox" 
                           ${isCompleted ? 'checked' : ''}>
                    <div class="task-content">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="task-title">
                                ${isProject ? '<i class="fas fa-project-diagram me-2"></i>' : ''}
                                ${task.topic}
                            </h6>
                            <div class="task-meta">
                                <span class="badge bg-info">${task.timeRequired}</span>
                                <span class="badge bg-secondary">${task.difficulty}</span>
                                ${isProject ? '<span class="badge bg-warning">Project</span>' : ''}
                            </div>
                        </div>
                        
                        <div class="task-description mb-2">
                            <strong>${task.subtopic}</strong>
                        </div>
                        
                        <div class="task-activities mb-3">
                            ${task.activities.map(activity => `
                                <span class="activity-tag">${activity}</span>
                            `).join('')}
                        </div>
                        
                        <div class="task-objectives mb-3">
                            <small class="text-muted d-block mb-1">Learning Objectives:</small>
                            <ul class="small mb-0">
                                ${task.learningObjectives?.map(obj => `<li>${obj}</li>`).join('') || ''}
                            </ul>
                        </div>
                        
                        ${task.resources?.length > 0 ? `
                            <div class="task-resources mb-3">
                                <small class="text-muted d-block mb-2">Resources:</small>
                                <div class="resources-grid">
                                    ${task.resources.map(resource => `
                                        <a href="${resource.url}" target="_blank" class="resource-link" 
                                           title="${resource.description || ''}">
                                            <i class="fas fa-external-link-alt me-1"></i>
                                            ${resource.name}
                                            <small class="d-block text-muted">${resource.estimatedTime || ''}</small>
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${task.practiceProblems?.length > 0 ? `
                            <div class="task-problems">
                                <small class="text-muted d-block mb-2">Practice Problems:</small>
                                <div class="problems-list">
                                    ${task.practiceProblems.map(problem => `
                                        <div class="practice-problem">
                                            <a href="${problem.url || '#'}" target="_blank" class="problem-link">
                                                <i class="fas fa-code me-1"></i>
                                                ${problem.title}
                                            </a>
                                            <span class="badge badge-${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
                                            <small class="text-muted d-block">${problem.description}</small>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getNoTasksHTML() {
        return `
            <div class="no-tasks-message text-center py-4">
                <div class="no-tasks-icon mb-3">
                    <i class="fas fa-calendar-check fa-3x text-muted"></i>
                </div>
                <h5 class="text-muted">No tasks for today</h5>
                <p class="text-muted">Take a break or review previous topics!</p>
                <button class="btn btn-outline-primary" onclick="app.navigateToSection('roadmap')">
                    <i class="fas fa-route me-2"></i>View Full Roadmap
                </button>
            </div>
        `;
    }

    updateTaskCompletionStates() {
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            const taskItem = checkbox.closest('.task-item');
            const taskId = taskItem?.dataset.taskId;

            if (taskId && this.app.progress.completedTasks?.includes(taskId)) {
                checkbox.checked = true;
                taskItem.classList.add('completed');
            }
        });
    }

    handleTaskToggle(checkbox) {
        const taskItem = checkbox.closest('.task-item');
        const taskId = taskItem?.dataset.taskId;

        if (!taskId) return;

        if (checkbox.checked) {
            this.completeTask(taskId, taskItem);
        } else {
            this.uncompleteTask(taskId, taskItem);
        }

        this.app.saveProgress();
        this.updateDashboardStats();
    }

    completeTask(taskId, taskItem) {
        if (!this.app.progress.completedTasks.includes(taskId)) {
            this.app.progress.completedTasks.push(taskId);
            taskItem.classList.add('completed');

            // Add completion animation
            this.showTaskCompletionAnimation(taskItem);

            // Update progress
            this.app.addActivity(`Completed: ${taskId}`, 'success');
            this.app.checkForAchievements();
            this.app.updateStreak();

            // Play sound
            if (this.app.progress.settings?.sounds) {
                this.app.playNotificationSound();
            }

            // Show encouragement
            this.showTaskEncouragement();
        }
    }

    uncompleteTask(taskId, taskItem) {
        const index = this.app.progress.completedTasks.indexOf(taskId);
        if (index > -1) {
            this.app.progress.completedTasks.splice(index, 1);
            taskItem.classList.remove('completed');
            this.app.addActivity(`Uncompleted: ${taskId}`, 'warning');
        }
    }

    showTaskCompletionAnimation(taskItem) {
        // Add completion animation class
        taskItem.classList.add('task-completing');

        // Create floating completion indicator
        const indicator = document.createElement('div');
        indicator.className = 'completion-indicator';
        indicator.innerHTML = '<i class="fas fa-check"></i>';
        taskItem.appendChild(indicator);

        // Remove animation after delay
        setTimeout(() => {
            taskItem.classList.remove('task-completing');
            indicator.remove();
        }, 1000);
    }

    showTaskEncouragement() {
        const encouragements = [
            'Great job! 🎉',
            'Keep it up! 💪',
            'You\'re on fire! 🔥',
            'Excellent work! ⭐',
            'Stay focused! 🎯'
        ];

        const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
        this.app.showNotification('Task Complete!', randomEncouragement, 'success', 3000);
    }

    // ===== WEEK PROGRESS =====
    updateWeekProgress() {
        const weekProgressBar = document.getElementById('currentWeekProgress');
        const weekProgressText = document.getElementById('weekProgressText');
        const weekProgressPercentage = document.getElementById('weekProgressPercentage');

        const currentWeekData = DSA_ROADMAP.weeks.find(week => week.id === this.app.currentWeek);
        if (!currentWeekData) return;

        // Calculate week completion
        const weekTaskIds = currentWeekData.days.map((day, index) =>
            `week-${this.app.currentWeek}-day-${day.day.toLowerCase()}`
        );

        const completedWeekTasks = weekTaskIds.filter(taskId =>
            this.app.progress.completedTasks?.includes(taskId)
        );

        const weekProgress = (completedWeekTasks.length / weekTaskIds.length) * 100;

        if (weekProgressBar) {
            weekProgressBar.style.width = `${weekProgress}%`;
        }

        if (weekProgressPercentage) {
            weekProgressPercentage.textContent = `${Math.round(weekProgress)}%`;
        }

        if (weekProgressText) {
            weekProgressText.textContent = `Week ${this.app.currentWeek}: ${currentWeekData.title}`;
        }
    }

    // ===== QUICK RESOURCES =====
    loadQuickResources() {
        const container = document.getElementById('quickResourcesGrid');
        if (!container) return;

        const quickResources = [
            {
                name: 'LeetCode',
                description: 'Practice coding problems',
                url: 'https://leetcode.com',
                icon: 'fas fa-code',
                color: '#FFA500'
            },
            {
                name: 'VisuAlgo',
                description: 'Algorithm visualizations',
                url: 'https://visualgo.net/en',
                icon: 'fas fa-eye',
                color: '#4CAF50'
            },
            {
                name: 'GeeksforGeeks',
                description: 'DSA tutorials and articles',
                url: 'https://www.geeksforgeeks.org/data-structures/',
                icon: 'fas fa-book',
                color: '#2196F3'
            },
            {
                name: 'HackerRank',
                description: 'Coding challenges',
                url: 'https://www.hackerrank.com',
                icon: 'fas fa-trophy',
                color: '#00B74A'
            },
            {
                name: 'Codeforces',
                description: 'Competitive programming',
                url: 'https://codeforces.com',
                icon: 'fas fa-medal',
                color: '#FF6B35'
            },
            {
                name: 'W3Schools DSA',
                description: 'Beginner-friendly tutorials',
                url: 'https://www.w3schools.com/dsa/',
                icon: 'fas fa-graduation-cap',
                color: '#9C27B0'
            }
        ];

        container.innerHTML = quickResources.map(resource => `
            <div class="resource-card">
                <div class="resource-icon" style="color: ${resource.color}">
                    <i class="${resource.icon}"></i>
                </div>
                <div class="resource-content">
                    <h6 class="resource-title">${resource.name}</h6>
                    <p class="resource-description">${resource.description}</p>
                    <a href="${resource.url}" target="_blank" class="resource-url">
                        Visit <i class="fas fa-external-link-alt ms-1"></i>
                    </a>
                </div>
            </div>
        `).join('');
    }

    // ===== CHARTS =====
    initializeCharts() {
        if (typeof Chart === 'undefined') return;

        // Set global chart defaults
        Chart.defaults.font.family = 'Inter, sans-serif';
        Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');

        this.initializeProgressChart();
        this.initializeTopicChart();
        this.initializeTimeChart();
        this.initializeStreakChart();
    }

    initializeProgressChart() {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;

        const progressData = this.generateProgressData();

        this.charts.progress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: progressData.labels,
                datasets: [{
                    label: 'Daily Progress',
                    data: progressData.data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#6366f1',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    initializeTopicChart() {
        const ctx = document.getElementById('topicDistributionChart');
        if (!ctx) return;

        const topicData = this.generateTopicData();

        this.charts.topic = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topicData.labels,
                datasets: [{
                    data: topicData.data,
                    backgroundColor: [
                        '#6366f1',
                        '#8b5cf6',
                        '#06b6d4',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#ec4899',
                        '#84cc16'
                    ],
                    borderWidth: 0,
                    hoverBorderWidth: 2,
                    hoverBorderColor: '#ffffff'
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
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#6366f1',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function (context) {
                                const percentage = Math.round((context.parsed / context.dataset.data.reduce((a, b) => a + b, 0)) * 100);
                                return `${context.label}: ${percentage}%`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    initializeTimeChart() {
        const ctx = document.getElementById('timeDistributionChart');
        if (!ctx) return;

        const timeData = this.generateTimeData();

        this.charts.time = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: timeData.labels,
                datasets: [{
                    label: 'Hours Spent',
                    data: timeData.data,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                }
            }
        });
    }

    initializeStreakChart() {
        const ctx = document.getElementById('streakChart');
        if (!ctx) return;

        const streakData = this.generateStreakData();

        this.charts.streak = new Chart(ctx, {
            type: 'line',
            data: {
                labels: streakData.labels,
                datasets: [{
                    label: 'Streak',
                    data: streakData.data,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        display: false
                    }
                }
            }
        });
    }

    updateCharts() {
        Object.keys(this.charts).forEach(chartKey => {
            if (this.charts[chartKey]) {
                // Update chart data based on current progress
                this.updateChartData(chartKey);
                this.charts[chartKey].update('none'); // Smooth update without animation
            }
        });
    }

    updateChartData(chartKey) {
        switch (chartKey) {
            case 'progress':
                const progressData = this.generateProgressData();
                this.charts.progress.data.labels = progressData.labels;
                this.charts.progress.data.datasets[0].data = progressData.data;
                break;

            case 'topic':
                const topicData = this.generateTopicData();
                this.charts.topic.data.labels = topicData.labels;
                this.charts.topic.data.datasets[0].data = topicData.data;
                break;

            case 'time':
                const timeData = this.generateTimeData();
                this.charts.time.data.labels = timeData.labels;
                this.charts.time.data.datasets[0].data = timeData.data;
                break;

            case 'streak':
                const streakData = this.generateStreakData();
                this.charts.streak.data.labels = streakData.labels;
                this.charts.streak.data.datasets[0].data = streakData.data;
                break;
        }
    }

    // ===== DATA GENERATION =====
    generateProgressData() {
        // Generate last 14 days of progress
        const labels = [];
        const data = [];

        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            // Mock progress data - in real app, this would come from historical data
            data.push(Math.max(0, this.app.progress.daysCompleted - i + Math.random() * 3));
        }

        return { labels, data };
    }

    generateTopicData() {
        const topicStats = this.app.progress.stats?.topicStats || {};
        const defaultTopics = ['Arrays', 'Strings', 'Linked Lists', 'Stacks', 'Trees', 'Graphs', 'DP', 'Others'];

        const labels = [];
        const data = [];

        defaultTopics.forEach(topic => {
            const value = topicStats[topic] || Math.floor(Math.random() * 10) + 1;
            if (value > 0) {
                labels.push(topic);
                data.push(value);
            }
        });

        return { labels, data };
    }

    generateTimeData() {
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = labels.map(() => Math.random() * 4 + 0.5); // 0.5 to 4.5 hours

        return { labels, data };
    }

    generateStreakData() {
        const labels = [];
        const data = [];

        // Generate last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.getDate());

            // Mock streak data
            data.push(Math.max(0, this.app.progress.currentStreak - i + Math.random() * 2));
        }

        return { labels, data };
    }

    calculateDetailedStats() {
        const progress = this.app.progress;

        return {
            daysCompleted: progress.daysCompleted || 0,
            weeksCompleted: Math.floor((progress.daysCompleted || 0) / 7),
            projectsCompleted: progress.projectsCompleted || 0,
            problemsSolved: progress.problemsSolved || 0,
            currentStreak: progress.currentStreak || 0,
            longestStreak: progress.longestStreak || 0,
            totalTimeSpent: progress.totalTimeSpent || 0,
            averageTimePerDay: ((progress.totalTimeSpent || 0) / Math.max(progress.daysCompleted || 1, 1)).toFixed(1),
            completionRate: progress.daysCompleted ? (progress.daysCompleted / 98 * 100).toFixed(1) : 0,
            weeklyProgress: this.calculateWeeklyProgress(),
            todayProgress: this.calculateTodayProgress()
        };
    }

    calculateWeeklyProgress() {
        // Calculate current week's completion percentage
        const currentWeekData = DSA_ROADMAP.weeks.find(week => week.id === this.app.currentWeek);
        if (!currentWeekData) return 0;

        const weekTasks = currentWeekData.days.length;
        const completedTasks = currentWeekData.days.filter((day, index) => {
            const taskId = `week-${this.app.currentWeek}-day-${day.day.toLowerCase()}`;
            return this.app.progress.completedTasks?.includes(taskId);
        }).length;

        return Math.round((completedTasks / weekTasks) * 100);
    }

    calculateTodayProgress() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Count activities today
        const todayActivities = this.app.progress.activities?.filter(activity => {
            const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
            return activityDate === todayStr;
        }).length || 0;

        return todayActivities;
    }

    // ===== QUICK ACTIONS =====
    handleQuickAction(button) {
        const action = button.dataset.action || button.className.split(' ')[0];

        switch (action) {
            case 'pomodoro':
                this.app.openPomodoro();
                break;
            case 'practice':
                this.app.navigateToSection('practice');
                break;
            case 'notes':
                this.app.openNotes();
                break;
            case 'glossary':
                this.app.openGlossary();
                break;
            case 'complete-day':
                this.app.markDayComplete();
                break;
            case 'week-overview':
                this.showWeekOverview();
                break;
        }
    }

    showWeekOverview() {
        const currentWeekData = DSA_ROADMAP.weeks.find(week => week.id === this.app.currentWeek);
        if (!currentWeekData) return;

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Week ${this.app.currentWeek} Overview</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="week-overview">
                            <h6>${currentWeekData.title}</h6>
                            <p class="text-muted">${currentWeekData.description}</p>
                            
                            <div class="week-stats mb-4">
                                <div class="row">
                                    <div class="col-md-3">
                                        <div class="stat-item">
                                            <div class="stat-value">${currentWeekData.days.length}</div>
                                            <div class="stat-label">Days</div>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-item">
                                            <div class="stat-value">${currentWeekData.totalHours}h</div>
                                            <div class="stat-label">Total Time</div>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-item">
                                            <div class="stat-value">${currentWeekData.difficulty}</div>
                                            <div class="stat-label">Difficulty</div>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-item">
                                            <div class="stat-value">${this.calculateWeeklyProgress()}%</div>
                                            <div class="stat-label">Complete</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="week-goals">
                                <h6>Week Goals:</h6>
                                <ul>
                                    ${currentWeekData.completionCriteria?.map(criteria =>
            `<li>${criteria}</li>`
        ).join('') || '<li>Complete all daily tasks</li>'}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="app.navigateToSection('roadmap')" data-bs-dismiss="modal">
                            View Full Schedule
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Remove modal after hiding
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    showTodayDate() {
        const todayDateElement = document.getElementById('todayDate');
        if (todayDateElement) {
            const today = new Date();
            todayDateElement.textContent = today.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    refreshDashboard() {
        this.loadDashboard();
        this.app.showNotification('Dashboard Refreshed', 'All data has been updated!', 'info');
    }

    // ===== CLEANUP =====
    destroy() {
        // Clean up charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });

        this.charts = {};
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardController;
}

// Global function for HTML handlers
window.DashboardController = DashboardController;
