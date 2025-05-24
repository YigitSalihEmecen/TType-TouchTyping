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
        const statsToggle = document.getElementById('statsToggle');
        const closeStats = document.getElementById('closeStats');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.signInWithGoogle());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        if (statsToggle) {
            statsToggle.addEventListener('click', () => this.toggleStatsPanel());
        }

        if (closeStats) {
            closeStats.addEventListener('click', () => this.closeStatsPanel());
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
        const statsPanel = document.getElementById('statsPanel');
        const authContainer = document.getElementById('authContainer');

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
            statsPanel.style.display = 'none';
            authContainer.classList.remove('stats-open');
            
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

    toggleStatsPanel() {
        const statsPanel = document.getElementById('statsPanel');
        if (statsPanel.style.display === 'none' || !statsPanel.style.display) {
            this.showStatsPanel();
        } else {
            this.closeStatsPanel();
        }
    }

    showStatsPanel() {
        const statsPanel = document.getElementById('statsPanel');
        const authContainer = document.getElementById('authContainer');
        
        statsPanel.style.display = 'block';
        // Force reflow to ensure display change is applied
        statsPanel.offsetHeight;
        authContainer.classList.add('stats-open');
        statsPanel.classList.add('panel-open');
        this.updateStatsDisplay();
    }

    closeStatsPanel() {
        const statsPanel = document.getElementById('statsPanel');
        const authContainer = document.getElementById('authContainer');
        
        authContainer.classList.remove('stats-open');
        statsPanel.classList.remove('panel-open');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            statsPanel.style.display = 'none';
        }, 300);
    }

    updateStatsDisplay() {
        if (!this.userStats) return;

        // Update overview stats
        document.getElementById('bestWPM').textContent = this.userStats.bestWPM || 0;
        document.getElementById('averageWPM').textContent = this.userStats.averageWPM || 0;
        document.getElementById('totalWords').textContent = this.userStats.totalWordsTyped || 0;
        document.getElementById('totalSessions').textContent = this.userStats.sessionsCompleted || 0;
        document.getElementById('averageAccuracy').textContent = `${this.userStats.averageAccuracy || 0}%`;
        
        // Format time
        const totalMinutes = Math.round((this.userStats.totalTimeSpent || 0) / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        document.getElementById('totalTime').textContent = timeText;

        // Draw WPM chart
        this.drawWPMChart();
    }

    drawWPMChart() {
        const canvas = document.getElementById('wpmChart');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size for high DPI displays
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        if (!this.userStats || !this.userStats.recentSessions || this.userStats.recentSessions.length === 0) {
            // Draw "No data" message
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '14px DM Mono';
            ctx.textAlign = 'center';
            ctx.fillText('No data yet - start typing!', rect.width / 2, rect.height / 2);
            return;
        }

        const sessions = this.userStats.recentSessions.slice().reverse(); // Oldest to newest
        const maxSessions = 20; // Show last 20 sessions
        const displaySessions = sessions.slice(-maxSessions);

        if (displaySessions.length === 0) return;

        // Chart dimensions
        const padding = 40;
        const chartWidth = rect.width - 2 * padding;
        const chartHeight = rect.height - 2 * padding;

        // Find WPM range
        const wpmValues = displaySessions.map(s => s.wpm);
        const minWPM = Math.max(0, Math.min(...wpmValues) - 5);
        const maxWPM = Math.max(...wpmValues) + 5;

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight * i) / 5;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(rect.width - padding, y);
            ctx.stroke();
        }

        // Vertical grid lines
        for (let i = 0; i <= 5; i++) {
            const x = padding + (chartWidth * i) / 5;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, rect.height - padding);
            ctx.stroke();
        }

        // Draw WPM line
        ctx.strokeStyle = '#7BA3B0';
        ctx.lineWidth = 2;
        ctx.beginPath();

        displaySessions.forEach((session, index) => {
            const x = padding + (chartWidth * index) / (displaySessions.length - 1);
            const y = padding + chartHeight - ((session.wpm - minWPM) / (maxWPM - minWPM)) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw data points
        ctx.fillStyle = '#7BA3B0';
        displaySessions.forEach((session, index) => {
            const x = padding + (chartWidth * index) / (displaySessions.length - 1);
            const y = padding + chartHeight - ((session.wpm - minWPM) / (maxWPM - minWPM)) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px DM Mono';
        ctx.textAlign = 'center';

        // Y-axis labels (WPM values)
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const wpm = Math.round(minWPM + ((maxWPM - minWPM) * (5 - i)) / 5);
            const y = padding + (chartHeight * i) / 5;
            ctx.fillText(wpm.toString(), padding - 5, y + 3);
        }

        // X-axis label
        ctx.textAlign = 'center';
        ctx.fillText('Recent Sessions', rect.width / 2, rect.height - 10);
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
}); 