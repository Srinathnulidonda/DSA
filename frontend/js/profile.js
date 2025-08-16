// Profile management functionality

class ProfileManager {
    constructor() {
        this.profileData = null;
        this.statsData = null;
        this.achievementsData = null;
        this.isEditing = false;
        this.init();
    }

    async init() {
        await this.loadProfileData();
        await this.loadStats();
        await this.loadAchievements();
        this.setupEventListeners();
        this.renderProfile();
        this.renderStats();
        this.renderAchievements();
        this.renderRecentActivity();
        this.renderStreakCalendar();
    }

    async loadProfileData() {
        try {
            const response = await api.get(API_ENDPOINTS.profile);
            this.profileData = response;
            this.updateProfileUI();
        } catch (error) {
            console.error('Failed to load profile data:', error);
            notificationManager.error('Failed to load profile data');
        }
    }

    async loadStats() {
        try {
            const response = await api.get(API_ENDPOINTS.dashboard);
            this.statsData = response;
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async loadAchievements() {
        // This would typically come from a dedicated achievements endpoint
        this.achievementsData = this.generateAchievements();
    }

    setupEventListeners() {
        // Edit profile button
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                this.showEditProfileModal();
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                // Navigate to settings or show settings modal
                notificationManager.info('Settings page coming soon!');
            });
        }

        // Avatar upload
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        const avatarUploadInput = document.getElementById('avatarUploadInput');

