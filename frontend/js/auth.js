// auth.js - Authentication handling

// Login Function
async function login(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const loginData = {
        login: formData.get('email'),
        password: formData.get('password')
    };

    try {
        showLoader();

        const response = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
        const { user, access_token, refresh_token } = response.data;

        // Store tokens and user data
        localStorage.setItem(AUTH_TOKEN_KEY, access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        showToast('Login successful! Redirecting...', 'success');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);

        if (error.response?.status === 401) {
            showToast('Invalid email or password', 'error');
        } else if (error.response?.status === 429) {
            showToast('Too many login attempts. Please try again later.', 'error');
        } else {
            showToast('Login failed. Please try again.', 'error');
        }
    } finally {
        hideLoader();
    }
}

// Register Function
async function register(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Validate passwords match
    if (formData.get('password') !== formData.get('confirmPassword')) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const registerData = {
        email: formData.get('email'),
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        showLoader();

        const response = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
        const { user, access_token, refresh_token } = response.data;

        // Store tokens and user data
        localStorage.setItem(AUTH_TOKEN_KEY, access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        showToast('Registration successful! Welcome aboard!', 'success');

        // Show onboarding modal or redirect
        setTimeout(() => {
            window.location.href = '/dashboard.html?onboarding=true';
        }, 1000);

    } catch (error) {
        console.error('Registration error:', error);

        if (error.response?.status === 409) {
            showToast('Email or username already exists', 'error');
        } else if (error.response?.status === 400) {
            showToast(error.response.data.message || 'Invalid registration data', 'error');
        } else {
            showToast('Registration failed. Please try again.', 'error');
        }
    } finally {
        hideLoader();
    }
}

// Forgot Password Function
async function forgotPassword(event) {
    event.preventDefault();

    const form = event.target;
    const email = form.email.value;

    try {
        showLoader();

        await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });

        showToast('Password reset link sent to your email', 'success');

        // Show success message
        document.getElementById('forgotPasswordForm').style.display = 'none';
        document.getElementById('forgotPasswordSuccess').style.display = 'block';

    } catch (error) {
        console.error('Forgot password error:', error);

        if (error.response?.status === 429) {
            showToast('Too many requests. Please try again later.', 'error');
        } else {
            showToast('Failed to send reset email. Please try again.', 'error');
        }
    } finally {
        hideLoader();
    }
}

// Reset Password Function
async function resetPassword(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showToast('Invalid reset link', 'error');
        return;
    }

    // Validate passwords match
    if (formData.get('password') !== formData.get('confirmPassword')) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        showLoader();

        await axios.post(`${API_BASE_URL}/auth/reset-password`, {
            token,
            password: formData.get('password')
        });

        showToast('Password reset successful! Redirecting to login...', 'success');

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);

    } catch (error) {
        console.error('Reset password error:', error);

        if (error.response?.status === 400) {
            showToast('Invalid or expired reset link', 'error');
        } else {
            showToast('Failed to reset password. Please try again.', 'error');
        }
    } finally {
        hideLoader();
    }
}

// Social Login Functions
async function loginWithGoogle() {
    try {
        // Initialize Google Sign-In
        const auth2 = gapi.auth2.getAuthInstance();
        const googleUser = await auth2.signIn();
        const idToken = googleUser.getAuthResponse().id_token;

        const response = await axios.post(`${API_BASE_URL}/auth/google`, { idToken });
        handleSocialLoginSuccess(response.data);

    } catch (error) {
        console.error('Google login error:', error);
        showToast('Google login failed', 'error');
    }
}

async function loginWithGitHub() {
    // Redirect to GitHub OAuth
    const clientId = 'your-github-client-id';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/github/callback`);
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
}

function handleSocialLoginSuccess(data) {
    const { user, access_token, refresh_token } = data;

    localStorage.setItem(AUTH_TOKEN_KEY, access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    showToast('Login successful!', 'success');

    setTimeout(() => {
        window.location.href = '/dashboard.html';
    }, 1000);
}

// Password Strength Checker
function checkPasswordStrength(password) {
    let strength = 0;
    const strengthBar = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('passwordStrengthText');

    if (!strengthBar || !strengthText) return;

    // Check password strength
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;

    // Update UI
    const strengthPercent = (strength / 5) * 100;
    strengthBar.style.width = strengthPercent + '%';

    if (strength < 2) {
        strengthBar.className = 'progress-bar bg-danger';
        strengthText.textContent = 'Weak';
        strengthText.className = 'text-danger';
    } else if (strength < 4) {
        strengthBar.className = 'progress-bar bg-warning';
        strengthText.textContent = 'Medium';
        strengthText.className = 'text-warning';
    } else {
        strengthBar.className = 'progress-bar bg-success';
        strengthText.textContent = 'Strong';
        strengthText.className = 'text-success';
    }
}

// Form Validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateUsername(username) {
    // Username should be 3-20 characters, alphanumeric and underscore only
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
}

// Initialize auth page
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', register);

        // Password strength checker
        const passwordInput = registerForm.querySelector('input[name="password"]');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => checkPasswordStrength(e.target.value));
        }
    }

    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', forgotPassword);
    }

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', resetPassword);
    }

    // Show/hide password toggle
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function () {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
});