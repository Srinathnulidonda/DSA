// Dashboard and main app functionality

class DashboardManager {
    static currentView = 'dashboard';
    static charts = {};
    static intervals = {};

    static async init() {
        this.setupEventListeners();
        this.setupViewNavigation();
        this.loadDailyQuote();
        await this.loadDashboardData();
    }

    static setupEventListeners() {
        // Profile form submission
        document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = FormUtils.serializeForm(e.target);
            await ProfileManager.updateProfile(formData);
        });

        // Search functionality
        document.getElementById('notesSearch')?.addEventListener('input', (e) => {
            NotesManager.filterNotes(e.target.value);
        });

        // Filter changes
        document.getElementById('notesTopicFilter')?.addEventListener('change', (e) => {
            NotesManager.filterByTopic(e.target.value);
        });

        document.getElementById('notesWeekFilter')?.addEventListener('change', (e) => {
            NotesManager.filterByWeek(e.target.value);
        });
    }

    static setupViewNavigation() {
        // Update active navigation state
        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link') || e.target.closest('.bottom-nav-item')) {
                this.updateNavigation(e.target.closest('[onclick]'));
            }
        });
    }

    static updateNavigation(activeElement) {
        if (!activeElement) return;

        // Update sidebar navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Update bottom navigation
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current item
        activeElement.classList.add('active');
    }

    static async loadDashboardData() {
        try {
            LoadingManager.show('dashboardView', 'Loading dashboard...');

            const [dashboardData, streakData] = await Promise.all([
                APIClient.get('/dashboard'),
                APIClient.get('/streaks')
            ]);

            if (dashboardData) {
                this.updateDashboardStats(dashboardData.statistics);
                this.updateRecentActivity(dashboardData.recent_activity);
                this.updateTopTopics(dashboardData.top_topics);
                this.createWeeklyChart(dashboardData.statistics);
            }

            if (streakData) {
                StreakManager.updateStreakDisplay(streakData);
            }

            this.updateTodaysFocus();

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            ToastManager.error('Failed to load dashboard data');
        }
    }

    static updateDashboardStats(stats) {
        const elements = {
            totalCompleted: document.getElementById('totalCompleted'),
            totalTime: document.getElementById('totalTime'),
            completionRate: document.getElementById('completionRate'),
            weekProgress: document.getElementById('weekProgress')
        };

        if (elements.totalCompleted) {
            AnimationUtils.countUp(elements.totalCompleted, 0, stats.total_completed);
        }

        if (elements.totalTime) {
            elements.totalTime.textContent = DateUtils.formatDuration(stats.total_time_minutes);
        }

        if (elements.completionRate) {
            AnimationUtils.countUp(elements.completionRate, 0, Math.round(stats.completion_rate));
            elements.completionRate.textContent += '%';
        }

        if (elements.weekProgress) {
            AnimationUtils.countUp(elements.weekProgress, 0, stats.week_pomodoros || 0);
        }
    }

    static updateRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="text-muted small">No recent activity</p>';
            return;
        }

        const activitiesHtml = activities.map(activity => `
            <div class="d-flex align-items-center mb-2">
                <div class="tw-w-2 tw-h-2 tw-bg-green-500 tw-rounded-full me-2"></div>
                <div class="flex-grow-1">
                    <div class="small fw-medium">${activity.topic}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">
                        Week ${activity.week}, Day ${activity.day}
                    </div>
                </div>
                <small class="text-muted">
                    ${DateUtils.formatDate(activity.completed_at, 'relative')}
                </small>
            </div>
        `).join('');

        container.innerHTML = activitiesHtml;
    }

    static updateTopTopics(topics) {
        const container = document.getElementById('topicDistribution');
        if (!container) return;

        if (!topics || topics.length === 0) {
            container.innerHTML = '<p class="text-muted">No topic data available</p>';
            return;
        }

        const maxTime = Math.max(...topics.map(t => t.time));

        const topicsHtml = topics.map(topic => {
            const percentage = (topic.time / maxTime) * 100;
            return `
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small fw-medium">${topic.topic}</span>
                        <span class="small text-muted">${DateUtils.formatDuration(topic.time)}</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-primary" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = topicsHtml;
    }

    static createWeeklyChart(stats) {
        const canvas = document.getElementById('weeklyChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.charts.weekly) {
            this.charts.weekly.destroy();
        }

        // Generate sample data for the last 7 days
        const days = [];
        const studyTime = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            studyTime.push(Math.floor(Math.random() * 120) + 30); // Sample data
        }

        this.charts.weekly = ChartUtils.createLineChart(ctx, {
            labels: days,
            datasets: [{
                label: 'Study Time (minutes)',
                data: studyTime,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        });
    }

    static updateTodaysFocus() {
        const container = document.getElementById('todaysFocus');
        if (!container) return;

        // Get current week and day from roadmap
        const today = new Date();
        const currentWeek = Math.ceil((today.getTime() - new Date('2024-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000)) % 14 || 1;
        const currentDay = today.getDay() || 1; // 1-7 for Monday-Sunday

        // This would be loaded from the roadmap data
        container.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="tw-bg-blue-100 tw-text-blue-600 rounded-circle p-2 me-3 mt-1">
                    <i class="bi bi-book"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="fw-bold mb-2">Week ${currentWeek} - Day ${currentDay}</h6>
                    <p class="mb-2">Today's focus: <strong>Continue your DSA journey</strong></p>
                    <div class="d-flex gap-2 flex-wrap">
                        <span class="badge bg-primary">Study</span>
                        <span class="badge bg-success">Practice</span>
                        <span class="badge bg-info">Review</span>
                    </div>
                </div>
            </div>
        `;
    }

    static loadDailyQuote() {
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Code is like humor. When you have to explain it, it's bad. - Cory House",
            "First, solve the problem. Then, write the code. - John Johnson",
            "Experience is the name everyone gives to their mistakes. - Oscar Wilde",
            "In order to be irreplaceable, one must always be different. - Coco Chanel",
            "Java is to JavaScript what car is to Carpet. - Chris Heilmann",
            "Talk is cheap. Show me the code. - Linus Torvalds",
            "That's the thing about people who think they hate computers. What they really hate is lousy programmers. - Larry Niven",
            "Programming isn't about what you know; it's about what you can figure out. - Chris Pine",
            "The best error message is the one that never shows up. - Thomas Fuchs"
        ];

        const dailyQuoteElement = document.getElementById('dailyQuote');
        if (dailyQuoteElement) {
            const today = new Date().toDateString();
            const savedQuote = localStorage.getItem(`daily_quote_${today}`);

            if (savedQuote) {
                dailyQuoteElement.textContent = savedQuote;
            } else {
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                dailyQuoteElement.textContent = randomQuote;
                localStorage.setItem(`daily_quote_${today}`, randomQuote);
            }
        }
    }
}

