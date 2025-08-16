// Roadmap functionality

class RoadmapManager {
    constructor() {
        this.roadmapData = null;
        this.userProgress = null;
        this.currentFilter = 'all';
        this.showCompleted = true;
        this.currentWeek = 1;
        this.init();
    }

    async init() {
        await this.loadRoadmapData();
        await this.loadUserProgress();
        this.setupEventListeners();
        this.renderRoadmap();
        this.updateOverallProgress();
    }

    async loadRoadmapData() {
        try {
            const response = await api.get(API_ENDPOINTS.roadmap);
            this.roadmapData = response.roadmap;
        } catch (error) {
            console.error('Failed to load roadmap:', error);
            notificationManager.error('Failed to load roadmap data');
        }
    }

    async loadUserProgress() {
        try {
            const response = await api.get(API_ENDPOINTS.progress);
            this.userProgress = response.progress;
            this.calculateCurrentWeek();
        } catch (error) {
            console.error('Failed to load progress:', error);
            this.userProgress = {};
        }
    }

    calculateCurrentWeek() {
        let currentWeek = 1;
        for (let week = 1; week <= 14; week++) {
            const weekProgress = this.getWeekProgress(week);
            if (weekProgress.completed < 7) {
                currentWeek = week;
                break;
            }
            if (week === 14) currentWeek = 14;
        }
        this.currentWeek = currentWeek;
    }

