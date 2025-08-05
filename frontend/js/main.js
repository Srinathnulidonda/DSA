// Global Variables
let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';
let currentSection = 'dashboard';
let progressData = JSON.parse(localStorage.getItem('progressData')) || initializeProgress();
let pomodoroTimer = null;
let pomodoroTimeLeft = 25 * 60; // 25 minutes in seconds
let isPomodoroPaused = false;

// Firebase Configuration
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    loadUserProgress();
    updateDashboard();
    loadTimetable();
    loadResources();
    checkAuthState();
    showDailyQuote();

    // Set up event listeners
    setupEventListeners();

    // Apply theme
    applyTheme(currentTheme);

    // Show dashboard by default
    showSection('dashboard');
});

// Initialize Progress Data
function initializeProgress() {
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
        topicMastery: {},
        achievements: [],
        notes: {},
        projects: [],
        dailyActivities: []
    };
}

// Initialize App
function initializeApp() {
    console.log('DSA Learning Dashboard Initialized');

    // Load progress from localStorage
    const savedProgress = localStorage.getItem('progressData');
    if (savedProgress) {
        progressData = JSON.parse(savedProgress);
    }

    // Update streak based on last study date
    updateStreak();

    // Generate week tabs
    generateWeekTabs();

    // Load achievements
    checkAchievements();
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            showSection(section);
        });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Login button
    document.getElementById('loginBtn').addEventListener('click', () => {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Resource tabs
    document.querySelectorAll('[data-category]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const category = e.target.getAttribute('data-category');
            filterResources(category);

            // Update active tab
            document.querySelectorAll('[data-category]').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Auto-save notes
    document.getElementById('noteContent').addEventListener('input', debounce(autoSaveNote, 1000));
}

// Show Section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Load section-specific data
        switch (sectionName) {
            case 'dashboard':
                updateDashboard();
                break;
            case 'timetable':
                loadTimetable();
                break;
            case 'progress':
                loadProgressCharts();
                break;
            case 'projects':
                loadProjects();
                break;
            case 'notes':
                loadNotes();
                break;
            case 'resources':
                loadResources();
                break;
        }
    }
}

// Update Dashboard
function updateDashboard() {
    // Update stats
    document.getElementById('completedDays').textContent = progressData.completedDays;
    document.getElementById('completedProjects').textContent = progressData.completedProjects;
    document.getElementById('solvedProblems').textContent = progressData.solvedProblems;
    document.getElementById('studyHours').textContent = progressData.studyHours;
    document.getElementById('streakCount').textContent = progressData.streak;

    // Update today's focus
    updateTodaysFocus();

    // Update recent activity
    updateRecentActivity();

    // Update progress chart
    updateProgressChart();
}

// Update Today's Focus
function updateTodaysFocus() {
    const currentWeekData = dsaRoadmap[progressData.currentWeek - 1];
    const currentDayData = currentWeekData ? currentWeekData.days[progressData.currentDay - 1] : null;

    const todaysFocus = document.getElementById('todaysFocus');

    if (currentDayData) {
        todaysFocus.innerHTML = `
            <div class="mb-3">
                <h6 class="text-primary mb-2">Week ${progressData.currentWeek}, Day ${progressData.currentDay}</h6>
                <h5 class="mb-2">${currentDayData.topic}</h5>
                <p class="text-muted small mb-3">${currentDayData.activities}</p>
                
                <div class="d-flex align-items-center mb-2">
                    <i class="fas fa-clock text-warning me-2"></i>
                    <span class="small">${currentDayData.time}</span>
                </div>
                
                <div class="mt-3">
                    <button class="btn btn-sm btn-success w-100" onclick="markDayComplete(${progressData.currentWeek}, ${progressData.currentDay})">
                        <i class="fas fa-check"></i> Mark Complete
                    </button>
                </div>
            </div>
        `;
    } else {
        todaysFocus.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-trophy text-warning fa-3x mb-3"></i>
                <h5>Congratulations!</h5>
                <p class="text-muted">You've completed the entire DSA roadmap!</p>
            </div>
        `;
    }
}

// Update Recent Activity
function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    const activities = progressData.dailyActivities.slice(-5).reverse();

    if (activities.length === 0) {
        recentActivity.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-history fa-2x mb-2"></i>
                <p>No recent activity. Start your DSA journey!</p>
            </div>
        `;
        return;
    }

    const activityHTML = activities.map(activity => `
        <div class="d-flex align-items-center py-2 border-bottom">
            <div class="activity-icon bg-${activity.type === 'complete' ? 'success' : activity.type === 'project' ? 'primary' : 'info'}-100 text-${activity.type === 'complete' ? 'success' : activity.type === 'project' ? 'primary' : 'info'}-600 p-2 rounded-circle me-3">
                <i class="fas fa-${activity.type === 'complete' ? 'check' : activity.type === 'project' ? 'folder' : 'note'} fa-sm"></i>
            </div>
            <div class="flex-grow-1">
                <p class="mb-0 fw-medium">${activity.description}</p>
                <small class="text-muted">${formatDate(activity.date)}</small>
            </div>
        </div>
    `).join('');

    recentActivity.innerHTML = activityHTML;
}