// Streak Management
class StreakManager {
    static updateStreakDisplay(streakData) {
        const elements = {
            currentStreak: document.getElementById('currentStreak'),
            longestStreak: document.getElementById('longestStreak'),
            streakProgress: document.getElementById('streakProgress')
        };

        if (elements.currentStreak) {
            AnimationUtils.countUp(elements.currentStreak, 0, streakData.current_streak);
        }

        if (elements.longestStreak) {
            elements.longestStreak.textContent = streakData.longest_streak;
        }

        if (elements.streakProgress) {
            const progressPercent = Math.min((streakData.current_streak / 30) * 100, 100);
            elements.streakProgress.style.width = `${progressPercent}%`;
        }

        // Update progress view streak
        const progressStreak = document.getElementById('progressStreak');
        if (progressStreak) {
            progressStreak.textContent = streakData.current_streak;
        }
    }
}

// Roadmap Management
class RoadmapManager {
    static roadmapData = null;

    static async loadRoadmap() {
        try {
            const response = await fetch(`${API_BASE_URL}/roadmap`);
            const data = await response.json();

            if (data.roadmap) {
                this.roadmapData = data.roadmap;
                this.renderRoadmap();
            }
        } catch (error) {
            console.error('Failed to load roadmap:', error);
            ToastManager.error('Failed to load roadmap');
        }
    }

