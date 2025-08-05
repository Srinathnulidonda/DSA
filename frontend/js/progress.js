// Progress Management for DSA Learning Dashboard

class ProgressManager {
    constructor() {
        this.progressData = this.loadProgressData();
        this.charts = {};
        this.setupEventListeners();
    }

    loadProgressData() {
        const saved = localStorage.getItem('progressData');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.getDefaultProgressData();
    }

    getDefaultProgressData() {
        return {
            completedDays: 0,
            completedProjects: 0,
            solvedProblems: 0,
            studyHours: 0,
            currentWeek: 1,
            currentDay: 1,
            streak: 0,
            lastStudyDate: null,
            weekProgress: Array(14).fill(0),
            topicMastery: {
                arrays: 0,
                linkedLists: 0,
                stacks: 0,
                queues: 0,
                trees: 0,
                graphs: 0,
                sorting: 0,
                searching: 0,
                dynamicProgramming: 0,
                greedy: 0,
                backtracking: 0,
                strings: 0
            },
            achievements: [],
            dailyGoals: {
                studyHours: 2,
                problemsSolved: 3,
                notesWritten: 1
            },
            weeklyGoals: {
                daysStudied: 5,
                projectsCompleted: 1,
                topicsLearned: 2
            },
            skillLevels: {
                beginner: 0,
                intermediate: 0,
                advanced: 0,
                expert: 0
            },
            studySessions: [],
            badges: [],
            learningPath: 'standard'
        };
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeCharts();
        });
    }

    // Progress Tracking
    updateProgress(type, value) {
        switch (type) {
            case 'dayCompleted':
                this.progressData.completedDays += value;
                this.updateWeekProgress();
                this.updateStreak();
                break;
            case 'projectCompleted':
                this.progressData.completedProjects += value;
                break;
            case 'problemSolved':
                this.progressData.solvedProblems += value;
                break;
            case 'studyTime':
                this.progressData.studyHours += value;
                this.recordStudySession(value);
                break;
            case 'topicMastery':
                this.updateTopicMastery(value.topic, value.progress);
                break;
        }

        this.checkAchievements();
        this.checkBadges();
        this.saveProgress();
        this.updateUI();
    }

    updateWeekProgress() {
        const currentWeekIndex = this.progressData.currentWeek - 1;
        if (currentWeekIndex >= 0 && currentWeekIndex < 14) {
            const daysInWeek = Math.min(this.progressData.completedDays - (currentWeekIndex * 7), 7);
            this.progressData.weekProgress[currentWeekIndex] = (daysInWeek / 7) * 100;
        }
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastStudy = this.progressData.lastStudyDate;

        if (lastStudy === today) {
            return; // Already studied today
        }

        if (lastStudy) {
            const lastStudyDate = new Date(lastStudy);
            const todayDate = new Date(today);
            const diffTime = todayDate - lastStudyDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                this.progressData.streak++;
            } else if (diffDays > 1) {
                this.progressData.streak = 1;
            }
        } else {
            this.progressData.streak = 1;
        }

        this.progressData.lastStudyDate = today;
    }

    updateTopicMastery(topic, progress) {
        if (this.progressData.topicMastery.hasOwnProperty(topic)) {
            this.progressData.topicMastery[topic] = Math.min(100, progress);
        }
    }

    recordStudySession(duration) {
        const session = {
            date: new Date().toISOString(),
            duration: duration,
            week: this.progressData.currentWeek,
            day: this.progressData.currentDay
        };

        this.progressData.studySessions.push(session);

        // Keep only last 100 sessions
        if (this.progressData.studySessions.length > 100) {
            this.progressData.studySessions = this.progressData.studySessions.slice(-100);
        }
    }

    // Achievement System
    checkAchievements() {
        const achievements = [
            {
                id: 'first_day',
                title: 'First Steps',
                description: 'Complete your first day of learning',
                icon: 'fa-baby',
                condition: () => this.progressData.completedDays >= 1,
                points: 10
            },
            {
                id: 'week_warrior',
                title: 'Week Warrior',
                description: 'Complete your first week',
                icon: 'fa-calendar-week',
                condition: () => this.progressData.completedDays >= 7,
                points: 50
            },
            {
                id: 'consistency_king',
                title: 'Consistency King',
                description: 'Maintain a 7-day streak',
                icon: 'fa-fire',
                condition: () => this.progressData.streak >= 7,
                points: 75
            },
            {
                id: 'project_pioneer',
                title: 'Project Pioneer',
                description: 'Complete your first project',
                icon: 'fa-rocket',
                condition: () => this.progressData.completedProjects >= 1,
                points: 25
            },
            {
                id: 'project_master',
                title: 'Project Master',
                description: 'Complete 5 projects',
                icon: 'fa-hammer',
                condition: () => this.progressData.completedProjects >= 5,
                points: 100
            },
            {
                id: 'problem_solver',
                title: 'Problem Solver',
                description: 'Solve 25 problems',
                icon: 'fa-puzzle-piece',
                condition: () => this.progressData.solvedProblems >= 25,
                points: 75
            },
            {
                id: 'coding_ninja',
                title: 'Coding Ninja',
                description: 'Solve 100 problems',
                icon: 'fa-ninja',
                condition: () => this.progressData.solvedProblems >= 100,
                points: 200
            },
            {
                id: 'time_keeper',
                title: 'Time Keeper',
                description: 'Study for 50 hours total',
                icon: 'fa-clock',
                condition: () => this.progressData.studyHours >= 50,
                points: 150
            },
            {
                id: 'dedication',
                title: 'Dedication',
                description: 'Maintain a 30-day streak',
                icon: 'fa-medal',
                condition: () => this.progressData.streak >= 30,
                points: 300
            },
            {
                id: 'dsa_master',
                title: 'DSA Master',
                description: 'Complete the entire roadmap',
                icon: 'fa-crown',
                condition: () => this.progressData.completedDays >= 98,
                points: 500
            }
        ];

        achievements.forEach(achievement => {
            if (achievement.condition() && !this.progressData.achievements.includes(achievement.id)) {
                this.progressData.achievements.push(achievement.id);
                this.showAchievementNotification(achievement);
            }
        });
    }

    checkBadges() {
        const badges = [
            {
                id: 'early_bird',
                title: 'Early Bird',
                description: 'Study before 8 AM',
                icon: 'fa-sun',
                condition: () => this.isEarlyBirdSession()
            },
            {
                id: 'night_owl',
                title: 'Night Owl',
                description: 'Study after 10 PM',
                icon: 'fa-moon',
                condition: () => this.isNightOwlSession()
            },
            {
                id: 'weekend_warrior',
                title: 'Weekend Warrior',
                description: 'Study on weekends',
                icon: 'fa-calendar-weekend',
                condition: () => this.isWeekendSession()
            },
            {
                id: 'perfectionist',
                title: 'Perfectionist',
                description: 'Complete a week with 100% accuracy',
                icon: 'fa-star',
                condition: () => this.isPerfectWeek()
            }
        ];

        badges.forEach(badge => {
            if (badge.condition() && !this.progressData.badges.includes(badge.id)) {
                this.progressData.badges.push(badge.id);
            }
        });
    }

    isEarlyBirdSession() {
        const now = new Date();
        return now.getHours() < 8;
    }

    isNightOwlSession() {
        const now = new Date();
        return now.getHours() >= 22;
    }

    isWeekendSession() {
        const now = new Date();
        return now.getDay() === 0 || now.getDay() === 6;
    }

    isPerfectWeek() {
        const currentWeekIndex = this.progressData.currentWeek - 1;
        return this.progressData.weekProgress[currentWeekIndex] === 100;
    }

    showAchievementNotification(achievement) {
        // Create achievement popup
        const popup = document.createElement('div');
        popup.className = 'achievement-notification position-fixed top-50 start-50 translate-middle';
        popup.innerHTML = `
            <div class="card border-warning shadow-lg" style="min-width: 300px;">
                <div class="card-body text-center">
                    <div class="achievement-icon text-warning mb-3">
                        <i class="fas ${achievement.icon} fa-3x"></i>
                    </div>
                    <h5 class="card-title text-warning">🎉 Achievement Unlocked!</h5>
                    <h6 class="card-subtitle mb-2">${achievement.title}</h6>
                    <p class="card-text small text-muted">${achievement.description}</p>
                    <div class="badge bg-primary">+${achievement.points} XP</div>
                    <div class="mt-3">
                        <button class="btn btn-warning btn-sm" onclick="this.closest('.achievement-notification').remove()">
                            Awesome!
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        popup.style.zIndex = '9999';

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 5000);

        // Add celebration effect
        this.triggerCelebration();
    }

    triggerCelebration() {
        // Create confetti effect
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfetti();
            }, i * 50);
        }
    }

    createConfetti() {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'][Math.floor(Math.random() * 5)]};
            left: ${Math.random() * 100}vw;
            top: -10px;
            z-index: 10000;
            pointer-events: none;
            border-radius: 50%;
        `;

        document.body.appendChild(confetti);

        const fallDuration = Math.random() * 3000 + 2000;
        confetti.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(100vh) rotate(360deg)`, opacity: 0 }
        ], {
            duration: fallDuration,
            easing: 'linear'
        }).onfinish = () => confetti.remove();
    }

    // Chart Initialization
    initializeCharts() {
        this.createOverallProgressChart();
        this.createTopicMasteryChart();
        this.createWeeklyProgressChart();
        this.createStudyTimeChart();
    }

    createOverallProgressChart() {
        const ctx = document.getElementById('overallProgressChart');
        if (!ctx) return;

        const totalDays = 98; // 14 weeks * 7 days
        const completionPercentage = (this.progressData.completedDays / totalDays) * 100;

        this.charts.overallProgress = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Remaining'],
                datasets: [{
                    data: [completionPercentage, 100 - completionPercentage],
                    backgroundColor: ['#10b981', '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${context.parsed.toFixed(1)}%`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    createTopicMasteryChart() {
        const ctx = document.getElementById('topicMasteryChart');
        if (!ctx) return;

        const topics = Object.keys(this.progressData.topicMastery);
        const mastery = Object.values(this.progressData.topicMastery);

        this.charts.topicMastery = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: topics.map(topic => topic.charAt(0).toUpperCase() + topic.slice(1)),
                datasets: [{
                    label: 'Mastery Level',
                    data: mastery,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(59, 130, 246)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 25
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    createWeeklyProgressChart() {
        const ctx = document.getElementById('weeklyProgressChart');
        if (!ctx) return;

        const weeks = Array.from({ length: 14 }, (_, i) => `Week ${i + 1}`);

        this.charts.weeklyProgress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Progress %',
                    data: this.progressData.weekProgress,
                    backgroundColor: weeks.map((_, index) =>
                        index < this.progressData.currentWeek - 1 ? '#10b981' :
                            index === this.progressData.currentWeek - 1 ? '#3b82f6' : '#e5e7eb'
                    ),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function (value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `Progress: ${context.parsed.y}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    createStudyTimeChart() {
        const ctx = document.getElementById('studyTimeChart');
        if (!ctx) return;

        // Get last 7 days of study sessions
        const last7Days = this.getLast7DaysStudyTime();

        this.charts.studyTime = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.labels,
                datasets: [{
                    label: 'Study Hours',
                    data: last7Days.data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
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
                                return value + 'h';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    getLast7DaysStudyTime() {
        const last7Days = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const dateString = date.toISOString().split('T')[0];
            const dayStudy = this.progressData.studySessions
                .filter(session => session.date.startsWith(dateString))
                .reduce((total, session) => total + session.duration, 0);

            last7Days.push({
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                data: dayStudy
            });
        }

        return {
            labels: last7Days.map(day => day.label),
            data: last7Days.map(day => day.data)
        };
    }

    // Goal Management
    setDailyGoal(type, value) {
        this.progressData.dailyGoals[type] = value;
        this.saveProgress();
    }

    setWeeklyGoal(type, value) {
        this.progressData.weeklyGoals[type] = value;
        this.saveProgress();
    }

    checkDailyGoals() {
        const today = new Date().toDateString();
        const todayStudy = this.progressData.studySessions
            .filter(session => new Date(session.date).toDateString() === today)
            .reduce((total, session) => total + session.duration, 0);

        return {
            studyHours: todayStudy >= this.progressData.dailyGoals.studyHours,
            problemsSolved: this.getTodayProblemsCount() >= this.progressData.dailyGoals.problemsSolved,
            notesWritten: this.getTodayNotesCount() >= this.progressData.dailyGoals.notesWritten
        };
    }

    getTodayProblemsCount() {
        // This would need to be implemented based on your problem tracking
        return 0;
    }

    getTodayNotesCount() {
        // This would need to be implemented based on your notes tracking
        return 0;
    }

    // Analytics
    getAnalytics() {
        const totalDays = 98;
        const avgDailyStudy = this.progressData.studyHours / Math.max(this.progressData.completedDays, 1);
        const projectedCompletion = this.getProjectedCompletion();

        return {
            totalProgress: (this.progressData.completedDays / totalDays) * 100,
            currentStreak: this.progressData.streak,
            avgDailyStudy: avgDailyStudy,
            totalStudyHours: this.progressData.studyHours,
            problemsPerHour: this.progressData.solvedProblems / Math.max(this.progressData.studyHours, 1),
            projectedCompletion: projectedCompletion,
            topicMasteryAvg: Object.values(this.progressData.topicMastery).reduce((a, b) => a + b, 0) / Object.keys(this.progressData.topicMastery).length
        };
    }

    getProjectedCompletion() {
        if (this.progressData.completedDays === 0) return null;

        const daysElapsed = this.progressData.completedDays;
        const totalDays = 98;
        const avgDaysPerWeek = daysElapsed / Math.max(this.progressData.currentWeek - 1, 1);
        const remainingDays = totalDays - daysElapsed;
        const projectedWeeks = remainingDays / avgDaysPerWeek;

        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + (projectedWeeks * 7));

        return completionDate;
    }

    // UI Updates
    updateUI() {
        this.updateDashboardStats();
        this.updateProgressCharts();
        this.updateProgressSection();
    }

    updateDashboardStats() {
        const elements = {
            completedDays: document.getElementById('completedDays'),
            completedProjects: document.getElementById('completedProjects'),
            solvedProblems: document.getElementById('solvedProblems'),
            studyHours: document.getElementById('studyHours'),
            streakCount: document.getElementById('streakCount')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                const value = key === 'streakCount' ? this.progressData.streak : this.progressData[key];
                elements[key].textContent = value;
            }
        });
    }

    updateProgressCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.update();
            }
        });
    }

    updateProgressSection() {
        this.loadProgressCharts();
        this.displayAchievements();
        this.displayProgressTimeline();
    }

    loadProgressCharts() {
        // Reinitialize charts if they exist
        if (document.getElementById('overallProgressChart')) {
            this.createOverallProgressChart();
        }
        if (document.getElementById('topicMasteryChart')) {
            this.createTopicMasteryChart();
        }
    }

    displayAchievements() {
        const container = document.getElementById('achievementsBadges');
        if (!container) return;

        const achievements = this.getAllAchievements();
        const earned = achievements.filter(a => this.progressData.achievements.includes(a.id));

        container.innerHTML = earned.map(achievement => `
            <div class="achievement-badge earned">
                <div class="achievement-icon">
                    <i class="fas ${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <h6>${achievement.title}</h6>
                    <small>${achievement.description}</small>
                </div>
            </div>
        `).join('');
    }

    getAllAchievements() {
        return [
            { id: 'first_day', title: 'First Steps', description: 'Complete your first day', icon: 'fa-baby' },
            { id: 'week_warrior', title: 'Week Warrior', description: 'Complete your first week', icon: 'fa-calendar-week' },
            { id: 'consistency_king', title: 'Consistency King', description: 'Maintain a 7-day streak', icon: 'fa-fire' },
            { id: 'project_pioneer', title: 'Project Pioneer', description: 'Complete your first project', icon: 'fa-rocket' },
            { id: 'project_master', title: 'Project Master', description: 'Complete 5 projects', icon: 'fa-hammer' },
            { id: 'problem_solver', title: 'Problem Solver', description: 'Solve 25 problems', icon: 'fa-puzzle-piece' },
            { id: 'coding_ninja', title: 'Coding Ninja', description: 'Solve 100 problems', icon: 'fa-ninja' },
            { id: 'time_keeper', title: 'Time Keeper', description: 'Study for 50 hours', icon: 'fa-clock' },
            { id: 'dedication', title: 'Dedication', description: 'Maintain a 30-day streak', icon: 'fa-medal' },
            { id: 'dsa_master', title: 'DSA Master', description: 'Complete the roadmap', icon: 'fa-crown' }
        ];
    }

    displayProgressTimeline() {
        const container = document.getElementById('progressTimeline');
        if (!container) return;

        const recentActivities = this.progressData.studySessions.slice(-10).reverse();

        container.innerHTML = `
            <div class="timeline-enhanced">
                ${recentActivities.map(session => `
                    <div class="timeline-item-enhanced">
                        <div class="timeline-content-enhanced">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">Study Session</h6>
                                    <small class="text-muted">Week ${session.week}, Day ${session.day}</small>
                                </div>
                                <div class="text-primary">
                                    <strong>${session.duration}h</strong>
                                </div>
                            </div>
                            <small class="text-muted">
                                ${new Date(session.date).toLocaleDateString()}
                            </small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Data Management
    saveProgress() {
        localStorage.setItem('progressData', JSON.stringify(this.progressData));

        // Also save to cloud if available
        if (window.dsaAPI && window.currentUser) {
            window.dsaAPI.saveProgress(this.progressData).catch(console.error);
        }
    }

    exportProgress() {
        const dataStr = JSON.stringify(this.progressData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    importProgress(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                this.progressData = { ...this.getDefaultProgressData(), ...importedData };
                this.saveProgress();
                this.updateUI();
                showNotification('Progress imported successfully!', 'success');
            } catch (error) {
                showNotification('Failed to import progress data', 'danger');
            }
        };
        reader.readAsText(file);
    }

    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This action cannot be undone.')) {
            this.progressData = this.getDefaultProgressData();
            this.saveProgress();
            this.updateUI();
            showNotification('Progress reset successfully', 'info');
        }
    }
}

// Create global progress manager instance
const progressManager = new ProgressManager();

// Make available globally
window.progressManager = progressManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressManager;
}