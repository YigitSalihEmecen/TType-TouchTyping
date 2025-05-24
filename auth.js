// Authentication and Firebase integration
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userStats = null;
        this.initializeAuth();
    }

    async initializeAuth() {
        // Wait for Firebase to be available
        if (typeof window.auth === 'undefined') {
            setTimeout(() => this.initializeAuth(), 100);
            return;
        }

        const { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        this.provider = new GoogleAuthProvider();
        this.signInWithPopup = signInWithPopup;
        this.signOut = signOut;
        this.doc = doc;
        this.getDoc = getDoc;
        this.setDoc = setDoc;
        this.updateDoc = updateDoc;
        this.serverTimestamp = serverTimestamp;

        // Set up authentication state listener
        onAuthStateChanged(window.auth, (user) => {
            this.handleAuthStateChange(user);
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.signInWithGoogle());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async signInWithGoogle() {
        try {
            const result = await this.signInWithPopup(window.auth, this.provider);
            console.log('Successfully signed in:', result.user.displayName);
        } catch (error) {
            console.error('Sign in error:', error);
            alert('Failed to sign in. Please try again.');
        }
    }

    async logout() {
        try {
            await this.signOut(window.auth);
            console.log('Successfully signed out');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }

    async handleAuthStateChange(user) {
        const loginSection = document.getElementById('loginSection');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');

        if (user) {
            // User is signed in
            this.currentUser = user;
            
            // Update UI
            loginSection.style.display = 'none';
            userInfo.style.display = 'flex';
            userName.textContent = user.displayName || 'User';
            userAvatar.src = user.photoURL || '';

            // Load user statistics
            await this.loadUserStats();
            
            // Notify typing trainer that user is authenticated
            if (window.typingTrainer) {
                window.typingTrainer.onUserAuthenticated(this.userStats);
            }
        } else {
            // User is signed out
            this.currentUser = null;
            this.userStats = null;
            
            // Update UI
            loginSection.style.display = 'block';
            userInfo.style.display = 'none';
            
            // Notify typing trainer that user signed out
            if (window.typingTrainer) {
                window.typingTrainer.onUserSignedOut();
            }
        }
    }

    async loadUserStats() {
        if (!this.currentUser) return;

        try {
            const userDocRef = this.doc(window.db, 'users', this.currentUser.uid);
            const userDoc = await this.getDoc(userDocRef);

            if (userDoc.exists()) {
                this.userStats = userDoc.data();
                console.log('Loaded user stats:', this.userStats);
            } else {
                // Create new user document
                this.userStats = this.createDefaultUserStats();
                await this.setDoc(userDocRef, this.userStats);
                console.log('Created new user profile');
            }
        } catch (error) {
            console.error('Error loading user stats:', error);
            this.userStats = this.createDefaultUserStats();
        }
    }

    createDefaultUserStats() {
        return {
            userId: this.currentUser.uid,
            email: this.currentUser.email,
            displayName: this.currentUser.displayName,
            photoURL: this.currentUser.photoURL,
            createdAt: this.serverTimestamp(),
            lastLogin: this.serverTimestamp(),
            
            // Typing statistics
            totalWordsTyped: 0,
            totalCharactersTyped: 0,
            totalTimeSpent: 0, // in milliseconds
            sessionsCompleted: 0,
            
            // Performance metrics
            bestWPM: 0,
            averageWPM: 0,
            bestAccuracy: 100,
            averageAccuracy: 100,
            
            // Letter-specific stats (a-z)
            letterStats: this.initializeLetterStats(),
            
            // Recent sessions (last 10)
            recentSessions: [],
            
            // Achievement tracking
            achievements: [],
            streakCount: 0,
            lastSessionDate: null
        };
    }

    initializeLetterStats() {
        const stats = {};
        for (let i = 97; i <= 122; i++) {
            const letter = String.fromCharCode(i);
            stats[letter] = {
                correct: 0,
                total: 0,
                accuracy: 100
            };
        }
        return stats;
    }

    async saveUserStats(newStats) {
        if (!this.currentUser || !newStats) return;

        try {
            const userDocRef = this.doc(window.db, 'users', this.currentUser.uid);
            
            // Merge new stats with existing stats
            const updatedStats = {
                ...this.userStats,
                ...newStats,
                lastUpdated: this.serverTimestamp(),
                lastLogin: this.serverTimestamp()
            };

            await this.updateDoc(userDocRef, updatedStats);
            this.userStats = updatedStats;
            
            console.log('User stats saved successfully');
        } catch (error) {
            console.error('Error saving user stats:', error);
        }
    }

    async recordSession(sessionData) {
        if (!this.currentUser) return;

        const session = {
            timestamp: Date.now(),
            wpm: sessionData.wpm,
            accuracy: sessionData.accuracy,
            wordsTyped: sessionData.wordsTyped,
            charactersTyped: sessionData.charactersTyped,
            timeSpent: sessionData.timeSpent,
            letterStats: sessionData.letterStats
        };

        // Update user stats
        const updatedStats = {
            totalWordsTyped: this.userStats.totalWordsTyped + sessionData.wordsTyped,
            totalCharactersTyped: this.userStats.totalCharactersTyped + sessionData.charactersTyped,
            totalTimeSpent: this.userStats.totalTimeSpent + sessionData.timeSpent,
            sessionsCompleted: this.userStats.sessionsCompleted + 1,
            bestWPM: Math.max(this.userStats.bestWPM, sessionData.wpm),
            bestAccuracy: Math.max(this.userStats.bestAccuracy, sessionData.accuracy),
            letterStats: this.mergeLeterStats(this.userStats.letterStats, sessionData.letterStats),
            recentSessions: [session, ...this.userStats.recentSessions.slice(0, 9)] // Keep last 10
        };

        // Calculate averages
        updatedStats.averageWPM = Math.round(
            this.userStats.recentSessions.reduce((sum, s) => sum + s.wpm, sessionData.wpm) / 
            Math.min(this.userStats.recentSessions.length + 1, 10)
        );

        updatedStats.averageAccuracy = Math.round(
            this.userStats.recentSessions.reduce((sum, s) => sum + s.accuracy, sessionData.accuracy) / 
            Math.min(this.userStats.recentSessions.length + 1, 10)
        );

        await this.saveUserStats(updatedStats);
    }

    mergeLeterStats(existingStats, newStats) {
        const merged = { ...existingStats };
        
        for (const letter in newStats) {
            if (merged[letter]) {
                merged[letter].correct += newStats[letter].correct;
                merged[letter].total += newStats[letter].total;
                merged[letter].accuracy = merged[letter].total > 0 ? 
                    Math.round((merged[letter].correct / merged[letter].total) * 100) : 100;
            }
        }
        
        return merged;
    }

    getUserStats() {
        return this.userStats;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
}); 