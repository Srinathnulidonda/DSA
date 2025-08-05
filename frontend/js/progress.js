// Progress tracking and analytics
class ProgressManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.achievements = this.initializeAchievements();
    }

    loadProgress() {
        this.renderOverallProgress();
        this.renderTopicMastery();
        this.renderAchievementGallery();
        this.calculateEstimations();
    }

    renderOverallProgress() {
        const container = document.getElementById('weeks-progress-grid');
        if (!container) return;

        container.innerHTML = '';

        for (let week = 1; week <= 14; week++) {
            const weekProgress = this.dashboard.userData.weekProgress[week] || 0;
            const isCompleted = weekProgress >= 100;
            const isInProgress = weekProgress > 0 && weekProgress < 100;
            const isCurrent = week === this.dashboard.userData.currentWeek;

            const weekSquare = document.createElement('div');
            weekSquare.className = `week-square ${isCompleted ? 'completed' : ''} ${isInProgress ? 'in-progress' : ''} ${isCurrent ? 'current' : ''}`;
            weekSquare.onclick = () => this.showWeekDetails(week);

            weekSquare.innerHTML = `
                <div class="week-number">W${week}</div>
                <div class="week-percentage">${weekProgress}%</div>
                ${isCurrent ? '<div class="current-indicator"><i class="fas fa-arrow-right"></i></div>' : ''}
            `;

            container.appendChild(weekSquare);
        }

        this.updateOverallStats();
    }

    updateOverallStats() {
        const completedWeeks = Object.values(this.dashboard.userData.weekProgress).filter(p => p >= 100).length;
        const totalProgress = Object.values(this.dashboard.userData.weekProgress).reduce((sum, p) => sum + p, 0) / 14;

        document.getElementById('overall-percentage').textContent = `${Math.round(totalProgress)}%`;
        document.getElementById('weeks-completed').textContent = `${completedWeeks}/14`;

        // Calculate estimated completion
        const averageWeeklyProgress = this.calculateAverageWeeklyProgress();
        const remainingWeeks = 14 - completedWeeks;
        const estimatedDays = averageWeeklyProgress > 0 ? Math.ceil((remainingWeeks * 7) / averageWeeklyProgress) : '--';

        document.getElementById('estimated-completion').textContent = estimatedDays === '--' ? '--' : `${estimatedDays} days`;
    }

    calculateAverageWeeklyProgress() {
        const completedWeeks = Object.values(this.dashboard.userData.weekProgress).filter(p => p >= 100).length;
        const studyDays = Object.keys(this.dashboard.userData.completedTasks).length;

        return studyDays > 0 ? completedWeeks / (studyDays / 7) : 0;
    }

    renderTopicMastery() {
        const container = document.getElementById('topic-mastery-chart');
        if (!container) return;

        const topics = [
            { name: 'Programming Fundamentals', week: 1 },
            { name: 'Arrays & Strings', week: 2 },
            { name: 'Linked Lists', week: 3 },
            { name: 'Stacks & Queues', week: 4 },
            { name: 'Hash Tables', week: 5 },
            { name: 'Trees (Part 1)', week: 6 },
            { name: 'Trees (Part 2) & Heaps', week: 7 },
            { name: 'Graphs (Part 1)', week: 8 },
            { name: 'Graphs (Part 2)', week: 9 },
            { name: 'Sorting & Searching', week: 10 },
            { name: 'Dynamic Programming', week: 11 },
            { name: 'Advanced Algorithms', week: 12 },
            { name: 'System Design', week: 13 },
            { name: 'Competitive Programming', week: 14 }
        ];

        container.innerHTML = topics.map(topic => {
            const weekProgress = this.dashboard.userData.weekProgress[topic.week] || 0;
            const mastery = this.calculateTopicMastery(topic.week);

            return `
                <div class="topic-bar" data-week="${topic.week}">
                    <div class="topic-info">
                        <span class="topic-name">${topic.name}</span>
                        <span class="topic-percentage">${mastery}%</span>
                    </div>
                    <div class="topic-progress">
                        <div class="topic-progress-bar" style="width: ${mastery}%"></div>
                    </div>
                    <div class="topic-details mt-2">
                        <small class="text-muted">
                            Week ${topic.week} • 
                            ${this.getTopicStatus(mastery)}
                        </small>
                    </div>
                </div>
            `;
        }).join('');

        // Animate progress bars
        setTimeout(() => {
            container.querySelectorAll('.topic-progress-bar').forEach((bar, index) => {
                setTimeout(() => {
                    bar.style.transition = 'width 0.8s ease-out';
                    bar.style.width = bar.style.width;
                }, index * 100);
            });
        }, 100);
    }

    calculateTopicMastery(week) {
        const weekProgress = this.dashboard.userData.weekProgress[week] || 0;
        const practiceBonus = this.getPracticeBonus(week);
        const projectBonus = this.getProjectBonus(week);

        return Math.min(100, weekProgress + practiceBonus + projectBonus);
    }

    getPracticeBonus(week) {
        // Bonus points for completing practice problems related to the week's topic
        const weekProblems = this.getWeekPracticeProblems(week);
        const solvedProblems = weekProblems.filter(problem =>
            this.dashboard.userData.solvedProblems?.includes(problem.id)
        ).length;

        return Math.min(10, (solvedProblems / weekProblems.length) * 10);
    }

    getProjectBonus(week) {
        // Bonus points for completing the week's project
        const weekProject = this.dashboard.userData.projects.find(p => p.week === week);
        if (weekProject && weekProject.status === 'completed') {
            return 15;
        }
        return 0;
    }

    getWeekPracticeProblems(week) {
        // This would normally come from a database or API
        const problemSets = {
            1: [{ id: 'hello-world', name: 'Hello World' }],
            2: [{ id: 'two-sum', name: 'Two Sum' }, { id: 'reverse-string', name: 'Reverse String' }],
            3: [{ id: 'reverse-linked-list', name: 'Reverse Linked List' }],
            // ... more problems for each week
        };

        return problemSets[week] || [];
    }

    getTopicStatus(mastery) {
        if (mastery >= 90) return 'Mastered';
        if (mastery >= 70) return 'Proficient';
        if (mastery >= 50) return 'Learning';
        if (mastery > 0) return 'Started';
        return 'Not Started';
    }

    renderAchievementGallery() {
        const container = document.getElementById('achievements-gallery');
        if (!container) return;

        container.innerHTML = this.achievements.map(achievement => {
            const isEarned = this.dashboard.userData.achievements.some(a => a.id === achievement.id);
            const progress = this.getAchievementProgress(achievement);

            return `
                <div class="achievement-card ${isEarned ? 'earned' : ''}" 
                     data-achievement-id="${achievement.id}"
                     onclick="progress.showAchievementDetails('${achievement.id}')">
                    <div class="achievement-icon">
                        <i class="${achievement.icon}"></i>
                    </div>
                    <h6 class="achievement-title">${achievement.name}</h6>
                    <p class="achievement-description">${achievement.description}</p>
                    ${!isEarned ? `
                        <div class="achievement-progress mt-2">
                            <div class="progress progress-sm">
                                <div class="progress-bar" style="width: ${progress}%"></div>
                            </div>
                            <small class="text-muted">${progress}% complete</small>
                        </div>
                    ` : `
                        <div class="achievement-earned">
                            <i class="fas fa-check-circle text-success"></i>
                            <small class="text-success">Earned!</small>
                        </div>
                    `}
                </div>
            `;
        }).join('');
    }

    initializeAchievements() {
        return [
            {
                id: 'first-steps',
                name: 'First Steps',
                description: 'Complete your first learning task',
                icon: 'fas fa-baby',
                condition: () => Object.keys(this.dashboard.userData.completedTasks).length >= 1,
                category: 'getting-started'
            },
            {
                id: 'week-warrior',
                name: 'Week Warrior',
                description: 'Complete an entire week of learning',
                icon: 'fas fa-shield-alt',
                condition: () => Object.values(this.dashboard.userData.weekProgress).some(p => p >= 100),
                category: 'progress'
            },
            {
                id: 'streak-starter',
                name: 'Streak Starter',
                description: 'Maintain a 7-day learning streak',
                icon: 'fas fa-fire',
                condition: () => this.dashboard.userData.streak >= 7,
                category: 'consistency'
            },
            {
                id: 'streak-master',
                name: 'Streak Master',
                description: 'Maintain a 30-day learning streak',
                icon: 'fas fa-flame',
                condition: () => this.dashboard.userData.streak >= 30,
                category: 'consistency'
            },
            {
                id: 'project-starter',
                name: 'Project Starter',
                description: 'Start your first project',
                icon: 'fas fa-rocket',
                condition: () => this.dashboard.userData.projects.length >= 1,
                category: 'projects'
            },
            {
                id: 'project-finisher',
                name: 'Project Finisher',
                description: 'Complete your first project',
                icon: 'fas fa-trophy',
                condition: () => this.dashboard.userData.projects.some(p => p.status === 'completed'),
                category: 'projects'
            },
            {
                id: 'note-taker',
                name: 'Note Taker',
                description: 'Add 10 learning notes',
                icon: 'fas fa-sticky-note',
                condition: () => this.dashboard.userData.notes.length >= 10,
                category: 'learning'
            },
            {
                id: 'problem-solver',
                name: 'Problem Solver',
                description: 'Solve 50 practice problems',
                icon: 'fas fa-puzzle-piece',
                condition: () => this.dashboard.userData.problemsSolved >= 50,
                category: 'practice'
            },
            {
                id: 'algorithm-master',
                name: 'Algorithm Master',
                description: 'Solve 200 practice problems',
                icon: 'fas fa-brain',
                condition: () => this.dashboard.userData.problemsSolved >= 200,
                category: 'practice'
            },
            {
                id: 'time-master',
                name: 'Time Master',
                description: 'Study for 100 hours total',
                icon: 'fas fa-clock',
                condition: () => this.dashboard.userData.studyTime >= 6000, // 100 hours in minutes
                category: 'dedication'
            },
            {
                id: 'course-completer',
                name: 'Course Completer',
                description: 'Complete all 14 weeks',
                icon: 'fas fa-graduation-cap',
                condition: () => Object.values(this.dashboard.userData.weekProgress).filter(p => p >= 100).length >= 14,
                category: 'completion'
            },
            {
                id: 'perfectionist',
                name: 'Perfectionist',
                description: 'Complete a week with 100% score',
                icon: 'fas fa-star',
                condition: () => Object.values(this.dashboard.userData.weekProgress).some(p => p >= 100),
                category: 'excellence'
            }
        ];
    }

    getAchievementProgress(achievement) {
        switch (achievement.id) {
            case 'first-steps':
                return Math.min(100, (Object.keys(this.dashboard.userData.completedTasks).length / 1) * 100);
            case 'week-warrior':
                const maxWeekProgress = Math.max(...Object.values(this.dashboard.userData.weekProgress), 0);
                return Math.min(100, maxWeekProgress);
            case 'streak-starter':
                return Math.min(100, (this.dashboard.userData.streak / 7) * 100);
            case 'streak-master':
                return Math.min(100, (this.dashboard.userData.streak / 30) * 100);
            case 'project-starter':
                return Math.min(100, (this.dashboard.userData.projects.length / 1) * 100);
            case 'project-finisher':
                const completedProjects = this.dashboard.userData.projects.filter(p => p.status === 'completed').length;
                return Math.min(100, (completedProjects / 1) * 100);
            case 'note-taker':
                return Math.min(100, (this.dashboard.userData.notes.length / 10) * 100);
            case 'problem-solver':
                return Math.min(100, (this.dashboard.userData.problemsSolved / 50) * 100);
            case 'algorithm-master':
                return Math.min(100, (this.dashboard.userData.problemsSolved / 200) * 100);
            case 'time-master':
                return Math.min(100, (this.dashboard.userData.studyTime / 6000) * 100);
            case 'course-completer':
                const completedWeeks = Object.values(this.dashboard.userData.weekProgress).filter(p => p >= 100).length;
                return Math.min(100, (completedWeeks / 14) * 100);
            case 'perfectionist':
                const maxProgress = Math.max(...Object.values(this.dashboard.userData.weekProgress), 0);
                return Math.min(100, maxProgress);
            default:
                return 0;
        }
    }

    showWeekDetails(week) {
        const weekProgress = this.dashboard.userData.weekProgress[week] || 0;
        const weekData = this.getWeekSummary(week);

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-chart-line me-2"></i>Week ${week} Progress
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="week-progress-details">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <div class="progress-circle-large" data-percentage="${weekProgress}">
                                        <div class="text-center">
                                            <h3 class="text-primary">${weekProgress}%</h3>
                                            <p class="text-muted">Complete</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h6>Week Summary</h6>
                                    <ul class="list-unstyled">
                                        <li><i class="fas fa-check-circle text-success me-2"></i>Tasks: ${weekData.completedTasks}/${weekData.totalTasks}</li>
                                        <li><i class="fas fa-project-diagram text-warning me-2"></i>Project: ${weekData.projectStatus}</li>
                                        <li><i class="fas fa-clock text-info me-2"></i>Study Time: ${weekData.studyTime}h</li>
                                        <li><i class="fas fa-trophy text-primary me-2"></i>Achievements: ${weekData.achievements}</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="week-breakdown">
                                <h6>Daily Breakdown</h6>
                                <div class="daily-progress">
                                    ${this.renderDailyBreakdown(week)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="dashboard.showPage('timetable'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                            View Week Details
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    getWeekSummary(week) {
        const weekKey = `week-${week}`;
        const allTasks = Object.keys(this.dashboard.userData.completedTasks);
        const weekTasks = allTasks.filter(task => task.includes(weekKey));
        const completedWeekTasks = weekTasks.filter(task => this.dashboard.userData.completedTasks[task]);

        const weekProject = this.dashboard.userData.projects.find(p => p.week === week);
        const projectStatus = weekProject ? weekProject.status : 'not-started';

        return {
            completedTasks: completedWeekTasks.length,
            totalTasks: Math.max(weekTasks.length, 15), // Assume 15 tasks per week if no data
            projectStatus: projectStatus.replace('-', ' '),
            studyTime: Math.round((this.dashboard.userData.studyTime || 0) / 60), // Convert minutes to hours
            achievements: this.dashboard.userData.achievements.filter(a => a.weekEarned === week).length
        };
    }

    renderDailyBreakdown(week) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        return days.map(day => {
            const dayKey = `week-${week}-${day.toLowerCase()}`;
            const dayTasks = [
                `${dayKey}-topic`,
                `${dayKey}-activities`,
                `${dayKey}-project`
            ];

            const completedDayTasks = dayTasks.filter(task =>
                this.dashboard.userData.completedTasks[task]
            ).length;

            const dayProgress = Math.round((completedDayTasks / dayTasks.length) * 100);

            return `
                <div class="daily-item mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="day-name">${day}</span>
                        <span class="day-progress">${dayProgress}%</span>
                    </div>
                    <div class="progress progress-sm">
                        <div class="progress-bar" style="width: ${dayProgress}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showAchievementDetails(achievementId) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (!achievement) return;

        const isEarned = this.dashboard.userData.achievements.some(a => a.id === achievementId);
        const progress = this.getAchievementProgress(achievement);

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="${achievement.icon} me-2"></i>${achievement.name}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="achievement-icon-large mb-3">
                            <i class="${achievement.icon}" style="font-size: 4rem; color: ${isEarned ? 'var(--success-color)' : 'var(--text-secondary)'};"></i>
                        </div>
                        <h4>${achievement.name}</h4>
                        <p class="text-muted">${achievement.description}</p>
                        
                        ${!isEarned ? `
                            <div class="achievement-progress-details">
                                <div class="progress mb-2">
                                    <div class="progress-bar" style="width: ${progress}%"></div>
                                </div>
                                <p><strong>${progress}%</strong> complete</p>
                                <small class="text-muted">${this.getProgressHint(achievement)}</small>
                            </div>
                        ` : `
                            <div class="achievement-earned-details">
                                <div class="badge bg-success fs-6 mb-2">
                                    <i class="fas fa-check-circle me-1"></i>Achieved!
                                </div>
                                <p class="text-success">Congratulations on earning this achievement!</p>
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    getProgressHint(achievement) {
        switch (achievement.id) {
            case 'first-steps':
                return 'Complete any learning task to earn this achievement.';
            case 'week-warrior':
                return 'Complete all tasks in any week to earn this achievement.';
            case 'streak-starter':
                return `Keep studying daily! Current streak: ${this.dashboard.userData.streak} days.`;
            case 'streak-master':
                return `Maintain your streak for ${30 - this.dashboard.userData.streak} more days.`;
            case 'project-starter':
                return 'Add your first project to earn this achievement.';
            case 'project-finisher':
                return 'Complete any project to earn this achievement.';
            case 'note-taker':
                return `Add ${10 - this.dashboard.userData.notes.length} more notes.`;
            case 'problem-solver':
                return `Solve ${50 - this.dashboard.userData.problemsSolved} more problems.`;
            case 'algorithm-master':
                return `Solve ${200 - this.dashboard.userData.problemsSolved} more problems.`;
            case 'time-master':
                const hoursLeft = Math.ceil((6000 - this.dashboard.userData.studyTime) / 60);
                return `Study for ${hoursLeft} more hours.`;
            case 'course-completer':
                const weeksLeft = 14 - Object.values(this.dashboard.userData.weekProgress).filter(p => p >= 100).length;
                return `Complete ${weeksLeft} more weeks.`;
            default:
                return 'Keep learning to unlock this achievement!';
        }
    }

    calculateEstimations() {
        const completedTasks = Object.keys(this.dashboard.userData.completedTasks).length;
        const totalTasks = 14 * 15; // Approximate 15 tasks per week
        const completionRate = completedTasks / Math.max(1, this.dashboard.userData.streak || 1);

        const estimatedDaysToCompletion = Math.ceil((totalTasks - completedTasks) / completionRate);

        // Update the estimation display
        const estimationElement = document.getElementById('estimated-completion');
        if (estimationElement) {
            estimationElement.textContent = isFinite(estimatedDaysToCompletion) ?
                `${estimatedDaysToCompletion} days` : '--';
        }
    }
}

// Global functions
function showWeekDetails(week) {
    window.progress.showWeekDetails(week);
}

function showAchievementDetails(achievementId) {
    window.progress.showAchievementDetails(achievementId);
}

// Initialize when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.dashboard) {
            window.progress = new ProgressManager(window.dashboard);

            // Override dashboard's loadProgress method
            window.dashboard.loadProgress = () => {
                window.progress.loadProgress();
            };
        }
    }, 100);
});