    static renderRoadmap() {
        const container = document.getElementById('roadmapContainer');
        if (!container || !this.roadmapData) return;

        const roadmapHtml = this.roadmapData.map(week => `
            <div class="glass-card mb-4 week-card" data-week="${week.week}">
                <div class="week-header" onclick="toggleWeek(${week.week})">
                    <div class="flex-grow-1">
                        <h5 class="mb-1 fw-bold">Week ${week.week}: ${week.title}</h5>
                        <p class="mb-0 small opacity-75">${week.goal}</p>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="badge bg-light text-dark me-2" id="weekProgress${week.week}">0/7</span>
                        <i class="bi bi-chevron-down transition-transform" id="weekIcon${week.week}"></i>
                    </div>
                </div>
                <div class="week-content collapse" id="weekContent${week.week}">
                    ${this.renderWeekContent(week)}
                </div>
            </div>
        `).join('');

        container.innerHTML = roadmapHtml;
        this.updateWeekProgress();
    }

    static renderWeekContent(week) {
        const daysHtml = week.days.map((day, index) => `
            <div class="day-item" data-week="${week.week}" data-day="${index + 1}">
                <div class="day-checkbox">
                    <input type="checkbox" class="form-check-input" 
                           id="day${week.week}_${index + 1}"
                           onchange="updateDayProgress(${week.week}, ${index + 1}, this.checked)">
                </div>
                <div class="day-info flex-grow-1">
                    <div class="day-topic">${day.day}: ${day.topic}</div>
                    <div class="day-activities">${day.activities}</div>
                    <div class="mt-2">
                        ${this.renderResources(day.resources)}
                    </div>
                    <small class="text-muted">
                        <i class="bi bi-clock me-1"></i>~${day.time_estimate} minutes
                    </small>
                </div>
                <div class="day-status">
                    <span class="status-pending" id="status${week.week}_${index + 1}">Pending</span>
                </div>
            </div>
        `).join('');

        const projectHtml = week.project ? `
            <div class="mt-3 p-3 rounded-3 tw-bg-gradient-to-r tw-from-green-400 tw-to-blue-500 text-white">
                <h6 class="fw-bold mb-2">
                    <i class="bi bi-trophy me-2"></i>Week Project: ${week.project.title}
                </h6>
                <p class="mb-2 small">${week.project.description}</p>
                <div class="d-flex gap-1 flex-wrap">
                    ${week.project.skills.map(skill => `
                        <span class="badge bg-light text-dark">${skill}</span>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return daysHtml + projectHtml;
    }

    static renderResources(resourceKeys) {
        if (!resourceKeys || resourceKeys.length === 0) return '';

        // This would fetch from the resources API
        return resourceKeys.map(key => {
            // Placeholder resource rendering
            return `<a href="#" class="resource-link" onclick="openResource('${key}')">
                <i class="bi bi-link-45deg me-1"></i>Resource
            </a>`;
        }).join('');
    }