// Update Progress Chart
function updateProgressChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');

    // Destroy existing chart if it exists
    if (window.progressChart) {
        window.progressChart.destroy();
    }

    const weekLabels = Array.from({ length: 14 }, (_, i) => `Week ${i + 1}`);
    const weekProgress = progressData.weekProgress;

    window.progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekLabels,
            datasets: [{
                label: 'Completion %',
                data: weekProgress,
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

// Mark Day Complete
function markDayComplete(week, day) {
    if (!progressData.weekProgress[week - 1]) {
        progressData.weekProgress[week - 1] = 0;
    }

    progressData.completedDays++;
    progressData.weekProgress[week - 1] = Math.min(progressData.weekProgress[week - 1] + 14.28, 100); // ~14.28% per day

    // Move to next day
    if (day < 7) {
        progressData.currentDay++;
    } else if (week < 14) {
        progressData.currentWeek++;
        progressData.currentDay = 1;
    }

    // Update streak
    updateStreak();

    // Add to recent activity
    addActivity('complete', `Completed Week ${week}, Day ${day}`);

    // Check for achievements
    checkAchievements();

    // Save progress
    saveProgress();

    // Update dashboard
    updateDashboard();

    // Show success message
    showNotification('Day completed! Keep up the great work! 🎉', 'success');
}

// Update Streak
function updateStreak() {
    const today = new Date().toDateString();
    const lastStudy = progressData.lastStudyDate;

    if (lastStudy === today) {
        // Already studied today
        return;
    }

    if (lastStudy) {
        const lastStudyDate = new Date(lastStudy);
        const todayDate = new Date(today);
        const diffTime = todayDate - lastStudyDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Consecutive day
            progressData.streak++;
        } else if (diffDays > 1) {
            // Streak broken
            progressData.streak = 1;
        }
    } else {
        // First time
        progressData.streak = 1;
    }

    progressData.lastStudyDate = today;
}

// Add Activity
function addActivity(type, description) {
    progressData.dailyActivities.push({
        type,
        description,
        date: new Date().toISOString()
    });

    // Keep only last 50 activities
    if (progressData.dailyActivities.length > 50) {
        progressData.dailyActivities = progressData.dailyActivities.slice(-50);
    }
}

// Check Achievements
function checkAchievements() {
    const achievements = [
        {
            id: 'first_day',
            title: 'First Steps',
            description: 'Complete your first day',
            icon: 'fa-baby',
            condition: () => progressData.completedDays >= 1
        },
        {
            id: 'week_warrior',
            title: 'Week Warrior',
            description: 'Complete your first week',
            icon: 'fa-calendar-week',
            condition: () => progressData.completedDays >= 7
        },
        {
            id: 'streak_master',
            title: 'Streak Master',
            description: 'Maintain a 7-day streak',
            icon: 'fa-fire',
            condition: () => progressData.streak >= 7
        },
        {
            id: 'project_builder',
            title: 'Project Builder',
            description: 'Complete 5 projects',
            icon: 'fa-hammer',
            condition: () => progressData.completedProjects >= 5
        },
        {
            id: 'problem_solver',
            title: 'Problem Solver',
            description: 'Solve 50 problems',
            icon: 'fa-puzzle-piece',
            condition: () => progressData.solvedProblems >= 50
        },
        {
            id: 'dsa_master',
            title: 'DSA Master',
            description: 'Complete the entire roadmap',
            icon: 'fa-crown',
            condition: () => progressData.completedDays >= 98 // 14 weeks * 7 days
        }
    ];

    achievements.forEach(achievement => {
        if (achievement.condition() && !progressData.achievements.includes(achievement.id)) {
            progressData.achievements.push(achievement.id);
            showAchievementPopup(achievement);
        }
    });
}

// Show Achievement Popup
function showAchievementPopup(achievement) {
    const popup = document.createElement('div');
    popup.className = 'achievement-popup position-fixed top-50 start-50 translate-middle bg-white p-4 rounded-lg shadow-lg text-center';
    popup.style.zIndex = '9999';
    popup.innerHTML = `
        <div class="achievement-icon text-warning mb-2">
            <i class="fas ${achievement.icon} fa-3x"></i>
        </div>
        <h5 class="text-dark mb-2">🎉 Achievement Unlocked!</h5>
        <h6 class="text-primary mb-1">${achievement.title}</h6>
        <p class="text-muted small mb-3">${achievement.description}</p>
        <button class="btn btn-primary btn-sm" onclick="closeAchievementPopup()">Awesome!</button>
    `;

    document.body.appendChild(popup);
    popup.style.animation = 'bounceIn 0.6s ease-out';

    // Auto close after 5 seconds
    setTimeout(() => {
        if (popup.parentNode) {
            closeAchievementPopup();
        }
    }, 5000);

    window.currentAchievementPopup = popup;
}

// Close Achievement Popup
function closeAchievementPopup() {
    if (window.currentAchievementPopup) {
        window.currentAchievementPopup.remove();
        window.currentAchievementPopup = null;
    }
}

// Theme Toggle
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
}

