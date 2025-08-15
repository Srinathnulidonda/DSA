// profile.js - Profile page functionality

let profileData = null;

// Initialize profile page
document.addEventListener('DOMContentLoaded', async () => {
    await loadProfileData();
    setupEventListeners();
});

// Load profile data
async function loadProfileData() {
    try {
        window.DSAApp.showLoader();

        const response = await window.API.getProfile();
        profileData = response.data;

        updateProfileUI(profileData);

    } catch (error) {
        console.error('Failed to load profile:', error);
        window.DSAApp.showToast('Failed to load profile data', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
}

// Update profile UI
function updateProfileUI(data) {
    // Update user info
    document.querySelector('.profile-name').textContent = data.user.username;
    document.querySelector('.profile-username').textContent = `@${data.user.username}`;
    document.querySelector('.profile-email').textContent = data.user.email;
    document.querySelector('.profile-avatar').src = data.user.avatar_url || `https://ui-avatars.com/api/?name=${data.user.username}&background=3B82F6&color=fff`;

    // Update stats
    document.querySelector('.streak-count').textContent = data.streak.current;
    document.querySelector('.achievements-count').textContent = '15'; // Mock data
    document.querySelector('.study-time').textContent = '124h'; // Mock data
    document.querySelector('.problems-solved').textContent = '156'; // Mock data

    // Update basic info
    document.querySelector('#fullName').textContent = data.user.username;
    document.querySelector('#username').textContent = `@${data.user.username}`;
    document.querySelector('#email').textContent = data.user.email;
    document.querySelector('#memberSince').textContent = new Date(data.user.created_at).toLocaleDateString();

    // Update preferences
    document.querySelector('#preferredLanguage').textContent = data.preferences.preferred_language;
    document.querySelector('#dailyGoal').textContent = `${data.preferences.daily_goal_minutes / 60} hours`;
    document.querySelector('#studyTime').textContent = getStudyTimePreference();
    document.querySelector('#difficultyLevel').textContent = 'Intermediate'; // Mock data
}

// Change avatar
window.changeAvatar = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size
        if (file.size > 5 * 1024 * 1024) {
            window.DSAApp.showToast('File size must be less than 5MB', 'error');
            return;
        }

        try {
            window.DSAApp.showLoader();

            const response = await window.API.uploadAvatar(file);
            const avatarUrl = response.data.avatar_url;

            // Update UI
            document.querySelectorAll('.profile-avatar').forEach(img => {
                img.src = avatarUrl;
            });

            window.DSAApp.showToast('Avatar updated successfully', 'success');

        } catch (error) {
            console.error('Failed to upload avatar:', error);
            window.DSAApp.showToast('Failed to upload avatar', 'error');
        } finally {
            window.DSAApp.hideLoader();
        }
    };

    input.click();
};

// Edit profile
window.editProfile = function () {
    // Create edit modal
    const modalHTML = `
        <div class="modal fade" id="editProfileModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Edit Profile</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editProfileForm">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control" name="username" value="${profileData.user.username}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" value="${profileData.user.email}" disabled>
                                <small class="text-muted">Email cannot be changed</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Bio</label>
                                <textarea class="form-control" name="bio" rows="3" placeholder="Tell us about yourself..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Location</label>
                                <input type="text" class="form-control" name="location" placeholder="City, Country">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Website</label>
                                <input type="url" class="form-control" name="website" placeholder="https://example.com">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveProfile()">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('editProfileModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();
};

// Save profile
window.saveProfile = async function () {
    const form = document.getElementById('editProfileForm');
    const formData = new FormData(form);

    const profileUpdate = {
        username: formData.get('username'),
        bio: formData.get('bio'),
        location: formData.get('location'),
        website: formData.get('website')
    };

    try {
        window.DSAApp.showLoader();

        await window.API.updateProfile(profileUpdate);

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();

        window.DSAApp.showToast('Profile updated successfully', 'success');

        // Reload profile data
        await loadProfileData();

    } catch (error) {
        console.error('Failed to update profile:', error);
        window.DSAApp.showToast('Failed to update profile', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Get study time preference
function getStudyTimePreference() {
    // This would be calculated based on user's activity patterns
    return 'Morning (6 AM - 9 AM)';
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    const tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabLinks.forEach(link => {
        link.addEventListener('shown.bs.tab', (e) => {
            const tabId = e.target.getAttribute('href');
            loadTabContent(tabId);
        });
    });
}

// Load tab content
async function loadTabContent(tabId) {
    switch (tabId) {
        case '#achievements':
            await loadAchievements();
            break;
        case '#activity':
            await loadActivityHistory();
            break;
        case '#statistics':
            await loadStatistics();
            break;
    }
}

// Load achievements
async function loadAchievements() {
    // This would load from API
    const achievements = [
        { id: 'streak-7', name: 'Week Warrior', description: '7 day streak', unlocked: true, icon: 'fire' },
        { id: 'streak-30', name: 'Fire Starter', description: '30 day streak', unlocked: true, icon: 'fire' },
        { id: 'problems-10', name: 'Problem Solver', description: 'Solve 10 problems', unlocked: true, icon: 'code' },
        { id: 'problems-50', name: 'Code Master', description: 'Solve 50 problems', unlocked: true, icon: 'code' },
        { id: 'week-complete', name: 'Week Complete', description: 'Complete a full week', unlocked: true, icon: 'calendar-check' },
        { id: 'early-bird', name: 'Early Bird', description: 'Study before 6 AM', unlocked: false, icon: 'sun' }
    ];

    const container = document.getElementById('achievementsContainer');
    if (!container) return;

    container.innerHTML = achievements.map(achievement => `
        <div class="col-md-2 col-4 mb-3 text-center">
            <div class="achievement-badge ${achievement.unlocked ? '' : 'locked'}">
                <i class="fas fa-${achievement.icon} fs-2 ${achievement.unlocked ? 'text-warning' : 'text-muted'}"></i>
                <p class="small fw-semibold mb-0 mt-2">${achievement.name}</p>
                <small class="text-muted">${achievement.description}</small>
            </div>
        </div>
    `).join('');
}

// Load activity history
async function loadActivityHistory() {
    try {
        const response = await window.API.getProgress();
        const activities = response.data.recent_activity || [];

        const container = document.getElementById('activityContainer');
        if (!container) return;

        container.innerHTML = activities.map(activity => `
            <div class="activity-item d-flex align-items-start mb-3 p-3 bg-light rounded-3">
                <div class="activity-icon me-3">
                    <i class="fas fa-${getActivityIcon(activity.type)} text-${getActivityColor(activity.type)}"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${activity.title}</h6>
                    <small class="text-muted">${formatTimeAgo(activity.created_at)}</small>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Failed to load activity history:', error);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await window.API.getAnalytics(30);
        // Render statistics charts
        // This would create charts using Chart.js
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

// Helper functions
function getActivityIcon(type) {
    const icons = {
        'completed': 'check-circle',
        'achievement': 'trophy',
        'note': 'sticky-note',
        'streak': 'fire'
    };
    return icons[type] || 'circle';
}

function getActivityColor(type) {
    const colors = {
        'completed': 'success',
        'achievement': 'warning',
        'note': 'info',
        'streak': 'danger'
    };
    return colors[type] || 'secondary';
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;

    return date.toLocaleDateString();
}