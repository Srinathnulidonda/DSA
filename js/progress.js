// Progress Management Module
const Progress = {
    // Get default progress structure
    getDefaultProgress: function () {
        return {
            completedTopics: [],
            currentWeek: 1,
            currentDay: 0,
            streak: 0,
            lastActiveDate: new Date().toISOString().split('T')[0],
            totalHours: 0,
            notes: [],
            projectStatus: {},
            achievements: [],
            settings: {
                dailyGoal: 2, // hours
                reminderEnabled: true,
                reminderTime: '09:00'
            }
        };
    },

    // Update UI with progress data
    updateUI: function (progress) {
        this.updateStatistics(progress);
        this.updateWeekProgress(progress);
        this.updateStreak(progress);
        this.checkAchievements(progress);
    },

    // Update statistics display
    updateStatistics: function (progress) {
        // Update stat cards
        document.getElementById('streakCount').textContent = progress.streak || 0;
        document.getElementById('completedTopics').textContent = progress.completedTopics.length || 0;
        document.getElementById('totalHours').textContent = progress.totalHours || 0;

        // Calculate overall progress
        const totalTopics = window.dsaRoadmap.reduce((sum, week) => sum + week.days.length, 0);
        const progressPercentage = Utils.calculatePercentage(progress.completedTopics.length, totalTopics);
        document.getElementById('overallProgress').textContent = `${progressPercentage}%`;

        // Update progress bar
        const progressBar = document.getElementById('overallProgressBar');
        if (progressBar) {
            progressBar.style.width = `${progressPercentage}%`;
        }
    },

    // Update week progress indicators
    updateWeekProgress: function (progress) {
        window.dsaRoadmap.forEach((week, weekIndex) => {
            let completed = 0;
            week.days.forEach((day, dayIndex) => {
                const dayId = `week-${weekIndex}-day-${dayIndex}`;
                if (progress.completedTopics.includes(dayId)) {
                    completed++;
                    // Check the checkbox if it exists
                    const checkbox = document.getElementById(dayId);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                }
            });

            // Update week progress display
            const weekProgress = document.getElementById(`week-${weekIndex}-progress`);
            if (weekProgress) {
                weekProgress.textContent = `${completed}/7`;
            }
        });

        // Update overall progress percentage
        const totalTopics = window.dsaRoadmap.reduce((sum, week) => sum + week.days.length, 0);
        const completedTopics = progress.completedTopics.length;
        const progressPercentage = Utils.calculatePercentage(completedTopics, totalTopics);

        const percentageDisplay = document.getElementById('progressPercentage');
        if (percentageDisplay) {
            percentageDisplay.textContent = `${progressPercentage}%`;
        }
    },

    // Update streak
    updateStreak: function (progress) {
        const today = new Date().toISOString().split('T')[0];
        const lastActive = progress.lastActiveDate;

        if (lastActive === today) {
            // Already active today
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive === yesterdayStr) {
            // Continuing streak
            progress.streak++;
        } else {
            // Streak broken
            progress.streak = 1;
        }

        progress.lastActiveDate = today;

        // Update display
        const streakDisplay = document.getElementById('streakCount');
        if (streakDisplay) {
            streakDisplay.textContent = progress.streak;
        }

        // Save progress
        if (window.app) {
            window.app.saveProgress();
        }
    },

    // Toggle day completion
    toggleDayComplete: function (dayId, weekIndex, progress) {
        const checkbox = document.getElementById(dayId);

        if (checkbox.checked) {
            if (!progress.completedTopics.includes(dayId)) {
                progress.completedTopics.push(dayId);
                Utils.showToast('Great job! Topic completed! 🎉', 'success');

                // Update hours studied (assuming 2 hours per topic)
                progress.totalHours += 2;

                // Check if week is completed
                this.checkWeekCompletion(weekIndex, progress);
            }
        } else {
            const index = progress.completedTopics.indexOf(dayId);
            if (index > -1) {
                progress.completedTopics.splice(index, 1);
                progress.totalHours = Math.max(0, progress.totalHours - 2);
            }
        }

        // Update UI
        this.updateUI(progress);
    },

    // Check if a week is completed
    checkWeekCompletion: function (weekIndex, progress) {
        const week = window.dsaRoadmap[weekIndex];
        let allCompleted = true;

        week.days.forEach((day, dayIndex) => {
            const dayId = `week-${weekIndex}-day-${dayIndex}`;
            if (!progress.completedTopics.includes(dayId)) {
                allCompleted = false;
            }
        });

        if (allCompleted) {
            Utils.showToast(`Week ${weekIndex + 1} completed! Amazing progress! 🎊`, 'success');
            this.addAchievement(progress, `week_${weekIndex + 1}_complete`, `Completed Week ${weekIndex + 1}`);
        }
    },

    // Check and award achievements
    checkAchievements: function (progress) {
        const achievements = [];

        // Streak achievements
        if (progress.streak >= 7 && !this.hasAchievement(progress, 'week_streak')) {
            achievements.push({
                id: 'week_streak',
                icon: 'fa-fire',
                text: 'Week Warrior - 7 day streak!',
                date: new Date().toISOString()
            });
        }

        if (progress.streak >= 30 && !this.hasAchievement(progress, 'month_streak')) {
            achievements.push({
                id: 'month_streak',
                icon: 'fa-crown',
                text: 'Monthly Master - 30 day streak!',
                date: new Date().toISOString()
            });
        }

        // Completion achievements
        const completedCount = progress.completedTopics.length;
        if (completedCount >= 10 && !this.hasAchievement(progress, 'rising_star')) {
            achievements.push({
                id: 'rising_star',
                icon: 'fa-star',
                text: 'Rising Star - 10 topics completed!',
                date: new Date().toISOString()
            });
        }

        if (completedCount >= 50 && !this.hasAchievement(progress, 'dsa_explorer')) {
            achievements.push({
                id: 'dsa_explorer',
                icon: 'fa-rocket',
                text: 'DSA Explorer - 50 topics completed!',
                date: new Date().toISOString()
            });
        }

        if (completedCount >= 98 && !this.hasAchievement(progress, 'dsa_master')) {
            achievements.push({
                id: 'dsa_master',
                icon: 'fa-trophy',
                text: 'DSA Master - All topics completed!',
                date: new Date().toISOString()
            });
        }

        // Project achievements
        const completedProjects = Object.values(progress.projectStatus || {})
            .filter(status => status === 'completed').length;

        if (completedProjects >= 5 && !this.hasAchievement(progress, 'project_pro')) {
            achievements.push({
                id: 'project_pro',
                icon: 'fa-code',
                text: 'Project Pro - 5 projects completed!',
                date: new Date().toISOString()
            });
        }

        if (completedProjects >= 14 && !this.hasAchievement(progress, 'project_champion')) {
            achievements.push({
                id: 'project_champion',
                icon: 'fa-medal',
                text: 'Project Champion - All projects completed!',
                date: new Date().toISOString()
            });
        }

        // Add new achievements
        achievements.forEach(achievement => {
            this.addAchievement(progress, achievement.id, achievement.text, achievement.icon);
        });

        // Display achievements
        this.displayAchievements(progress);
    },

    // Check if user has achievement
    hasAchievement: function (progress, achievementId) {
        return progress.achievements && progress.achievements.some(a => a.id === achievementId);
    },

    // Add achievement
    addAchievement: function (progress, id, text, icon = 'fa-trophy') {
        if (!progress.achievements) {
            progress.achievements = [];
        }

        if (!this.hasAchievement(progress, id)) {
            progress.achievements.push({
                id: id,
                text: text,
                icon: icon,
                date: new Date().toISOString()
            });

            // Show notification
            Utils.showToast(`Achievement Unlocked: ${text}`, 'success', 5000);
            Utils.playNotificationSound(1000, 300);

            // Save progress
            if (window.app) {
                window.app.saveProgress();
            }
        }
    },

    // Display achievements
    displayAchievements: function (progress) {
        const container = document.getElementById('achievements');
        if (!container || !progress.achievements) return;

        const recentAchievements = progress.achievements
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        container.innerHTML = recentAchievements.map(achievement => `
            <div class="achievement-badge">
                <i class="fas ${achievement.icon}"></i>
                <span>${achievement.text}</span>
            </div>
        `).join('');
    },

    // Export progress data
    export: function (progress) {
        const exportData = {
            progress: progress,
            exportDate: new Date().toISOString(),
            version: '1.0',
            totalTopics: window.dsaRoadmap.reduce((sum, week) => sum + week.days.length, 0)
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        Utils.showToast('Progress exported successfully!', 'success');
    },

    // Import progress data
    import: async function (event) {
        const file = event.target.files[0];
        if (!file) return null;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (importData.progress) {
                // Validate imported data
                if (this.validateProgressData(importData.progress)) {
                    Utils.showToast('Progress imported successfully!', 'success');
                    return importData.progress;
                } else {
                    throw new Error('Invalid progress data format');
                }
            } else {
                throw new Error('No progress data found in file');
            }
        } catch (error) {
            console.error('Import error:', error);
            Utils.showToast('Error importing file. Please check the file format.', 'error');
            return null;
        }
    },

    // Validate progress data structure
    validateProgressData: function (data) {
        const requiredFields = ['completedTopics', 'streak', 'totalHours'];
        return requiredFields.every(field => field in data);
    },

    // Calculate user level based on progress
    calculateLevel: function (progress) {
        const xp = progress.completedTopics.length * 100 +
            progress.totalHours * 50 +
            Object.values(progress.projectStatus || {})
                .filter(s => s === 'completed').length * 500;

        const level = Math.floor(Math.sqrt(xp / 100));
        const currentLevelXp = Math.pow(level, 2) * 100;
        const nextLevelXp = Math.pow(level + 1, 2) * 100;
        const levelProgress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

        return {
            level: level,
            xp: xp,
            currentLevelXp: currentLevelXp,
            nextLevelXp: nextLevelXp,
            levelProgress: levelProgress
        };
    },

    // Get progress insights
    getInsights: function (progress) {
        const totalTopics = window.dsaRoadmap.reduce((sum, week) => sum + week.days.length, 0);
        const completionRate = Utils.calculatePercentage(progress.completedTopics.length, totalTopics);
        const avgHoursPerTopic = progress.completedTopics.length > 0
            ? (progress.totalHours / progress.completedTopics.length).toFixed(1)
            : 0;

        const insights = {
            completionRate: completionRate,
            avgHoursPerTopic: avgHoursPerTopic,
            currentStreak: progress.streak,
            longestStreak: progress.longestStreak || progress.streak,
            mostProductiveDay: this.getMostProductiveDay(progress),
            recommendedFocus: this.getRecommendedFocus(progress)
        };

        return insights;
    },

    // Get most productive day of the week
    getMostProductiveDay: function (progress) {
        // This would require tracking completion dates
        // For now, return a placeholder
        return 'Saturday';
    },

    // Get recommended focus area
    getRecommendedFocus: function (progress) {
        // Analyze completed topics and suggest next area
        const completedByWeek = {};

        progress.completedTopics.forEach(topicId => {
            const weekMatch = topicId.match(/week-(\d+)/);
            if (weekMatch) {
                const weekNum = parseInt(weekMatch[1]);
                completedByWeek[weekNum] = (completedByWeek[weekNum] || 0) + 1;
            }
        });

        // Find first incomplete week
        for (let i = 0; i < window.dsaRoadmap.length; i++) {
            if ((completedByWeek[i] || 0) < 7) {
                return window.dsaRoadmap[i].title;
            }
        }

        return 'Review and Practice';
    }
};

// Export Progress module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Progress;
}