// Apply Theme
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('themeIcon');

    if (theme === 'dark') {
        document.body.classList.add('dark');
        themeIcon.className = 'fas fa-sun';
    } else {
        document.body.classList.remove('dark');
        themeIcon.className = 'fas fa-moon';
    }
}

// Pomodoro Timer Functions
function startPomodoroTimer() {
    const pomodoroModal = new bootstrap.Modal(document.getElementById('pomodoroModal'));
    pomodoroModal.show();
    resetPomodoro();
}

function startPomodoro() {
    if (pomodoroTimer) return;

    isPomodoroPaused = false;
    pomodoroTimer = setInterval(() => {
        if (!isPomodoroPaused) {
            pomodoroTimeLeft--;
            updatePomodoroDisplay();

            if (pomodoroTimeLeft <= 0) {
                clearInterval(pomodoroTimer);
                pomodoroTimer = null;
                showNotification('Pomodoro completed! Take a 5-minute break! 🍅', 'success');
                progressData.studyHours += 0.5; // 25 minutes = 0.42 hours, rounded to 0.5
                saveProgress();
            }
        }
    }, 1000);
}

function pausePomodoro() {
    isPomodoroPaused = !isPomodoroPaused;
}

function resetPomodoro() {
    if (pomodoroTimer) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
    }
    pomodoroTimeLeft = 25 * 60;
    isPomodoroPaused = false;
    updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('pomodoroTimer').textContent = display;
}