    static async updateWeekProgress() {
        try {
            const progressData = await APIClient.get('/progress');
            if (progressData?.progress) {
                this.applyProgressToRoadmap(progressData.progress);
            }
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    static applyProgressToRoadmap(progressData) {
        // Apply progress data to the roadmap display
        for (const [key, progress] of Object.entries(progressData)) {
            const [weekPart, dayPart] = key.split('_');
            const week = parseInt(weekPart.replace('week', ''));
            const day = parseInt(dayPart.replace('day', ''));

            const checkbox = document.getElementById(`day${week}_${day}`);
            const status = document.getElementById(`status${week}_${day}`);

            if (checkbox) {
                checkbox.checked = progress.completed;
            }

            if (status) {
                if (progress.completed) {
                    status.textContent = 'Completed';
                    status.className = 'status-completed';
                } else {
                    status.textContent = 'Pending';
                    status.className = 'status-pending';
                }
            }
        }

        // Update week progress counters
        this.roadmapData?.forEach(week => {
            const completed = week.days.filter((_, index) => {
                const checkbox = document.getElementById(`day${week.week}_${index + 1}`);
                return checkbox?.checked;
            }).length;

            const progressBadge = document.getElementById(`weekProgress${week.week}`);
            if (progressBadge) {
                progressBadge.textContent = `${completed}/7`;
            }
        });
    }
}

// Progress Management
class ProgressManager {
    static progressData = null;

    static async loadProgress() {
        try {
            const data = await APIClient.get('/progress');
            if (data) {
                this.progressData = data;
                this.updateProgressView(data);
            }
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    static updateProgressView(data) {
        const stats = data.statistics;

        // Update progress stats
        const elements = {
            progressCompleted: document.getElementById('progressCompleted'),
            progressTime: document.getElementById('progressTime'),
            progressPercentage: document.getElementById('progressPercentage')
        };

        if (elements.progressCompleted) {
            elements.progressCompleted.textContent = stats.total_completed;
        }

        if (elements.progressTime) {
            elements.progressTime.textContent = DateUtils.formatDuration(stats.total_time_minutes);
        }

        if (elements.progressPercentage) {
            elements.progressPercentage.textContent = Math.round(stats.completion_percentage) + '%';
        }

        this.renderProgressGrid();
    }

    static renderProgressGrid() {
        const container = document.getElementById('progressGrid');
        if (!container) return;

        // This would render a visual progress grid
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                Progress grid visualization will be rendered here with completed/pending topics.
            </div>
        `;
    }

    static async updateDayProgress(week, day, completed) {
        try {
            const response = await APIClient.post('/progress', {
                week: week,
                day: day,
                completed: completed,
                time_spent: completed ? 30 : 0 // Default time if completing
            });

            if (response) {
                ToastManager.success(completed ? 'Progress updated!' : 'Progress cleared');

                // Update UI
                const status = document.getElementById(`status${week}_${day}`);
                if (status) {
                    if (completed) {
                        status.textContent = 'Completed';
                        status.className = 'status-completed';
                    } else {
                        status.textContent = 'Pending';
                        status.className = 'status-pending';
                    }
                }

                // Refresh dashboard data
                await DashboardManager.loadDashboardData();
            }
        } catch (error) {
            console.error('Failed to update progress:', error);
            ToastManager.error('Failed to update progress');
        }
    }
}

// Global functions for HTML onclick handlers
window.showView = (viewName) => ViewManager.showView(viewName);
window.toggleWeek = (weekNumber) => {
    const content = document.getElementById(`weekContent${weekNumber}`);
    const icon = document.getElementById(`weekIcon${weekNumber}`);

    if (content.classList.contains('show')) {
        content.classList.remove('show');
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.classList.add('show');
        icon.style.transform = 'rotate(180deg)';
    }
};

window.expandAllWeeks = () => {
    document.querySelectorAll('.week-content').forEach(content => {
        content.classList.add('show');
    });
    document.querySelectorAll('[id^="weekIcon"]').forEach(icon => {
        icon.style.transform = 'rotate(180deg)';
    });
};

window.collapseAllWeeks = () => {
    document.querySelectorAll('.week-content').forEach(content => {
        content.classList.remove('show');
    });
    document.querySelectorAll('[id^="weekIcon"]').forEach(icon => {
        icon.style.transform = 'rotate(0deg)';
    });
};

window.updateDayProgress = (week, day, completed) => {
    ProgressManager.updateDayProgress(week, day, completed);
};

window.openResource = (resourceKey) => {
    // This would open the resource in a new tab
    window.open('#', '_blank');
};

window.DashboardManager = DashboardManager;
window.StreakManager = StreakManager;
window.RoadmapManager = RoadmapManager;
window.ProgressManager = ProgressManager;   