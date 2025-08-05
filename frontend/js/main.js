// Main JavaScript file
class DSADashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.userData = this.loadUserData();
        this.firebaseConfig = {
            // Add your Firebase config here
            apiKey: "your-api-key",
            authDomain: "your-project.firebaseapp.com",
            databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
            projectId: "your-project-id",
            storageBucket: "your-project.appspot.com",
            messagingSenderId: "123456789",
            appId: "your-app-id"
        };

        this.init();
    }

    init() {
        this.initFirebase();
        this.initTheme();
        this.initEventListeners();
        this.loadDashboard();
        this.startDailyQuote();
        this.updateStreak();
        this.initTimer();
    }

    initFirebase() {
        try {
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(this.firebaseConfig);
                this.database = firebase.database();
                this.auth = firebase.auth();
                console.log('Firebase initialized successfully');
            }
        } catch (error) {
            console.warn('Firebase not available, using localStorage:', error);
        }
    }

    initTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    initEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="showPage"]')) {
                const page = e.target.getAttribute('onclick').match(/showPage\('(.+?)'\)/)[1];
                this.showPage(page);
            }
        });

        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.handleFilterClick(e.target);
            }
            if (e.target.classList.contains('category-btn')) {
                this.handleCategoryClick(e.target);
            }
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.saveUserData();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.showPage('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showPage('timetable');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showPage('progress');
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showAddNoteModal();
                        break;
                }
            }
        });
    }

    loadUserData() {
        try {
            const stored = localStorage.getItem('dsaDashboardData');
            return stored ? JSON.parse(stored) : this.getDefaultUserData();
        } catch (error) {
            console.error('Error loading user data:', error);
            return this.getDefaultUserData();
        }
    }

    getDefaultUserData() {
        return {
            currentWeek: 1,
            streak: 0,
            lastStudyDate: null,
            completedTasks: {},
            weekProgress: {},
            projects: [],
            notes: [],
            studyTime: 0,
            problemsSolved: 0,
            achievements: [],
            preferences: {
                timerDuration: 25,
                dailyGoal: 2,
                notifications: true
            }
        };
    }

    saveUserData() {
        try {
            localStorage.setItem('dsaDashboardData', JSON.stringify(this.userData));

            // Also save to Firebase if available
            if (this.database && this.auth.currentUser) {
                this.database.ref(`users/${this.auth.currentUser.uid}`).set(this.userData);
            }
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;

            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelector(`[onclick*="${pageName}"]`)?.classList.add('active');

            // Load page-specific content
            this.loadPageContent(pageName);
        }
    }

    loadPageContent(pageName) {
        switch (pageName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'timetable':
                this.loadTimetable();
                break;
            case 'progress':
                this.loadProgress();
                break;
            case 'projects':
                this.loadProjects();
                break;
            case 'notes':
                this.loadNotes();
                break;
            case 'resources':
                this.loadResources();
                break;
        }
    }

    loadDashboard() {
        this.updateStats();
        this.loadTodaysTasks();
        this.updateWeekProgress();
        this.updateProgressCircle();
        this.loadRecentAchievements();
    }

    updateStats() {
        const stats = this.calculateStats();

        document.getElementById('days-studied').textContent = stats.daysStudied;
        document.getElementById('topics-completed').textContent = stats.topicsCompleted;
        document.getElementById('problems-solved').textContent = stats.problemsSolved;
        document.getElementById('projects-built').textContent = stats.projectsBuilt;

        // Animate numbers
        this.animateNumber('days-studied', 0, stats.daysStudied, 1000);
        this.animateNumber('topics-completed', 0, stats.topicsCompleted, 1200);
        this.animateNumber('problems-solved', 0, stats.problemsSolved, 1400);
        this.animateNumber('projects-built', 0, stats.projectsBuilt, 1600);
    }

    calculateStats() {
        const completedTasks = Object.keys(this.userData.completedTasks).length;
        const completedWeeks = Object.values(this.userData.weekProgress).filter(p => p >= 100).length;

        return {
            daysStudied: Math.floor(completedTasks / 5), // Assuming 5 tasks per day average
            topicsCompleted: completedTasks,
            problemsSolved: this.userData.problemsSolved || 0,
            projectsBuilt: this.userData.projects.filter(p => p.status === 'completed').length
        };
    }

    animateNumber(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);
    }

    loadTodaysTasks() {
        const container = document.getElementById('today-tasks');
        const currentWeek = this.userData.currentWeek;

        this.loadWeekData(currentWeek).then(weekData => {
            if (weekData) {
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                const todayData = weekData.days.find(day =>
                    day.day.toLowerCase().includes(today.substring(0, 3))
                );

                if (todayData) {
                    container.innerHTML = this.renderTodaysTasks(todayData);
                } else {
                    container.innerHTML = '<p class="text-muted">No tasks for today. Great time to review!</p>';
                }
            }
        });
    }

    renderTodaysTasks(dayData) {
        const tasks = [
            { id: `${dayData.day}-topic`, text: `Study: ${dayData.topic}`, completed: false },
            { id: `${dayData.day}-activities`, text: dayData.activities, completed: false },
            { id: `${dayData.day}-project`, text: dayData.project || 'Work on project', completed: false }
        ];

        return tasks.map(task => {
            const isCompleted = this.userData.completedTasks[task.id] || false;
            return `
                <div class="task-item ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
                    <div class="d-flex align-items-center">
                        <input type="checkbox" class="form-check-input me-3" 
                               ${isCompleted ? 'checked' : ''} 
                               onchange="dashboard.toggleTask('${task.id}')">
                        <div class="flex-grow-1">
                            <span class="task-text">${task.text}</span>
                            <div class="task-time text-muted small">
                                <i class="fas fa-clock me-1"></i>${dayData.time}
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="dashboard.showTaskDetails('${task.id}')">
                                <i class="fas fa-info"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleTask(taskId) {
        this.userData.completedTasks[taskId] = !this.userData.completedTasks[taskId];

        if (this.userData.completedTasks[taskId]) {
            this.updateStreak();
            this.checkAchievements();
            this.showTaskCompletionAnimation(taskId);
        }

        this.saveUserData();
        this.updateWeekProgress();
        this.updateProgressCircle();
    }

    showTaskCompletionAnimation(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('animate-scaleIn');
            setTimeout(() => {
                taskElement.classList.remove('animate-scaleIn');
            }, 500);
        }
    }

    updateWeekProgress() {
        const currentWeek = this.userData.currentWeek;
        const weekTasks = Object.keys(this.userData.completedTasks).filter(taskId =>
            taskId.includes(`week-${currentWeek}`) || taskId.includes('mon') || taskId.includes('tue') ||
            taskId.includes('wed') || taskId.includes('thu') || taskId.includes('fri')
        );

        const completedWeekTasks = weekTasks.filter(taskId => this.userData.completedTasks[taskId]);
        const weekPercentage = weekTasks.length > 0 ? Math.round((completedWeekTasks.length / weekTasks.length) * 100) : 0;

        this.userData.weekProgress[currentWeek] = weekPercentage;

        document.getElementById('week-percentage').textContent = `${weekPercentage}%`;
        document.getElementById('week-progress-bar').style.width = `${weekPercentage}%`;
        document.getElementById('current-week-badge').textContent = `Week ${currentWeek}`;
    }

    updateProgressCircle() {
        const totalWeeks = 14;
        const completedWeeks = Object.values(this.userData.weekProgress).filter(p => p >= 100).length;
        const overallPercentage = Math.round((completedWeeks / totalWeeks) * 100);

        document.querySelector('.progress-percentage').textContent = `${overallPercentage}%`;

        // Update circle progress (would need CSS animation)
        const circle = document.querySelector('.progress-circle');
        if (circle) {
            circle.style.setProperty('--progress-angle', `${(overallPercentage / 100) * 360}deg`);
        }
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastStudyDate = this.userData.lastStudyDate;

        if (lastStudyDate === today) {
            // Already studied today
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastStudyDate === yesterday.toDateString()) {
            // Continuous streak
            this.userData.streak += 1;
        } else if (lastStudyDate !== today) {
            // Streak broken, reset
            this.userData.streak = 1;
        }

        this.userData.lastStudyDate = today;
        document.getElementById('streak-count').textContent = this.userData.streak;

        // Add fire animation for high streaks
        const streakElement = document.getElementById('streak-count');
        if (this.userData.streak >= 7) {
            streakElement.classList.add('streak-fire');
        }

        this.saveUserData();
    }

    loadRecentAchievements() {
        const container = document.getElementById('recent-badges');
        const recentAchievements = this.userData.achievements.slice(-5);

        container.innerHTML = recentAchievements.map(achievement =>
            `<span class="badge-item">${achievement.name}</span>`
        ).join('');
    }

    checkAchievements() {
        const achievements = [
            {
                id: 'first-task',
                name: 'First Steps',
                description: 'Complete your first task',
                condition: () => Object.keys(this.userData.completedTasks).length >= 1
            },
            {
                id: 'week-warrior',
                name: 'Week Warrior',
                description: 'Complete an entire week',
                condition: () => Object.values(this.userData.weekProgress).some(p => p >= 100)
            },
            {
                id: 'streak-starter',
                name: 'Streak Starter',
                description: 'Maintain a 7-day streak',
                condition: () => this.userData.streak >= 7
            },
            {
                id: 'project-builder',
                name: 'Project Builder',
                description: 'Complete your first project',
                condition: () => this.userData.projects.some(p => p.status === 'completed')
            },
            {
                id: 'note-taker',
                name: 'Note Taker',
                description: 'Add 10 notes',
                condition: () => this.userData.notes.length >= 10
            }
        ];

        achievements.forEach(achievement => {
            if (achievement.condition() && !this.userData.achievements.find(a => a.id === achievement.id)) {
                this.userData.achievements.push(achievement);
                this.showAchievementPopup(achievement);
            }
        });
    }

    showAchievementPopup(achievement) {
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-icon mb-2">
                <i class="fas fa-trophy" style="font-size: 2rem; color: #fbbf24;"></i>
            </div>
            <h4>Achievement Unlocked!</h4>
            <h5>${achievement.name}</h5>
            <p>${achievement.description}</p>
        `;

        document.body.appendChild(popup);

        setTimeout(() => popup.classList.add('show'), 100);
        setTimeout(() => {
            popup.remove();
        }, 4000);

        // Play achievement sound (if audio is enabled)
        this.playAchievementSound();
    }

    playAchievementSound() {
        // Create a simple achievement sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not available');
        }
    }

    startDailyQuote() {
        const quotes = [
            "The only way to learn a new programming language is by writing programs in it. - Dennis Ritchie",
            "Code is like humor. When you have to explain it, it's bad. - Cory House",
            "First, solve the problem. Then, write the code. - John Johnson",
            "Experience is the name everyone gives to their mistakes. - Oscar Wilde",
            "The best way to get a project done faster is to start sooner. - Jim Highsmith",
            "Simplicity is the ultimate sophistication. - Leonardo da Vinci",
            "The most disastrous thing that you can ever learn is your first programming language. - Alan Kay",
            "Programming isn't about what you know; it's about what you can figure out. - Chris Pine",
            "The computer was born to solve problems that did not exist before. - Bill Gates",
            "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. - Martin Fowler"
        ];

        const today = new Date().getDate();
        const quote = quotes[today % quotes.length];
        document.getElementById('motivational-quote').textContent = quote;
    }

    // Timer functionality
    initTimer() {
        this.timer = {
            minutes: this.userData.preferences.timerDuration,
            seconds: 0,
            isRunning: false,
            interval: null
        };
        this.updateTimerDisplay();
    }

    startTimer() {
        if (!this.timer.isRunning) {
            this.timer.isRunning = true;
            this.timer.interval = setInterval(() => {
                if (this.timer.seconds === 0) {
                    if (this.timer.minutes === 0) {
                        this.timerComplete();
                        return;
                    }
                    this.timer.minutes--;
                    this.timer.seconds = 59;
                } else {
                    this.timer.seconds--;
                }
                this.updateTimerDisplay();
            }, 1000);

            document.getElementById('timer-start').style.display = 'none';
            document.getElementById('timer-pause').style.display = 'inline-block';

            // Add running animation
            document.querySelector('.timer-display').classList.add('timer-running');
        }
    }

    pauseTimer() {
        this.timer.isRunning = false;
        clearInterval(this.timer.interval);

        document.getElementById('timer-start').style.display = 'inline-block';
        document.getElementById('timer-pause').style.display = 'none';

        document.querySelector('.timer-display').classList.remove('timer-running');
    }

    resetTimer() {
        this.pauseTimer();
        this.timer.minutes = this.userData.preferences.timerDuration;
        this.timer.seconds = 0;
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        document.getElementById('timer-minutes').textContent =
            this.timer.minutes.toString().padStart(2, '0');
        document.getElementById('timer-seconds').textContent =
            this.timer.seconds.toString().padStart(2, '0');
    }

    setTimerDuration() {
        const duration = parseInt(document.getElementById('timer-duration').value);
        this.userData.preferences.timerDuration = duration;
        this.resetTimer();
        this.saveUserData();
    }

    timerComplete() {
        this.pauseTimer();
        this.userData.studyTime += this.userData.preferences.timerDuration;
        this.saveUserData();

        // Show completion notification
        this.showNotification('Pomodoro Complete!', 'Great job! Time for a break.', 'success');

        // Play completion sound
        this.playTimerCompleteSound();

        // Reset timer
        setTimeout(() => this.resetTimer(), 2000);
    }

    playTimerCompleteSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Play a pleasant completion tone
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.2); // C5

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not available');
        }
    }

    showNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="notification-icon me-3">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${title}</h6>
                    <p class="mb-0 small">${message}</p>
                </div>
                <button class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        document.body.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    // Quick action methods
    openRandomProblem() {
        const problems = [
            'https://leetcode.com/problems/two-sum/',
            'https://leetcode.com/problems/reverse-linked-list/',
            'https://leetcode.com/problems/valid-parentheses/',
            'https://leetcode.com/problems/maximum-subarray/',
            'https://leetcode.com/problems/binary-tree-inorder-traversal/'
        ];

        const randomProblem = problems[Math.floor(Math.random() * problems.length)];
        window.open(randomProblem, '_blank');
    }

    startStudySession() {
        this.showNotification('Study Session Started!', 'Focus time begins now. Good luck!', 'success');
        this.startTimer();
    }

    exportData() {
        const dataStr = JSON.stringify(this.userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'dsa-dashboard-data.json';
        link.click();
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        this.userData = { ...this.getDefaultUserData(), ...importedData };
                        this.saveUserData();
                        this.loadDashboard();
                        this.showNotification('Data Imported!', 'Your progress has been restored.', 'success');
                    } catch (error) {
                        this.showNotification('Import Failed', 'Invalid file format.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }

    // Filter and category handlers
    handleFilterClick(button) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const filter = button.dataset.filter;
        this.filterProjects(filter);
    }

    handleCategoryClick(button) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const category = button.dataset.category;
        this.filterResources(category);
    }
}

// Global functions for onclick handlers
function showPage(pageName) {
    dashboard.showPage(pageName);
}

function toggleTheme() {
    dashboard.toggleTheme();
}

function startStudySession() {
    dashboard.startStudySession();
}

function startTimer() {
    dashboard.startTimer();
}

function pauseTimer() {
    dashboard.pauseTimer();
}

function resetTimer() {
    dashboard.resetTimer();
}

function setTimerDuration() {
    dashboard.setTimerDuration();
}

function openRandomProblem() {
    dashboard.openRandomProblem();
}

function exportData() {
    dashboard.exportData();
}

function importData() {
    dashboard.importData();
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DSADashboard();
});