        if (changeAvatarBtn && avatarUploadInput) {
            changeAvatarBtn.addEventListener('click', () => {
                avatarUploadInput.click();
            });

            avatarUploadInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.uploadAvatar(e.target.files[0]);
                }
            });
        }

        // Cover image change
        const changeCoverBtn = document.getElementById('changeCoverBtn');
        if (changeCoverBtn) {
            changeCoverBtn.addEventListener('click', () => {
                notificationManager.info('Cover image upload coming soon!');
            });
        }

        // Edit profile form
        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }

        // Change password form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        // Preferences
        const savePreferencesBtn = document.getElementById('savePreferencesBtn');
        if (savePreferencesBtn) {
            savePreferencesBtn.addEventListener('click', () => {
                this.savePreferences();
            });
        }

        // App settings toggles
        this.setupAppSettings();

        // Quick actions
        this.setupQuickActions();

        // Delete account
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                this.confirmDeleteAccount();
            });
        }
    }

    updateProfileUI() {
        if (!this.profileData) return;

        const { user, preferences, streak } = this.profileData;

        // Update basic info
        document.getElementById('profileName').textContent = user.username;
        document.getElementById('profileEmail').textContent = user.email;

        const joinDate = new Date(user.created_at);
        document.getElementById('joinDate').textContent = joinDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });

        // Update avatar
        const avatarElements = document.querySelectorAll('#profileAvatar, #userAvatar');
        avatarElements.forEach(el => {
            if (user.avatar_url) {
                el.src = user.avatar_url;
            } else {
                el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=3b82f6&color=fff&size=128`;
            }
        });

        // Update preferences
        if (preferences) {
            document.getElementById('preferredLanguage').value = preferences.preferred_language || 'python';
            document.getElementById('dailyGoal').value = preferences.daily_goal_minutes || 120;

            // Update theme
            if (preferences.theme === 'dark') {
                document.documentElement.classList.add('dark');
            }
        }

        // Update streak info
        if (streak) {
            document.getElementById('streakDays').textContent = streak.current || 0;
            document.getElementById('bestStreak').textContent = `${streak.longest || 0} days`;
        }
    }

    renderProfile() {
        // Most profile info is rendered via HTML, this handles dynamic elements
        this.updatePrivacySettings();
        this.updateNotificationSettings();
    }

    renderStats() {
        if (!this.statsData) return;

        const { statistics } = this.statsData;

        document.getElementById('totalCompleted').textContent = statistics.total_completed || 0;
        document.getElementById('totalHours').textContent = this.formatHours(statistics.total_time_minutes || 0);
        document.getElementById('currentStreak').textContent = statistics.current_streak || 0;

        // Calculate total achievements (simplified)
        const totalAchievements = this.achievementsData ? this.achievementsData.length : 0;
        document.getElementById('totalAchievements').textContent = totalAchievements;
    }

    formatHours(minutes) {
        const hours = Math.floor(minutes / 60);
        return `${hours}h`;
    }

    generateAchievements() {
        if (!this.statsData) return [];

        const achievements = [];
        const { statistics, streak } = this.statsData;

        // First steps
        if ((statistics.total_completed || 0) >= 1) {
            achievements.push({
                id: 'first_steps',
                title: 'First Steps',
                description: 'Completed your first topic',
                icon: 'bi-star-fill',
                unlocked: true,
                unlockedAt: new Date().toISOString()
            });
        }

        // Week warrior
        if ((streak?.current || 0) >= 7) {
            achievements.push({
                id: 'week_warrior',
                title: 'Week Warrior',
                description: '7-day learning streak',
                icon: 'bi-fire',
                unlocked: true,
                unlockedAt: new Date().toISOString()
            });
        }

        // Early bird (if user studies before 8 AM)
        achievements.push({
            id: 'early_bird',
            title: 'Early Bird',
            description: 'Complete a session before 8 AM',
            icon: 'bi-sunrise',
            unlocked: false
        });

        // Night owl (if user studies after 10 PM)
        achievements.push({
            id: 'night_owl',
            title: 'Night Owl',
            description: 'Complete a session after 10 PM',
            icon: 'bi-moon-stars',
            unlocked: false
        });

        return achievements;
    }

    renderAchievements() {
        const achievementsList = document.getElementById('achievementsList');
        if (!achievementsList || !this.achievementsData) return;

        const unlockedAchievements = this.achievementsData.filter(a => a.unlocked);

        if (unlockedAchievements.length === 0) {
            achievementsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-trophy text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">Complete challenges to unlock achievements!</p>
                </div>
            `;
            return;
        }

        achievementsList.innerHTML = unlockedAchievements.slice(0, 3).map(achievement => `
            <div class="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg">
                <div class="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <i class="bi ${achievement.icon} text-white text-lg"></i>
                </div>
                <div class="flex-1">
                    <h4 class="font-medium text-white text-sm">${achievement.title}</h4>
                    <p class="text-xs text-white text-opacity-80">${achievement.description}</p>
                </div>
            </div>
        `).join('');
    }

    async renderRecentActivity() {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;

        try {
            const response = await api.get(API_ENDPOINTS.progress);
            const recentProgress = Object.entries(response.progress || {})
                .filter(([key, progress]) => progress.completion_date)
                .map(([key, progress]) => ({
                    ...progress,
                    key
                }))
                .sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date))
                .slice(0, 5);

            if (recentProgress.length === 0) {
                recentActivity.innerHTML = `
                    <div class="text-center py-8">
                        <i class="bi bi-clock-history text-gray-400 text-2xl mb-2"></i>
                        <p class="text-gray-500 dark:text-gray-400">No recent activity</p>
                    </div>
                `;
                return;
            }

            recentActivity.innerHTML = recentProgress.map(activity => `
                <div class="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center ${activity.completed
                    ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                }">
                        <i class="bi ${activity.completed ? 'bi-check-circle' : 'bi-play-circle'}"></i>
                    </div>
                    
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900 dark:text-white">${activity.topic || 'Unknown Topic'}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            ${activity.time_spent || 0} minutes • ${dateUtils.formatRelative(activity.completion_date)}
                        </p>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }

    renderStreakCalendar() {
        const streakCalendar = document.getElementById('streakCalendar');
        if (!streakCalendar || !this.profileData) return;

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        // Generate 5 weeks of calendar
        const weeks = [];
        for (let w = 0; w < 5; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() - (4 - w) * 7 + d);
                week.push(date);
            }
            weeks.push(week);
        }

        // Get activity data (simplified - would come from backend)
        const activityDates = this.generateMockActivityDates();

        streakCalendar.innerHTML = weeks.flat().map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const hasActivity = activityDates.includes(dateStr);
            const isToday = date.toDateString() === today.toDateString();

            let className = 'w-full h-full rounded-sm ';
            if (isToday) {
                className += 'bg-blue-500';
            } else if (hasActivity) {
                className += 'bg-green-500';
            } else {
                className += 'bg-gray-200 dark:bg-gray-700';
            }

            return `<div class="${className}" title="${date.toLocaleDateString()}"></div>`;
        }).join('');
    }

    generateMockActivityDates() {
        // Generate some mock activity dates for demonstration
        const dates = [];
        const today = new Date();

        // Current streak
        const currentStreak = this.profileData?.streak?.current || 0;
        for (let i = 0; i < currentStreak; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }

        // Some random past activity
        for (let i = 0; i < 20; i++) {
            const daysAgo = Math.floor(Math.random() * 30) + currentStreak;
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            if (Math.random() > 0.3) {
                dates.push(date.toISOString().split('T')[0]);
            }
        }

        return [...new Set(dates)];
    }

    showEditProfileModal() {
        const modal = document.getElementById('editProfileModal');
        if (!modal || !this.profileData) return;

        // Populate form with current data
        document.getElementById('editUsername').value = this.profileData.user.username;
        document.getElementById('editEmail').value = this.profileData.user.email;

        modalManager.open('editProfileModal');
    }

    async saveProfile() {
        const username = document.getElementById('editUsername').value.trim();
        const email = document.getElementById('editEmail').value.trim();

        if (!username || !email) {
            notificationManager.error('Please fill in all fields');
            return;
        }

        try {
            await api.put(API_ENDPOINTS.profile, { username });

            // Update local data
            this.profileData.user.username = username;
            this.updateProfileUI();

            modalManager.close('editProfileModal');
            notificationManager.success('Profile updated successfully');

        } catch (error) {
            console.error('Failed to update profile:', error);
            notificationManager.error('Failed to update profile');
        }
    }

    async uploadAvatar(file) {
        if (!file) return;

        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            notificationManager.error('File size must be less than 5MB');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            notificationManager.error('Please upload a valid image file');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const loader = loadingManager.show('#profileAvatar', 'Uploading...');

            await api.post('/profile/upload-avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Reload profile to get new avatar URL
            await this.loadProfileData();

            loadingManager.hide(loader);
            notificationManager.success('Avatar updated successfully');

        } catch (error) {
            console.error('Failed to upload avatar:', error);
            notificationManager.error('Failed to upload avatar');
            loadingManager.hideAll();
        }
    }

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            notificationManager.error('Please fill in all fields');
            return;
        }

        if (newPassword.length < 8) {
            notificationManager.error('Password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            notificationManager.error('Passwords do not match');
            return;
        }

        try {
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });

            modalManager.close('changePasswordModal');
            document.getElementById('changePasswordForm').reset();
            notificationManager.success('Password changed successfully');

        } catch (error) {
            console.error('Failed to change password:', error);
            notificationManager.error('Failed to change password');
        }
    }

    async savePreferences() {
        const preferences = {
            preferred_language: document.getElementById('preferredLanguage').value,
            daily_goal_minutes: parseInt(document.getElementById('dailyGoal').value)
        };

        try {
            await api.put(API_ENDPOINTS.profile, { preferences });
            notificationManager.success('Preferences saved successfully');
        } catch (error) {
            console.error('Failed to save preferences:', error);
            notificationManager.error('Failed to save preferences');
        }
    }

    setupAppSettings() {
        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                themeManager.toggleTheme();
                this.updateToggleState(darkModeToggle, themeManager.currentTheme === 'dark');
            });
            this.updateToggleState(darkModeToggle, themeManager.currentTheme === 'dark');
        }

        // Email notifications toggle
        const emailNotificationsToggle = document.getElementById('emailNotificationsToggle');
        if (emailNotificationsToggle && this.profileData) {
            const isEnabled = this.profileData.preferences?.email_notifications ?? true;
            this.updateToggleState(emailNotificationsToggle, isEnabled);

            emailNotificationsToggle.addEventListener('click', () => {
                const newState = !this.getToggleState(emailNotificationsToggle);
                this.updateToggleState(emailNotificationsToggle, newState);
                this.updateNotificationSettings('email', newState);
            });
        }

        // Push notifications toggle
        const pushNotificationsToggle = document.getElementById('pushNotificationsToggle');
        if (pushNotificationsToggle && this.profileData) {
            const isEnabled = this.profileData.preferences?.push_notifications ?? true;
            this.updateToggleState(pushNotificationsToggle, isEnabled);

            pushNotificationsToggle.addEventListener('click', () => {
                const newState = !this.getToggleState(pushNotificationsToggle);
                this.updateToggleState(pushNotificationsToggle, newState);
                this.updateNotificationSettings('push', newState);
            });
        }

        // Sound effects toggle
        const soundEffectsToggle = document.getElementById('soundEffectsToggle');
        if (soundEffectsToggle) {
            const isEnabled = storage.get('soundEffectsEnabled') ?? true;
            this.updateToggleState(soundEffectsToggle, isEnabled);

            soundEffectsToggle.addEventListener('click', () => {
                const newState = !this.getToggleState(soundEffectsToggle);
                this.updateToggleState(soundEffectsToggle, newState);
                storage.set('soundEffectsEnabled', newState);
            });
        }
    }

    updateToggleState(toggle, isOn) {
        const span = toggle.querySelector('span:not(.sr-only)');
        if (isOn) {
            toggle.classList.add('bg-blue-600');
            toggle.classList.remove('bg-gray-200', 'dark:bg-gray-600');
            span.classList.add('translate-x-6');
            span.classList.remove('translate-x-0');
        } else {
            toggle.classList.remove('bg-blue-600');
            toggle.classList.add('bg-gray-200', 'dark:bg-gray-600');
            span.classList.remove('translate-x-6');
            span.classList.add('translate-x-0');
        }
    }

    getToggleState(toggle) {
        return toggle.classList.contains('bg-blue-600');
    }

    async updateNotificationSettings(type, enabled) {
        try {
            const preferences = {
                [`${type}_notifications`]: enabled
            };

            await api.put(API_ENDPOINTS.profile, { preferences });
            notificationManager.success(`${type.charAt(0).toUpperCase() + type.slice(1)} notifications ${enabled ? 'enabled' : 'disabled'}`);

        } catch (error) {
            console.error('Failed to update notification settings:', error);
            notificationManager.error('Failed to update settings');
        }
    }

    updatePrivacySettings() {
        // Placeholder for privacy settings
    }

    updateNotificationSettings() {
        // Placeholder for additional notification settings
    }

    setupQuickActions() {
        // Export data
        const exportBtn = document.querySelector('button[onclick*="exportData"]');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportData();
        }

        // Share progress
        const shareBtn = document.querySelector('button[onclick*="shareProgress"]');
        if (shareBtn) {
            shareBtn.onclick = () => this.shareProgress();
        }
    }

    async exportData() {
        try {
            const data = {
                profile: this.profileData,
                stats: this.statsData,
                achievements: this.achievementsData,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `dsa-profile-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            notificationManager.success('Profile data exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            notificationManager.error('Failed to export profile data');
        }
    }

    shareProgress() {
        if (!this.statsData) {
            notificationManager.error('No progress data to share');
            return;
        }

        const { statistics } = this.statsData;
        const shareText = `🎉 My DSA Learning Progress:\n` +
            `📚 Topics Completed: ${statistics.total_completed || 0}\n` +
            `⏱️ Study Time: ${this.formatHours(statistics.total_time_minutes || 0)}\n` +
            `🔥 Current Streak: ${statistics.current_streak || 0} days\n\n` +
            `Join me on this learning journey! #DSALearning #Programming`;

        if (navigator.share) {
            navigator.share({
                title: 'My DSA Learning Progress',
                text: shareText,
                url: window.location.origin
            }).catch(error => {
                if (error.name !== 'AbortError') {
                    console.error('Share failed:', error);
                }
            });
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                notificationManager.success('Progress copied to clipboard!');
            }).catch(error => {
                console.error('Copy failed:', error);
                notificationManager.error('Failed to copy progress');
            });
        }
    }

    confirmDeleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.')) {
            return;
        }

        if (!confirm('This is your final warning. Are you absolutely sure you want to delete your account?')) {
            return;
        }

        // In a real app, you would call the delete account API
        notificationManager.info('Account deletion is disabled in demo mode');
    }
}

// Initialize profile manager when on profile page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('profile')) {
        window.profileManager = new ProfileManager();
    }
});