// Show Random Problem
function showRandomProblem() {
    const problems = [
        { title: "Two Sum", difficulty: "Easy", url: "https://leetcode.com/problems/two-sum/" },
        { title: "Add Two Numbers", difficulty: "Medium", url: "https://leetcode.com/problems/add-two-numbers/" },
        { title: "Longest Substring Without Repeating Characters", difficulty: "Medium", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
        { title: "Median of Two Sorted Arrays", difficulty: "Hard", url: "https://leetcode.com/problems/median-of-two-sorted-arrays/" },
        { title: "Longest Palindromic Substring", difficulty: "Medium", url: "https://leetcode.com/problems/longest-palindromic-substring/" },
        { title: "Valid Parentheses", difficulty: "Easy", url: "https://leetcode.com/problems/valid-parentheses/" },
        { title: "Merge Two Sorted Lists", difficulty: "Easy", url: "https://leetcode.com/problems/merge-two-sorted-lists/" },
        { title: "Remove Duplicates from Sorted Array", difficulty: "Easy", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
        { title: "Maximum Subarray", difficulty: "Easy", url: "https://leetcode.com/problems/maximum-subarray/" },
        { title: "Climbing Stairs", difficulty: "Easy", url: "https://leetcode.com/problems/climbing-stairs/" }
    ];

    const randomProblem = problems[Math.floor(Math.random() * problems.length)];

    const difficultyColors = {
        'Easy': 'success',
        'Medium': 'warning',
        'Hard': 'danger'
    };

    showNotification(`
        Random Problem: <strong>${randomProblem.title}</strong><br>
        Difficulty: <span class="badge bg-${difficultyColors[randomProblem.difficulty]}">${randomProblem.difficulty}</span><br>
        <a href="${randomProblem.url}" target="_blank" class="btn btn-sm btn-primary mt-2">Solve Now</a>
    `, 'info', 10000);
}

// Daily Quote
function showDailyQuote() {
    const quotes = [
        "The only way to learn a new programming language is by writing programs in it. - Dennis Ritchie",
        "Code is like humor. When you have to explain it, it's bad. - Cory House",
        "First, solve the problem. Then, write the code. - John Johnson",
        "Experience is the name everyone gives to their mistakes. - Oscar Wilde",
        "In order to be irreplaceable, one must always be different. - Coco Chanel",
        "Java is to JavaScript what car is to Carpet. - Chris Heilmann",
        "Knowledge is power. - Francis Bacon",
        "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code. - Dan Salomon",
        "Perfection is achieved not when there is nothing more to add, but rather when there is nothing more to take away. - Antoine de Saint-Exupery",
        "Ruby is rubbish! PHP is phpantastic! - Nikita Popov"
    ];

    const today = new Date().toDateString();
    const savedQuoteDate = localStorage.getItem('dailyQuoteDate');

    if (savedQuoteDate !== today) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        document.getElementById('quoteText').textContent = randomQuote;
        localStorage.setItem('dailyQuoteDate', today);
        localStorage.setItem('dailyQuote', randomQuote);

        // Show quote after a delay
        setTimeout(() => {
            document.getElementById('dailyQuote').style.display = 'block';
        }, 2000);
    } else {
        const savedQuote = localStorage.getItem('dailyQuote');
        if (savedQuote) {
            document.getElementById('quoteText').textContent = savedQuote;
            document.getElementById('dailyQuote').style.display = 'block';
        }
    }
}

function hideDailyQuote() {
    document.getElementById('dailyQuote').style.display = 'none';
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
        return 'Just now';
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

function saveProgress() {
    localStorage.setItem('progressData', JSON.stringify(progressData));

    // Also save to Firebase if user is logged in
    if (currentUser) {
        saveProgressToCloud();
    }
}

function loadUserProgress() {
    const savedProgress = localStorage.getItem('progressData');
    if (savedProgress) {
        progressData = JSON.parse(savedProgress);
    }
}

// Authentication Functions
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('loginBtn').innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-primary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        ${user.email}
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="syncProgress()">Sync Progress</a></li>
                        <li><a class="dropdown-item" href="#" onclick="exportProgress()">Export Data</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="logout()">Logout</a></li>
                    </ul>
                </div>
            `;
            document.getElementById('userName').textContent = user.displayName || user.email.split('@')[0];
            loadProgressFromCloud();
        } else {
            currentUser = null;
            document.getElementById('loginBtn').innerHTML = '<button class="btn btn-primary btn-sm">Login</button>';
            document.getElementById('userName').textContent = 'DSA Learner';
        }
    });
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            showNotification('Logged in successfully!', 'success');
        })
        .catch((error) => {
            showNotification(`Login failed: ${error.message}`, 'danger');
        });
}

function signUpUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showNotification('Please enter email and password', 'warning');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            showNotification('Account created successfully!', 'success');
        })
        .catch((error) => {
            showNotification(`Signup failed: ${error.message}`, 'danger');
        });
}

function logout() {
    auth.signOut().then(() => {
        showNotification('Logged out successfully!', 'info');
    });
}

// Cloud Storage Functions
function saveProgressToCloud() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).set({
        progressData: progressData,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        console.log('Progress saved to cloud');
    }).catch((error) => {
        console.error('Error saving to cloud:', error);
    });
}

function loadProgressFromCloud() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).get().then((doc) => {
        if (doc.exists) {
            const cloudData = doc.data();
            if (cloudData.progressData) {
                progressData = cloudData.progressData;
                saveProgress(); // Save to localStorage
                updateDashboard();
                showNotification('Progress synced from cloud!', 'success');
            }
        }
    }).catch((error) => {
        console.error('Error loading from cloud:', error);
    });
}

function syncProgress() {
    if (currentUser) {
        saveProgressToCloud();
        showNotification('Progress synced to cloud!', 'success');
    }
}

function exportProgress() {
    const dataStr = JSON.stringify(progressData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showNotification('Progress data exported!', 'success');
}

// Make functions globally available
window.showSection = showSection;
window.markDayComplete = markDayComplete;
window.startPomodoroTimer = startPomodoroTimer;
window.startPomodoro = startPomodoro;
window.pausePomodoro = pausePomodoro;
window.resetPomodoro = resetPomodoro;
window.showRandomProblem = showRandomProblem;
window.hideDailyQuote = hideDailyQuote;
window.closeAchievementPopup = closeAchievementPopup;
window.signUpUser = signUpUser;
window.logout = logout;
window.syncProgress = syncProgress;
window.exportProgress = exportProgress;
