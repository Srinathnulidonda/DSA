// Authentication Service
class AuthenticationService {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.authStateChangeListeners = [];
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.sessionTimer = null;
        this.refreshTokenTimer = null;

        this.initializeFirebase();
        this.setupSessionManagement();
    }

    async initializeFirebase() {
        try {
            // Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyCexample",
                authDomain: "dsa-learning.firebaseapp.com",
                projectId: "dsa-learning",
                storageBucket: "dsa-learning.appspot.com",
                messagingSenderId: "123456789",
                appId: "1:123456789:web:abc123def456"
            };

            // Initialize Firebase if not already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            // Set up auth state listener
            firebase.auth().onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });

            // Configure auth settings
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

            this.isInitialized = true;
            console.log('✅ Firebase Authentication initialized');

        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.isInitialized = false;
        }
    }

    setupSessionManagement() {
        // Set up automatic session refresh
        this.startSessionTimer();

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentUser) {
                this.refreshSession();
            }
        });

        // Handle window focus
        window.addEventListener('focus', () => {
            if (this.currentUser) {
                this.refreshSession();
            }
        });
    }

    startSessionTimer() {
        this.clearSessionTimer();

        this.sessionTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.sessionTimeout);
    }

    clearSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    async handleSessionTimeout() {
        console.log('Session timeout, refreshing...');

        try {
            await this.refreshSession();
        } catch (error) {
            console.error('Session refresh failed:', error);
            this.logout();
        }
    }

    async refreshSession() {
        if (!this.currentUser) return;

        try {
            // Force token refresh
            await this.currentUser.getIdToken(true);

            // Restart session timer
            this.startSessionTimer();

            console.log('✅ Session refreshed successfully');
        } catch (error) {
            console.error('❌ Session refresh failed:', error);
            throw error;
        }
    }

    handleAuthStateChange(user) {
        const previousUser = this.currentUser;
        this.currentUser = user;

        if (user) {
            console.log('✅ User signed in:', user.email);

            // Start session management
            this.startSessionTimer();

            // Get and store ID token
            this.updateAuthToken();

            // Update user profile
            this.updateUserProfile(user);

        } else {
            console.log('👋 User signed out');

            // Clear session management
            this.clearSessionTimer();

            // Clear stored token
            this.clearAuthToken();
        }

        // Notify listeners
        this.notifyAuthStateChange(user, previousUser);
    }

    async updateAuthToken() {
        if (!this.currentUser) return;

        try {
            const token = await this.currentUser.getIdToken();

            // Store token in API service
            if (window.DSAApp && window.DSAApp.api) {
                window.DSAApp.api.setAuthToken(token);
            }

            // Store in localStorage
            localStorage.setItem('authToken', token);

        } catch (error) {
            console.error('Error getting ID token:', error);
        }
    }

    clearAuthToken() {
        if (window.DSAApp && window.DSAApp.api) {
            window.DSAApp.api.clearAuthToken();
        }
        localStorage.removeItem('authToken');
    }

    async updateUserProfile(user) {
        try {
            const profile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                lastSignIn: new Date().toISOString()
            };

            // Store in localStorage
            localStorage.setItem('userProfile', JSON.stringify(profile));

            console.log('✅ User profile updated');
        } catch (error) {
            console.error('Error updating user profile:', error);
        }
    }

    // Authentication Methods
    async signUp(email, password, displayName = '') {
        try {
            if (!this.isInitialized) {
                throw new Error('Authentication service not initialized');
            }

            // Create user account
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update profile with display name
            if (displayName) {
                await user.updateProfile({
                    displayName: displayName
                });
            }

            // Send email verification
            await this.sendEmailVerification();

            // Register with backend
            await this.registerWithBackend(user, displayName);

            console.log('✅ User account created successfully');

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                }
            };

        } catch (error) {
            console.error('❌ Sign up failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async signIn(email, password) {
        try {
            if (!this.isInitialized) {
                throw new Error('Authentication service not initialized');
            }

            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Login with backend
            await this.loginWithBackend(user);

            console.log('✅ User signed in successfully');

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                }
            };

        } catch (error) {
            console.error('❌ Sign in failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async signInWithGoogle() {
        try {
            if (!this.isInitialized) {
                throw new Error('Authentication service not initialized');
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            const userCredential = await firebase.auth().signInWithPopup(provider);
            const user = userCredential.user;

            // Check if this is a new user
            const isNewUser = userCredential.additionalUserInfo?.isNewUser;

            if (isNewUser) {
                await this.registerWithBackend(user, user.displayName);
            } else {
                await this.loginWithBackend(user);
            }

            console.log('✅ Google sign in successful');

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                },
                isNewUser
            };

        } catch (error) {
            console.error('❌ Google sign in failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async signInWithGitHub() {
        try {
            if (!this.isInitialized) {
                throw new Error('Authentication service not initialized');
            }

            const provider = new firebase.auth.GithubAuthProvider();
            provider.addScope('user:email');

            const userCredential = await firebase.auth().signInWithPopup(provider);
            const user = userCredential.user;

            const isNewUser = userCredential.additionalUserInfo?.isNewUser;

            if (isNewUser) {
                await this.registerWithBackend(user, user.displayName);
            } else {
                await this.loginWithBackend(user);
            }

            console.log('✅ GitHub sign in successful');

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                },
                isNewUser
            };

        } catch (error) {
            console.error('❌ GitHub sign in failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async logout() {
        try {
            // Sign out from Firebase
            await firebase.auth().signOut();

            // Clear local data
            this.clearSessionTimer();
            this.clearAuthToken();
            localStorage.removeItem('userProfile');

            // Clear app data
            if (window.DSAApp && window.DSAApp.storage) {
                window.DSAApp.storage.clear();
            }

            console.log('✅ User signed out successfully');

            return { success: true };

        } catch (error) {
            console.error('❌ Sign out failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async resetPassword(email) {
        try {
            if (!this.isInitialized) {
                throw new Error('Authentication service not initialized');
            }

            await firebase.auth().sendPasswordResetEmail(email);

            console.log('✅ Password reset email sent');

            return { success: true };

        } catch (error) {
            console.error('❌ Password reset failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('No user signed in');
            }

            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                currentPassword
            );

            await this.currentUser.reauthenticateWithCredential(credential);

            // Update password
            await this.currentUser.updatePassword(newPassword);

            console.log('✅ Password changed successfully');

            return { success: true };

        } catch (error) {
            console.error('❌ Password change failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async updateProfile(profileData) {
        try {
            if (!this.currentUser) {
                throw new Error('No user signed in');
            }

            // Update Firebase profile
            await this.currentUser.updateProfile(profileData);

            // Update backend profile
            if (window.DSAApp && window.DSAApp.api) {
                await window.DSAApp.api.updateUserProfile(profileData);
            }

            // Update local profile
            this.updateUserProfile(this.currentUser);

            console.log('✅ Profile updated successfully');

            return { success: true };

        } catch (error) {
            console.error('❌ Profile update failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async sendEmailVerification() {
        try {
            if (!this.currentUser) {
                throw new Error('No user signed in');
            }

            await this.currentUser.sendEmailVerification();

            console.log('✅ Email verification sent');

            return { success: true };

        } catch (error) {
            console.error('❌ Email verification failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async deleteAccount(password) {
        try {
            if (!this.currentUser) {
                throw new Error('No user signed in');
            }

            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                password
            );

            await this.currentUser.reauthenticateWithCredential(credential);

            // Delete from backend first
            if (window.DSAApp && window.DSAApp.api) {
                await window.DSAApp.api.deleteAccount();
            }

            // Delete Firebase account
            await this.currentUser.delete();

            console.log('✅ Account deleted successfully');

            return { success: true };

        } catch (error) {
            console.error('❌ Account deletion failed:', error);

            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // Backend Integration
    async registerWithBackend(user, displayName) {
        try {
            const token = await user.getIdToken();

            if (window.DSAApp && window.DSAApp.api) {
                window.DSAApp.api.setAuthToken(token);

                await window.DSAApp.api.register({
                    email: user.email,
                    displayName: displayName || '',
                    provider: 'firebase'
                });
            }

        } catch (error) {
            console.error('Backend registration failed:', error);
            throw error;
        }
    }

    async loginWithBackend(user) {
        try {
            const token = await user.getIdToken();

            if (window.DSAApp && window.DSAApp.api) {
                window.DSAApp.api.setAuthToken(token);

                await window.DSAApp.api.login({
                    token: token
                });
            }

        } catch (error) {
            console.error('Backend login failed:', error);
            throw error;
        }
    }

    // Utility Methods
    async checkAuthStatus() {
        return new Promise((resolve) => {
            if (!this.isInitialized) {
                resolve(false);
                return;
            }

            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                resolve(!!user);
            });
        });
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isSignedIn() {
        return !!this.currentUser;
    }

    isEmailVerified() {
        return this.currentUser?.emailVerified || false;
    }

    async getIdToken(forceRefresh = false) {
        if (!this.currentUser) {
            throw new Error('No user signed in');
        }

        return await this.currentUser.getIdToken(forceRefresh);
    }

    getUserProfile() {
        const stored = localStorage.getItem('userProfile');
        return stored ? JSON.parse(stored) : null;
    }

    // Event Listeners
    onAuthStateChange(callback) {
        this.authStateChangeListeners.push(callback);

        // Call immediately with current state
        callback(this.currentUser, null);

        // Return unsubscribe function
        return () => {
            const index = this.authStateChangeListeners.indexOf(callback);
            if (index > -1) {
                this.authStateChangeListeners.splice(index, 1);
            }
        };
    }

    notifyAuthStateChange(user, previousUser) {
        this.authStateChangeListeners.forEach(callback => {
            try {
                callback(user, previousUser);
            } catch (error) {
                console.error('Error in auth state change callback:', error);
            }
        });
    }

    // Error Handling
    getErrorMessage(error) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/invalid-email': 'Invalid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/requires-recent-login': 'Please sign in again to complete this action.',
            'auth/popup-closed-by-user': 'Sign-in popup was closed before completion.',
            'auth/cancelled-popup-request': 'Another popup is already open.',
            'auth/popup-blocked': 'Popup was blocked by browser. Please allow popups and try again.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/invalid-credential': 'Invalid credentials provided.',
            'auth/credential-already-in-use': 'This credential is already associated with another account.'
        };

        return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
    }

    // Social Auth Helpers
    async linkGoogleAccount() {
        try {
            if (!this.currentUser) {
                throw new Error('No user signed in');
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            await this.currentUser.linkWithPopup(provider);

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async linkGitHubAccount() {
        try {
            if (!this.currentUser) {
                throw new Error('No user signed in');
            }

            const provider = new firebase.auth.GithubAuthProvider();
            await this.currentUser.linkWithPopup(provider);

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async unlinkProvider(providerId) {
        try {
            if (!this.currentUser) {
                throw new Error('No user signed in');
            }

            await this.currentUser.unlink(providerId);

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    getLinkedProviders() {
        if (!this.currentUser) return [];

        return this.currentUser.providerData.map(provider => ({
            providerId: provider.providerId,
            uid: provider.uid,
            displayName: provider.displayName,
            email: provider.email,
            photoURL: provider.photoURL
        }));
    }
}