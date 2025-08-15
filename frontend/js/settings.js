// settings.js - Settings page functionality

let currentSettings = {};

// Initialize settings page
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
});

// Load settings
async function loadSettings() {
    try {
        window.DSAApp.showLoader();

        const response = await window.API.getSettings();
        currentSettings = response.data;

        populateSettings(currentSettings);

    } catch (error) {
        console.error('Failed to load settings:', error);
        window.DSAApp.showToast('Failed to load settings', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
}

// Populate settings form
function populateSettings(settings) {
    // Account settings
    document.querySelector('input[value="johndoe"]').value = settings.account.username;
    document.querySelector('input[type="email"]').value = settings.account.email;

    // Preferences
    document.querySelector('select[name="theme"]').value = settings.preferences.theme;
    document.querySelector('select[name="language"]').value = settings.preferences.preferred_language;
    document.querySelector('input[name="dailyGoal"]').value = settings.preferences.daily_goal_minutes;

    // Set layout radio
    const layoutRadio = document.querySelector(`input[name="layout"][value="${settings.preferences.layout}"]`);
    if (layoutRadio) layoutRadio.checked = true;

    // Notifications
    document.getElementById('emailProgress').checked = settings.preferences.email_notifications;
    document.getElementById('emailStreak').checked = settings.preferences.email_notifications;
    document.getElementById('pushStudy').checked = settings.preferences.push_notifications;
    document.getElementById('pushPomodoro').checked = settings.preferences.push_notifications;
}

// Save account settings
window.saveAccountSettings = async function () {
    const username = document.querySelector('input[value="johndoe"]').value;

    try {
        window.DSAApp.showLoader();

        await window.API.updateProfile({ username });

        window.DSAApp.showToast('Account settings updated', 'success');

    } catch (error) {
        console.error('Failed to update account settings:', error);
        window.DSAApp.showToast('Failed to update settings', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Save preferences
window.savePreferences = async function () {
    const preferences = {
        theme: document.querySelector('select[name="theme"]').value,
        preferred_language: document.querySelector('select[name="language"]').value,
        daily_goal_minutes: parseInt(document.querySelector('input[name="dailyGoal"]').value),
        layout: document.querySelector('input[name="layout"]:checked').value
    };

    try {
        window.DSAApp.showLoader();

        await window.API.updateProfile({ preferences });

        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', preferences.theme);
        localStorage.setItem('dsa_theme', preferences.theme);

        window.DSAApp.showToast('Preferences updated', 'success');

    } catch (error) {
        console.error('Failed to update preferences:', error);
        window.DSAApp.showToast('Failed to update preferences', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Save notification settings
window.saveNotifications = async function () {
    const preferences = {
        email_notifications: document.getElementById('emailProgress').checked,
        push_notifications: document.getElementById('pushStudy').checked
    };

    try {
        window.DSAApp.showLoader();

        await window.API.updateProfile({ preferences });

        window.DSAApp.showToast('Notification settings updated', 'success');

    } catch (error) {
        console.error('Failed to update notifications:', error);
        window.DSAApp.showToast('Failed to update notifications', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Change password
window.changePassword = function () {
    const modalHTML = `
        <div class="modal fade" id="changePasswordModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Change Password</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="changePasswordForm">
                            <div class="mb-3">
                                <label class="form-label">Current Password</label>
                                <input type="password" class="form-control" name="currentPassword" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">New Password</label>
                                <input type="password" class="form-control" name="newPassword" minlength="8" required>
                                <div class="progress mt-2" style="height: 5px;">
                                    <div id="passwordStrength" class="progress-bar" role="progressbar"></div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Confirm New Password</label>
                                <input type="password" class="form-control" name="confirmPassword" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="submitPasswordChange()">Change Password</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();

    // Add password strength checker
    document.querySelector('input[name="newPassword"]').addEventListener('input', checkPasswordStrength);
};

// Submit password change
window.submitPasswordChange = async function () {
    const form = document.getElementById('changePasswordForm');
    const formData = new FormData(form);

    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
        window.DSAApp.showToast('Passwords do not match', 'error');
        return;
    }

    try {
        window.DSAApp.showLoader();

        // API call to change password
        await window.API.changePassword({
            current_password: formData.get('currentPassword'),
            new_password: formData.get('newPassword')
        });

        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();

        window.DSAApp.showToast('Password changed successfully', 'success');

    } catch (error) {
        console.error('Failed to change password:', error);
        window.DSAApp.showToast('Failed to change password', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Enable 2FA
window.enable2FA = async function () {
    const isEnabled = document.getElementById('2fa').checked;

    if (isEnabled) {
        // Show 2FA setup modal
        show2FASetupModal();
    } else {
        // Disable 2FA
        try {
            await window.API.disable2FA();
            window.DSAApp.showToast('Two-factor authentication disabled', 'success');
        } catch (error) {
            console.error('Failed to disable 2FA:', error);
            window.DSAApp.showToast('Failed to disable 2FA', 'error');
            document.getElementById('2fa').checked = true;
        }
    }
};

// Show 2FA setup modal
function show2FASetupModal() {
    const modalHTML = `
        <div class="modal fade" id="2faModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Setup Two-Factor Authentication</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <p>Scan this QR code with your authenticator app:</p>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/DSA%20Mastery:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DSA%20Mastery" 
                             alt="2FA QR Code" class="mb-3">
                        <p>Or enter this code manually:</p>
                        <code class="fs-5">JBSWY3DPEHPK3PXP</code>
                        
                        <div class="mt-4">
                            <label class="form-label">Enter verification code:</label>
                            <input type="text" class="form-control text-center" id="verificationCode" maxlength="6" pattern="[0-9]{6}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="verify2FA()">Verify & Enable</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('2faModal'));
    modal.show();

    modal._element.addEventListener('hidden.bs.modal', () => {
        if (!document.getElementById('2fa').dataset.verified) {
            document.getElementById('2fa').checked = false;
        }
        document.getElementById('2faModal').remove();
    });
}

// Verify 2FA
window.verify2FA = async function () {
    const code = document.getElementById('verificationCode').value;

    if (!/^\d{6}$/.test(code)) {
        window.DSAApp.showToast('Please enter a valid 6-digit code', 'error');
        return;
    }

    try {
        window.DSAApp.showLoader();

        // API call to verify and enable 2FA
        await window.API.enable2FA({ code });

        document.getElementById('2fa').dataset.verified = 'true';
        bootstrap.Modal.getInstance(document.getElementById('2faModal')).hide();

        window.DSAApp.showToast('Two-factor authentication enabled successfully', 'success');

    } catch (error) {
        console.error('Failed to enable 2FA:', error);
        window.DSAApp.showToast('Invalid verification code', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Export data
window.exportData = async function () {
    try {
        window.DSAApp.showLoader();
        window.DSAApp.showToast('Preparing your data export...', 'info');

        // API call to request data export
        const response = await window.API.exportUserData();
        const exportUrl = response.data.download_url;

        // Download the file
        const a = document.createElement('a');
        a.href = exportUrl;
        a.download = `dsa-mastery-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        window.DSAApp.showToast('Data exported successfully', 'success');

    } catch (error) {
        console.error('Failed to export data:', error);
        window.DSAApp.showToast('Failed to export data', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Delete account
window.deleteAccount = function () {
    Components.Modal.confirm({
        title: 'Delete Account',
        message: 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
        confirmText: 'Delete Account',
        confirmVariant: 'danger'
    }).then(async (confirmed) => {
        if (confirmed) {
            try {
                window.DSAApp.showLoader();

                await window.API.deleteAccount();

                // Clear local storage and redirect
                localStorage.clear();
                window.location.href = '/';

            } catch (error) {
                console.error('Failed to delete account:', error);
                window.DSAApp.showToast('Failed to delete account', 'error');
                window.DSAApp.hideLoader();
            }
        }
    });
};

// Check password strength
function checkPasswordStrength(event) {
    const password = event.target.value;
    let strength = 0;
    const strengthBar = document.getElementById('passwordStrength');

    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;

    const strengthPercent = (strength / 5) * 100;
    strengthBar.style.width = strengthPercent + '%';

    if (strength < 2) {
        strengthBar.className = 'progress-bar bg-danger';
    } else if (strength < 4) {
        strengthBar.className = 'progress-bar bg-warning';
    } else {
        strengthBar.className = 'progress-bar bg-success';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Theme preview
    document.querySelector('select[name="theme"]')?.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.value);
    });

    // Save buttons
    document.querySelectorAll('.save-section').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            switch (section) {
                case 'account':
                    saveAccountSettings();
                    break;
                case 'preferences':
                    savePreferences();
                    break;
                case 'notifications':
                    saveNotifications();
                    break;
            }
        });
    });

    // Privacy settings
    document.getElementById('dataSharing')?.addEventListener('change', updatePrivacySettings);
    document.getElementById('profileVisibility')?.addEventListener('change', updatePrivacySettings);
}

// Update privacy settings
async function updatePrivacySettings() {
    const privacy = {
        data_sharing: document.getElementById('dataSharing').checked,
        profile_visibility: document.getElementById('profileVisibility').value
    };

    try {
        await window.API.updatePrivacySettings(privacy);
        window.DSAApp.showToast('Privacy settings updated', 'success');
    } catch (error) {
        console.error('Failed to update privacy settings:', error);
        window.DSAApp.showToast('Failed to update privacy settings', 'error');
    }
}