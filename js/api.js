// API Module for Firebase and External Services
const API = {
    firebaseConfig: {
        apiKey: "AIzaSyBXmZvRrn6EPsVJHNw0R0vCpG_pKgJ5GdY",
        authDomain: "dsa-learning-dashboard.firebaseapp.com",
        databaseURL: "https://dsa-learning-dashboard-default-rtdb.firebaseio.com",
        projectId: "dsa-learning-dashboard",
        storageBucket: "dsa-learning-dashboard.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef123456789012345"
    },

    isInitialized: false,
    currentUser: null,

    // Initialize Firebase
    init: async function () {
        try {
            if (!this.isInitialized && typeof firebase !== 'undefined') {
                firebase.initializeApp(this.firebaseConfig);
                this.isInitialized = true;

                // Set up auth state listener
                firebase.auth().onAuthStateChanged((user) => {
                    this.currentUser = user;
                    if (user) {
                        console.log('User authenticated:', user.uid);
                        this.syncUserData();
                    }
                });
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    },

    // Anonymous authentication
    authenticateAnonymously: async function () {
        try {
            const result = await firebase.auth().signInAnonymously();
            return result.user;
        } catch (error) {
            console.error('Authentication error:', error);
            return null;
        }
    },

    // Save progress to Firebase
    saveProgress: async function (userId, progress) {
        if (!this.isInitialized) return false;

        try {
            const database = firebase.database();
            await database.ref(`users/${userId}/progress`).set({
                ...progress,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            console.error('Error saving progress:', error);
            return false;
        }
    },

    // Load progress from Firebase
    loadProgress: async function (userId) {
        if (!this.isInitialized) return null;

        try {
            const database = firebase.database();
            const snapshot = await database.ref(`users/${userId}/progress`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error loading progress:', error);
            return null;
        }
    },

    // Save note to Firebase
    saveNote: async function (userId, note) {
        if (!this.isInitialized) return false;

        try {
            const database = firebase.database();
            await database.ref(`users/${userId}/notes/${note.id}`).set(note);
            return true;
        } catch (error) {
            console.error('Error saving note:', error);
            return false;
        }
    },

    // Delete note from Firebase
    deleteNote: async function (userId, noteId) {
        if (!this.isInitialized) return false;

        try {
            const database = firebase.database();
            await database.ref(`users/${userId}/notes/${noteId}`).remove();
            return true;
        } catch (error) {
            console.error('Error deleting note:', error);
            return false;
        }
    },

    // Get all notes from Firebase
    getNotes: async function (userId) {
        if (!this.isInitialized) return [];

        try {
            const database = firebase.database();
            const snapshot = await database.ref(`users/${userId}/notes`).once('value');
            const notes = snapshot.val() || {};
            return Object.values(notes);
        } catch (error) {
            console.error('Error getting notes:', error);
            return [];
        }
    },

    // Sync user data
    syncUserData: async function () {
        if (!this.currentUser) return;

        try {
            // Load progress from Firebase
            const cloudProgress = await this.loadProgress(this.currentUser.uid);

            if (cloudProgress) {
                // Merge with local progress
                const localProgress = Utils.storage.get('dsaProgress');
                const mergedProgress = this.mergeProgress(localProgress, cloudProgress);

                // Save merged progress
                Utils.storage.set('dsaProgress', mergedProgress);

                // Update UI
                if (window.app) {
                    window.app.userProgress = mergedProgress;
                    Progress.updateUI(mergedProgress);
                }
            }
        } catch (error) {
            console.error('Error syncing user data:', error);
        }
    },

    // Merge progress data
    mergeProgress: function (local, cloud) {
        if (!local) return cloud;
        if (!cloud) return local;

        // Use the most recent data
        const localDate = new Date(local.lastUpdated || 0);
        const cloudDate = new Date(cloud.lastUpdated || 0);

        if (localDate > cloudDate) {
            return local;
        } else {
            return cloud;
        }
    },

    // Set up real-time listeners
    setupRealtimeSync: function (userId) {
        if (!this.isInitialized) return;

        const database = firebase.database();

        // Listen for progress changes
        database.ref(`users/${userId}/progress`).on('value', (snapshot) => {
            const progress = snapshot.val();
            if (progress && window.app) {
                window.app.userProgress = progress;
                Progress.updateUI(progress);
            }
        });

        // Listen for notes changes
        database.ref(`users/${userId}/notes`).on('value', (snapshot) => {
            const notes = snapshot.val();
            if (notes && window.app) {
                window.app.userProgress.notes = Object.values(notes);
                Notes.displaySaved(window.app.userProgress);
            }
        });
    },

    // Fetch learning resources from external API
    fetchResources: async function (topic) {
        // This is a placeholder for external API integration
        // In production, you might integrate with educational APIs
        try {
            // Example: fetch from a hypothetical DSA resources API
            const response = await fetch(`https://api.example.com/dsa/resources?topic=${topic}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching resources:', error);
        }
        return [];
    },

    // Get GitHub repository info
    getGitHubInfo: async function (repo) {
        try {
            const response = await fetch(`https://api.github.com/repos/${repo}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching GitHub info:', error);
        }
        return null;
    },

    // Submit feedback
    submitFeedback: async function (feedback) {
        if (!this.isInitialized) return false;

        try {
            const database = firebase.database();
            await database.ref('feedback').push({
                ...feedback,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                userId: this.currentUser ? this.currentUser.uid : 'anonymous'
            });
            return true;
        } catch (error) {
            console.error('Error submitting feedback:', error);
            return false;
        }
    },

    // Get leaderboard data
    getLeaderboard: async function (limit = 10) {
        if (!this.isInitialized) return [];

        try {
            const database = firebase.database();
            const snapshot = await database.ref('leaderboard')
                .orderByChild('score')
                .limitToLast(limit)
                .once('value');

            const leaderboard = [];
            snapshot.forEach((child) => {
                leaderboard.push({
                    id: child.key,
                    ...child.val()
                });
            });

            return leaderboard.reverse();
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    },

    // Update user score
    updateScore: async function (userId, score) {
        if (!this.isInitialized) return false;

        try {
            const database = firebase.database();
            await database.ref(`leaderboard/${userId}`).set({
                score: score,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            console.error('Error updating score:', error);
            return false;
        }
    },

    // Backup data
    backupData: async function (userId) {
        if (!this.isInitialized) return null;

        try {
            const database = firebase.database();
            const snapshot = await database.ref(`users/${userId}`).once('value');
            const userData = snapshot.val();

            if (userData) {
                // Create backup
                await database.ref(`backups/${userId}/${Date.now()}`).set(userData);
                return userData;
            }
        } catch (error) {
            console.error('Error backing up data:', error);
        }
        return null;
    },

    // Restore from backup
    restoreFromBackup: async function (userId, backupId) {
        if (!this.isInitialized) return false;

        try {
            const database = firebase.database();
            const snapshot = await database.ref(`backups/${userId}/${backupId}`).once('value');
            const backupData = snapshot.val();

            if (backupData) {
                // Restore data
                await database.ref(`users/${userId}`).set(backupData);
                return true;
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
        }
        return false;
    }
};

// Export API module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}