    setupEventListeners() {
        // Filter buttons
        const toggleCompletedBtn = document.getElementById('toggleCompletedBtn');
        const filterBtn = document.getElementById('filterBtn');

        if (toggleCompletedBtn) {
            toggleCompletedBtn.addEventListener('click', () => {
                this.showCompleted = !this.showCompleted;
                toggleCompletedBtn.innerHTML = this.showCompleted
                    ? '<i class="bi bi-eye-slash mr-2"></i>Hide Completed'
                    : '<i class="bi bi-eye mr-2"></i>Show Completed';
                this.renderRoadmap();
            });
        }

        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                modalManager.open('filterModal');
            });
        }

        // Filter modal
        const applyFilterBtn = document.getElementById('applyFilter');
        const clearFilterBtn = document.getElementById('clearFilter');

        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                this.applyFilters();
                modalManager.close('filterModal');
            });
        }

        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                this.clearFilters();
                modalManager.close('filterModal');
            });
        }

        // Day detail modal close
        const closeDayModal = document.getElementById('closeDayModal');
        if (closeDayModal) {
            closeDayModal.addEventListener('click', () => {
                modalManager.close('dayDetailModal');
            });
        }
    }

    renderRoadmap() {
        const container = document.getElementById('roadmapContainer');
        if (!container || !this.roadmapData) return;

        container.innerHTML = '';

        this.roadmapData.forEach(week => {
            if (!this.shouldShowWeek(week)) return;

            const weekElement = this.createWeekElement(week);
            container.appendChild(weekElement);
        });
    }

    shouldShowWeek(week) {
        // Apply filters here
        const weekProgress = this.getWeekProgress(week.week);

        if (!this.showCompleted && weekProgress.completed === 7) {
            return false;
        }

        return true;
    }

    createWeekElement(week) {
        const weekProgress = this.getWeekProgress(week.week);
        const isCurrentWeek = week.week === this.currentWeek;

        const weekDiv = document.createElement('div');
        weekDiv.className = `roadmap-week ${isCurrentWeek ? 'current-week' : ''}`;

        weekDiv.innerHTML = `
            <div class="flex items-start space-x-6">
                <!-- Week Number Circle -->
                <div class="flex-shrink-0 relative">
                    <div class="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${weekProgress.completed === 7
                ? 'bg-green-500 text-white'
                : isCurrentWeek
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }">
                        ${week.week}
                    </div>
                    ${weekProgress.completed === 7 ? '<i class="bi bi-check-circle-fill absolute -bottom-1 -right-1 text-green-600 bg-white rounded-full text-lg"></i>' : ''}
                </div>

                <!-- Week Content -->
                <div class="flex-1">
                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <!-- Week Header -->
                        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">${week.title}</h3>
                                    <p class="text-gray-600 dark:text-gray-400 mt-1">${week.goal}</p>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm text-gray-500 dark:text-gray-400">Progress</div>
                                    <div class="text-2xl font-bold ${weekProgress.completed === 7 ? 'text-green-600' : 'text-blue-600'}">
                                        ${weekProgress.completed}/7
                                    </div>
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div class="h-2 rounded-full transition-all duration-300 ${weekProgress.completed === 7 ? 'bg-green-500' : 'bg-blue-500'
            }" style="width: ${(weekProgress.completed / 7) * 100}%"></div>
                            </div>

                            <!-- Project Info -->
                            ${week.project ? `
                                <div class="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <h4 class="font-medium text-purple-800 dark:text-purple-300 mb-1">
                                        <i class="bi bi-code-square mr-2"></i>Week Project: ${week.project.title}
                                    </h4>
                                    <p class="text-sm text-purple-600 dark:text-purple-400">${week.project.description}</p>
                                    <div class="flex flex-wrap gap-2 mt-2">
                                        ${week.project.skills.map(skill =>
                `<span class="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">${skill}</span>`
            ).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Days Grid -->
                        <div class="p-6">
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                                ${week.days.map((day, index) => this.createDayElement(week.week, index + 1, day)).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add click handlers for days
        weekDiv.querySelectorAll('.day-card').forEach((dayCard, index) => {
            dayCard.addEventListener('click', () => {
                this.showDayDetail(week.week, index + 1, week.days[index]);
            });
        });

        return weekDiv;
    }

    createDayElement(week, day, dayData) {
        const progressKey = `week${week}_day${day}`;
        const dayProgress = this.userProgress[progressKey];
        const isCompleted = dayProgress && dayProgress.completed;
        const timeSpent = dayProgress ? dayProgress.time_spent : 0;

        const isLocked = week > this.currentWeek + 1;
        const canAccess = week <= this.currentWeek || (week === this.currentWeek + 1 && day === 1);

        let statusClass = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
        let statusIcon = 'bi-circle';

        if (isLocked) {
            statusClass = 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60';
            statusIcon = 'bi-lock';
        } else if (isCompleted) {
            statusClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
            statusIcon = 'bi-check-circle-fill';
        } else if (week === this.currentWeek) {
            statusClass = 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
            statusIcon = 'bi-play-circle';
        }

        return `
            <div class="day-card ${statusClass} p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all duration-200 ${isLocked ? '' : 'hover:scale-105'}" 
                 data-week="${week}" data-day="${day}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium">${dayData.day}</span>
                    <i class="bi ${statusIcon} ${isCompleted ? 'text-green-600' : isLocked ? 'text-gray-400' : 'text-blue-600'}"></i>
                </div>
                
                <h4 class="font-medium text-sm mb-2 line-clamp-2">${dayData.topic}</h4>
                
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-gray-500 dark:text-gray-400">Estimated</span>
                        <span>${dayData.time_estimate}m</span>
                    </div>
                    ${timeSpent > 0 ? `
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-gray-500 dark:text-gray-400">Spent</span>
                            <span class="font-medium">${timeSpent}m</span>
                        </div>
                    ` : ''}
                </div>

                <div class="mt-3 flex flex-wrap gap-1">
                    ${dayData.resources.slice(0, 2).map(() =>
            `<div class="w-2 h-2 bg-current opacity-50 rounded-full"></div>`
        ).join('')}
                    ${dayData.resources.length > 2 ? `<span class="text-xs">+${dayData.resources.length - 2}</span>` : ''}
                </div>
            </div>
        `;
    }

    showDayDetail(week, day, dayData) {
        const progressKey = `week${week}_day${day}`;
        const dayProgress = this.userProgress[progressKey];
        const isCompleted = dayProgress && dayProgress.completed;

        const modal = document.getElementById('dayDetailModal');
        const title = document.getElementById('modalDayTitle');
        const content = document.getElementById('modalDayContent');

        if (!modal || !title || !content) return;

        title.textContent = `Week ${week}, Day ${day}: ${dayData.topic}`;

        content.innerHTML = `
            <div class="space-y-6">
                <!-- Status and Progress -->
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center ${isCompleted
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            }">
                            <i class="bi ${isCompleted ? 'bi-check-circle-fill' : 'bi-play-circle'} text-xl"></i>
                        </div>
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">
                                ${isCompleted ? 'Completed' : 'In Progress'}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">
                                ${dayProgress ? `${dayProgress.time_spent} minutes spent` : 'Not started'}
                            </div>
                        </div>
                    </div>
                    <button onclick="roadmapManager.toggleDayCompletion(${week}, ${day})" 
                            class="px-4 py-2 rounded-lg font-medium transition-colors ${isCompleted
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }">
                        ${isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                </div>

                <!-- Activities -->
                <div>
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Today's Activities</h4>
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p class="text-gray-700 dark:text-gray-300">${dayData.activities}</p>
                    </div>
                </div>

                <!-- Resources -->
                <div>
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Learning Resources</h4>
                    <div class="space-y-3">
                        ${dayData.resources.map(resourceKey => {
                const resource = this.getResourceDetails(resourceKey);
                return `
                                <a href="${resource.url}" target="_blank" 
                                   class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-10 h-10 rounded-lg flex items-center justify-center ${this.getResourceTypeStyle(resource.type)}">
                                            <i class="bi ${this.getResourceTypeIcon(resource.type)}"></i>
                                        </div>
                                        <div>
                                            <div class="font-medium text-gray-900 dark:text-white">${resource.title}</div>
                                            <div class="text-sm text-gray-500 dark:text-gray-400 capitalize">${resource.type}</div>
                                        </div>
                                    </div>
                                    <i class="bi bi-arrow-up-right text-gray-400"></i>
                                </a>
                            `;
            }).join('')}
                    </div>
                </div>

                <!-- Time Tracking -->
                <div>
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Time Tracking</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                            <div class="text-2xl font-bold text-gray-900 dark:text-white">${dayData.time_estimate}m</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Estimated</div>
                        </div>
                        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                            <div class="text-2xl font-bold text-gray-900 dark:text-white">${dayProgress ? dayProgress.time_spent : 0}m</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Actual</div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button onclick="roadmapManager.startPomodoro('${dayData.topic}')" 
                            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <i class="bi bi-play-circle mr-2"></i>Start Pomodoro
                    </button>
                    <button onclick="roadmapManager.addNote(${week}, ${day})" 
                            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="bi bi-journal-plus mr-2"></i>Add Note
                    </button>
                </div>
            </div>
        `;

        modalManager.open('dayDetailModal');
    }

    getResourceDetails(resourceKey) {
        // This would ideally come from your backend resources
        return {
            title: resourceKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            url: `https://example.com/resource/${resourceKey}`,
            type: resourceKey.includes('video') ? 'video' :
                resourceKey.includes('practice') ? 'practice' : 'text'
        };
    }

    getResourceTypeStyle(type) {
        const styles = {
            video: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
            practice: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
            text: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
            interactive: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
        };
        return styles[type] || styles.text;
    }

    getResourceTypeIcon(type) {
        const icons = {
            video: 'bi-play-circle',
            practice: 'bi-code-slash',
            text: 'bi-book',
            interactive: 'bi-controller'
        };
        return icons[type] || icons.text;
    }

    async toggleDayCompletion(week, day) {
        try {
            const progressKey = `week${week}_day${day}`;
            const currentProgress = this.userProgress[progressKey];
            const newCompletedState = !(currentProgress && currentProgress.completed);

            await api.post(API_ENDPOINTS.progress, {
                week: week,
                day: day,
                completed: newCompletedState,
                time_spent: currentProgress ? currentProgress.time_spent : 0
            });

            // Update local progress
            if (!this.userProgress[progressKey]) {
                this.userProgress[progressKey] = {};
            }
            this.userProgress[progressKey].completed = newCompletedState;

            // Refresh the display
            await this.loadUserProgress();
            this.renderRoadmap();
            this.updateOverallProgress();
            modalManager.close('dayDetailModal');

            notificationManager.success(
                newCompletedState ? 'Great job! Topic marked as completed.' : 'Topic marked as incomplete.'
            );

            // Show achievement if completing
            if (newCompletedState) {
                this.checkForAchievements(week, day);
            }

        } catch (error) {
            console.error('Failed to update progress:', error);
            notificationManager.error('Failed to update progress');
        }
    }

    checkForAchievements(week, day) {
        const weekProgress = this.getWeekProgress(week);

        // Check for week completion
        if (weekProgress.completed === 7) {
            notificationManager.success(`🎉 Week ${week} completed! You're making great progress!`);
        }

        // Check for milestone achievements
        const totalCompleted = Object.values(this.userProgress).filter(p => p.completed).length;

        if (totalCompleted === 10) {
            notificationManager.success('🏆 Achievement unlocked: First 10 topics completed!');
        } else if (totalCompleted === 50) {
            notificationManager.success('🏆 Achievement unlocked: Half-century scholar!');
        } else if (totalCompleted === 98) {
            notificationManager.success('🎊 Congratulations! You\'ve completed the entire DSA roadmap!');
        }
    }

    startPomodoro(topic) {
        // Integrate with pomodoro timer
        storage.set('pomodoroTopic', topic);
        window.location.href = 'pomodoro.html';
    }

    addNote(week, day) {
        // Integrate with notes system
        storage.set('noteContext', { week, day });
        window.location.href = 'notes.html';
    }

    getWeekProgress(week) {
        let completed = 0;
        let totalTime = 0;

        for (let day = 1; day <= 7; day++) {
            const progressKey = `week${week}_day${day}`;
            const dayProgress = this.userProgress[progressKey];

            if (dayProgress && dayProgress.completed) {
                completed++;
            }
            if (dayProgress) {
                totalTime += dayProgress.time_spent || 0;
            }
        }

        return { completed, totalTime };
    }

    updateOverallProgress() {
        const totalCompleted = Object.values(this.userProgress).filter(p => p.completed).length;
        const totalTopics = 98; // 14 weeks * 7 days
        const completionRate = Math.round((totalCompleted / totalTopics) * 100);

        // Update progress display
        const overallProgressEl = document.getElementById('overallProgress');
        const progressBarEl = document.getElementById('progressBar');
        const completedDaysEl = document.getElementById('completedDays');
        const currentWeekEl = document.getElementById('currentWeek');
        const weekProgressEl = document.getElementById('weekProgress');

        if (overallProgressEl) overallProgressEl.textContent = `${completionRate}%`;
        if (progressBarEl) progressBarEl.style.width = `${completionRate}%`;
        if (completedDaysEl) completedDaysEl.textContent = totalCompleted;
        if (currentWeekEl) currentWeekEl.textContent = this.currentWeek;

        if (weekProgressEl) {
            const currentWeekProgress = this.getWeekProgress(this.currentWeek);
            const weekCompletionRate = Math.round((currentWeekProgress.completed / 7) * 100);
            weekProgressEl.textContent = `${weekCompletionRate}%`;
        }

        // Update total hours
        const totalHours = Object.values(this.userProgress).reduce((sum, p) => sum + (p.time_spent || 0), 0);
        const totalHoursEl = document.getElementById('totalHours');
        if (totalHoursEl) {
            totalHoursEl.textContent = Math.floor(totalHours / 60) > 0
                ? `${Math.floor(totalHours / 60)}h ${totalHours % 60}m`
                : `${totalHours}m`;
        }
    }

    applyFilters() {
        const filterCompleted = document.getElementById('filterCompleted').checked;
        const filterInProgress = document.getElementById('filterInProgress').checked;
        const filterPending = document.getElementById('filterPending').checked;
        const weekFrom = parseInt(document.getElementById('weekFrom').value);
        const weekTo = parseInt(document.getElementById('weekTo').value);

        // Apply filters and re-render
        this.currentFilter = { filterCompleted, filterInProgress, filterPending, weekFrom, weekTo };
        this.renderRoadmap();
    }

    clearFilters() {
        document.getElementById('filterCompleted').checked = true;
        document.getElementById('filterInProgress').checked = true;
        document.getElementById('filterPending').checked = true;
        document.getElementById('weekFrom').value = 1;
        document.getElementById('weekTo').value = 14;

        this.currentFilter = 'all';
        this.renderRoadmap();
    }
}

// Initialize roadmap manager when on roadmap page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('roadmap')) {
        window.roadmapManager = new RoadmapManager();
    }
});