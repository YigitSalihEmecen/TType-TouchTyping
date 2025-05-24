class TypingTrainer {
    constructor() {
        this.words = [];
        this.textContent = [];
        this.currentPosition = 0;
        this.totalCharacters = 0;
        this.correctCharacters = 0;
        this.isStarted = false;
        this.sessionStartTime = null;
        
        // WPM tracking - now based on word completion
        this.wordsCompleted = 0;
        this.wordStartTime = null;
        this.wordCompletionTimes = []; // Array of {timestamp, wordLength, correct: boolean}
        this.wpmUpdateInterval = null;
        
        // General accuracy tracking (rolling 1000 characters)
        this.generalAccuracyHistory = []; // Array of {correct: boolean} for last 1000 chars
        
        // Letter accuracy tracking (rolling 500 characters)
        this.letterStats = {};
        this.accuracyHistory = []; // Array of {letter, correct: boolean} for last 500 chars
        this.initializeLetterStats();
        
        // Word tracking
        this.currentWordStartIndex = 0;
        this.currentWordCorrect = true;
        
        // Firebase integration
        this.isAuthenticated = false;
        this.userStats = null;
        
        // DOM elements
        this.textDisplay = document.getElementById('textDisplay');
        this.instruction = document.querySelector('.instruction');
        this.cursor = document.getElementById('cursor');
        this.letterAccuracyContainer = document.getElementById('letterAccuracy');
        this.wpmCounter = document.getElementById('wpmCounter');
        this.wpmValue = document.getElementById('wpmValue');
        this.generalAccuracyValue = document.getElementById('generalAccuracyValue');
        
        // Create text content container
        this.textContentElement = document.createElement('div');
        this.textContentElement.className = 'text-content';
        this.textDisplay.appendChild(this.textContentElement);
        
        this.createLetterAccuracyDisplay();
        this.initializeEventListeners();
        this.loadWords();
        this.startGeneralAccuracyTracking();
        
        // Make available globally for auth manager
        window.typingTrainer = this;
    }
    
    initializeLetterStats() {
        // Initialize stats for each letter a-z
        for (let i = 97; i <= 122; i++) {
            const letter = String.fromCharCode(i);
            this.letterStats[letter] = {
                correct: 0,
                total: 0,
                accuracy: 100
            };
        }
    }
    
    createLetterAccuracyDisplay() {
        this.letterAccuracyContainer.innerHTML = '';
        
        // QWERTY keyboard layout
        const keyboardRows = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm']
        ];
        
        const rowClasses = ['top-row', 'middle-row', 'bottom-row'];
        
        keyboardRows.forEach((row, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = `keyboard-row ${rowClasses[rowIndex]}`;
            
            row.forEach(letter => {
                const circle = document.createElement('div');
                circle.className = 'letter-circle';
                circle.id = `circle-${letter}`;
                
                const letterLabel = document.createElement('div');
                letterLabel.className = 'letter-label';
                letterLabel.textContent = letter.toUpperCase();
                
                const accuracyValue = document.createElement('div');
                accuracyValue.className = 'accuracy-value';
                accuracyValue.textContent = '100%';
                
                circle.appendChild(letterLabel);
                circle.appendChild(accuracyValue);
                rowDiv.appendChild(circle);
            });
            
            this.letterAccuracyContainer.appendChild(rowDiv);
        });
    }
    
    updateLetterAccuracy(letter, isCorrect) {
        // Add to accuracy history for this session
        this.accuracyHistory.push({
            letter: letter.toLowerCase(),
            correct: isCorrect
        });
        
        // Keep only last 500 characters for session tracking
        if (this.accuracyHistory.length > 500) {
            this.accuracyHistory = this.accuracyHistory.slice(-500);
        }
        
        // Update the stored letter stats by incrementing the existing counts
        const letterKey = letter.toLowerCase();
        if (this.letterStats[letterKey]) {
            // Increment total and correct counts from existing Firebase data
            this.letterStats[letterKey].total++;
            if (isCorrect) {
                this.letterStats[letterKey].correct++;
            }
            
            // Recalculate accuracy based on cumulative data (including previous sessions)
            const accuracy = this.letterStats[letterKey].total > 0 ? 
                Math.round((this.letterStats[letterKey].correct / this.letterStats[letterKey].total) * 100) : 100;
            
            this.letterStats[letterKey].accuracy = accuracy;
            
            // Update the display
            const circle = document.getElementById(`circle-${letterKey}`);
            if (circle) {
                const accuracyValue = circle.querySelector('.accuracy-value');
                accuracyValue.textContent = `${accuracy}%`;
                
                // Update circle color based on accuracy with gradient using the new cool color palette
                circle.classList.remove('good', 'excellent');
                
                // Calculate color based on accuracy using the grayscale-to-blue palette (20% to 100%)
                const normalizedAccuracy = Math.max(0, Math.min(100, accuracy));
                let backgroundColor, borderColor;
                
                if (normalizedAccuracy >= 20) {
                    // Interpolate through the cool color palette
                    const factor = (normalizedAccuracy - 20) / 80; // 0 to 1 (80% range)
                    
                    let red, green, blue;
                    
                    if (factor <= 0.5) {
                        // From dark charcoal (20%) to medium gray (60%)
                        const localFactor = factor * 2; // 0 to 1
                        // Dark charcoal #2C2C2C to Medium gray #5A5A5A
                        red = Math.round(44 * (1 - localFactor) + 90 * localFactor);
                        green = Math.round(44 * (1 - localFactor) + 90 * localFactor);
                        blue = Math.round(44 * (1 - localFactor) + 90 * localFactor);
                    } else {
                        // From medium gray (60%) to blue-gray (100%)
                        const localFactor = (factor - 0.5) * 2; // 0 to 1
                        // Medium gray #5A5A5A to Blue-gray #7BA3B0
                        red = Math.round(90 * (1 - localFactor) + 123 * localFactor);
                        green = Math.round(90 * (1 - localFactor) + 163 * localFactor);
                        blue = Math.round(90 * (1 - localFactor) + 176 * localFactor);
                    }
                    
                    backgroundColor = `rgb(${red}, ${green}, ${blue})`;
                    borderColor = `rgba(255, 255, 255, ${0.2 + factor * 0.25})`;
                    
                    // Add gradient effect for higher accuracies
                    if (normalizedAccuracy >= 80) {
                        backgroundColor = `linear-gradient(135deg, rgb(${red}, ${green}, ${blue}), #7BA3B0)`;
                    }
                } else {
                    // Below 20% - very dark charcoal for extremely poor accuracy
                    backgroundColor = `linear-gradient(135deg, #1A1A1A, #0F0F0F)`;
                    borderColor = 'rgba(255, 255, 255, 0.1)';
                }
                
                circle.style.background = backgroundColor;
                circle.style.borderColor = borderColor;
                
                // Add glow effect for excellent accuracy using the blue glow
                if (normalizedAccuracy >= 90) {
                    circle.style.boxShadow = `0 8px 20px rgba(0, 0, 0, 0.25), 0 0 20px rgba(123, 163, 176, 0.5)`;
                } else {
                    circle.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.25)';
                }
            }
        }
    }
    
    async loadWords() {
        try {
            console.log('Attempting to load words_common.txt...');
            const response = await fetch('words_common.txt');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('File loaded, first 100 characters:', text.substring(0, 100));
            
            this.words = text.split('\n')
                .map(word => word.trim())
                .filter(word => word.length > 0 && word.length >= 2 && word.length <= 10)
                .filter(word => /^[a-zA-Z]+$/.test(word)); // Only letters
            
            console.log(`Loaded ${this.words.length} words from words_common.txt`);
            console.log('First 10 words:', this.words.slice(0, 10));
            
            this.generateInitialText();
        } catch (error) {
            console.error('Error loading words_common.txt:', error);
            console.log('Falling back to default words...');
            // Fallback words if file can't be loaded
            this.words = [
                'hello', 'world', 'typing', 'practice', 'keyboard', 'computer',
                'programming', 'javascript', 'website', 'development', 'learning',
                'touch', 'finger', 'speed', 'accuracy', 'training'
            ];
            this.generateInitialText();
        }
    }
    
    getLeastAccurateLetters(count = 10) {
        // First, identify letters that need initial practice (less than 5 attempts)
        const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
        const needsPractice = [];
        const hasEnoughData = [];
        
        allLetters.forEach(letter => {
            const stats = this.letterStats[letter];
            if (stats.total < 5) {
                // Letters with fewer than 5 attempts get maximum priority
                needsPractice.push({
                    letter: letter,
                    accuracy: 0, // Treat as 0% accuracy for sorting
                    total: stats.total,
                    priority: 'needs-practice'
                });
            } else {
                // Letters with enough data use actual accuracy
                hasEnoughData.push({
                    letter: letter,
                    accuracy: stats.accuracy,
                    total: stats.total,
                    priority: 'has-data'
                });
            }
        });
        
        // Sort letters needing practice by total attempts (least practiced first)
        needsPractice.sort((a, b) => {
            if (a.total !== b.total) {
                return a.total - b.total; // Least attempts first
            }
            // If same attempt count, prioritize rare letters
            const rareLetters = ['z', 'j', 'q', 'x', 'v', 'k', 'w', 'y'];
            const aIsRare = rareLetters.includes(a.letter);
            const bIsRare = rareLetters.includes(b.letter);
            if (aIsRare && !bIsRare) return -1;
            if (!aIsRare && bIsRare) return 1;
            return 0;
        });
        
        // Sort letters with enough data by accuracy (lowest first)
        hasEnoughData.sort((a, b) => {
            if (a.accuracy !== b.accuracy) {
                return a.accuracy - b.accuracy;
            }
            return b.total - a.total; // More data is better for tie-breaking
        });
        
        // Combine: prioritize letters needing practice, then lowest accuracy
        const result = [
            ...needsPractice.slice(0, count).map(item => item.letter),
            ...hasEnoughData.slice(0, count - needsPractice.length).map(item => item.letter)
        ].slice(0, count);
        
        console.log('Letters needing practice (< 5 attempts):', needsPractice.map(item => 
            `${item.letter}(${item.total})`
        ));
        console.log('Letters with data (≥ 5 attempts):', hasEnoughData.slice(0, 5).map(item => 
            `${item.letter}(${item.accuracy}%)`
        ));
        
        return result;
    }
    
    countLeastAccurateLetters(word, leastAccurateLetters) {
        const wordLetters = word.toLowerCase().split('');
        let totalWeight = 0;
        
        for (const letter of wordLetters) {
            const letterIndex = leastAccurateLetters.indexOf(letter);
            if (letterIndex !== -1) {
                const stats = this.letterStats[letter];
                
                if (stats.total < 5) {
                    // Letters with fewer than 5 attempts get maximum weight (10)
                    totalWeight += 10;
                } else {
                    // Letters with enough data use position-based weight (10 down to 1)
                    const weight = 10 - letterIndex;
                    totalWeight += weight;
                }
            }
        }
        
        return totalWeight;
    }
    
    selectOptimalWord() {
        const leastAccurateLetters = this.getLeastAccurateLetters(10);
        console.log('Least accurate letters (ranked):', leastAccurateLetters);
        
        // Choose 100 random words from the word list
        const candidateWords = [];
        for (let i = 0; i < 100 && i < this.words.length; i++) {
            const randomIndex = Math.floor(Math.random() * this.words.length);
            candidateWords.push(this.words[randomIndex]);
        }
        
        // Score each word based on weighted count of least accurate letters, normalized by word length
        const scoredWords = candidateWords.map(word => {
            const totalWeight = this.countLeastAccurateLetters(word, leastAccurateLetters);
            const normalizedScore = totalWeight / word.length; // Normalize by word length
            return {
                word: word,
                totalWeight: totalWeight,
                normalizedScore: normalizedScore,
                breakdown: this.getWordBreakdown(word, leastAccurateLetters)
            };
        });
        
        // Sort by normalized score (highest first) and pick the best one
        scoredWords.sort((a, b) => b.normalizedScore - a.normalizedScore);
        
        console.log('Candidate words with normalized scores:', scoredWords.map(item => ({
            word: item.word,
            length: item.word.length,
            totalWeight: item.totalWeight,
            normalizedScore: item.normalizedScore.toFixed(2),
            breakdown: item.breakdown
        })));
        
        return scoredWords[0].word;
    }
    
    getWordBreakdown(word, leastAccurateLetters) {
        const wordLetters = word.toLowerCase().split('');
        const breakdown = [];
        
        for (const letter of wordLetters) {
            const letterIndex = leastAccurateLetters.indexOf(letter);
            if (letterIndex !== -1) {
                const stats = this.letterStats[letter];
                
                if (stats.total < 5) {
                    // Show "needs practice" letters with special notation
                    breakdown.push(`${letter}(10*)`);
                } else {
                    const weight = 10 - letterIndex;
                    breakdown.push(`${letter}(${weight})`);
                }
            }
        }
        
        return breakdown.join(' ');
    }
    
    generateInitialText() {
        // Generate initial text content
        this.textContent = [];
        
        // Generate enough text to fill screen and have buffer
        for (let i = 0; i < 100; i++) {
            this.addRandomWord();
        }
        
        this.renderText();
        this.instruction.textContent = 'Press any key to start...';
    }
    
    addRandomWord() {
        const word = this.selectOptimalWord();
        
        // Add each letter of the word
        for (let i = 0; i < word.length; i++) {
            this.textContent.push({
                char: word[i],
                isSpace: false,
                isCorrect: false,
                isIncorrect: false
            });
        }
        
        // Add space after word
        this.textContent.push({
            char: ' ',
            isSpace: true,
            isCorrect: false,
            isIncorrect: false
        });
    }
    
    renderText() {
        this.textContentElement.innerHTML = '';
        
        this.textContent.forEach((item, index) => {
            const span = document.createElement('span');
            span.textContent = item.char;
            span.className = 'letter';
            span.setAttribute('data-index', index);
            
            if (item.wasStruggled) {
                // Letters that were struggled with (had incorrect attempts) show as red after advancing
                span.classList.add('struggled');
            } else if (item.isCorrect) {
                span.classList.add('correct');
            } else if (item.isIncorrect) {
                span.classList.add('incorrect');
            }
            
            if (index === this.currentPosition) {
                span.classList.add('current');
            }
            
            this.textContentElement.appendChild(span);
        });
        
        // Position text so current letter is under the fixed cursor
        this.updateTextPosition();
    }
    
    updateTextPosition() {
        // Calculate the actual cumulative width of characters up to current position
        let totalWidth = 0;
        
        // Get all letter elements up to current position
        for (let i = 0; i < this.currentPosition; i++) {
            const letterElement = this.textContentElement.querySelector(`[data-index="${i}"]`);
            if (letterElement) {
                totalWidth += letterElement.getBoundingClientRect().width;
            }
        }
        
        // Add a small offset to align text properly with cursor
        const textOffset = 8; // pixels to offset text to the left
        
        // Move text left by the actual cumulative width plus offset
        // Only disable transition if we're making a large jump (like adding new words)
        const newTransform = `translateY(-50%) translateX(-${totalWidth + textOffset}px)`;
        
        // Check if this is a significant position change (more than 5 characters)
        const previousPosition = this.previousPosition || 0;
        const positionDiff = Math.abs(this.currentPosition - previousPosition);
        
        if (positionDiff > 5) {
            // Large jump - disable transition temporarily
            this.textContentElement.style.transition = 'none';
            this.textContentElement.style.transform = newTransform;
            
            // Re-enable transition after a brief delay
            setTimeout(() => {
                this.textContentElement.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)';
            }, 10);
        } else {
            // Normal advancement - keep smooth transition
            this.textContentElement.style.transform = newTransform;
        }
        
        this.previousPosition = this.currentPosition;
    }
    
    initializeEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Prevent default browser shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) return; // Allow system shortcuts
            if (e.key === 'F5' || e.key === 'F12') return; // Allow refresh and dev tools
            if (e.key.length === 1 || e.key === ' ' || e.key === 'Backspace') {
                e.preventDefault();
            }
        });
    }
    
    blinkLetterCircle(letter) {
        const circle = document.getElementById(`circle-${letter.toLowerCase()}`);
        if (circle) {
            // Add blink class
            circle.classList.add('blink');
            
            // Remove blink class after animation completes
            setTimeout(() => {
                circle.classList.remove('blink');
            }, 300); // Match the animation duration
        }
    }
    
    handleKeyPress(e) {
        // Ignore modifier keys and function keys
        if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1 && e.key !== ' ') {
            return;
        }
        
        // Disable backspace/delete functionality for muscle memory training
        if (e.key === 'Backspace' || e.key === 'Delete') {
            return; // Simply ignore these keys
        }
        
        // Start on first meaningful keypress
        if (!this.isStarted && (e.key.length === 1 || e.key === ' ')) {
            this.isStarted = true;
            this.instruction.textContent = '';
            this.cursor.style.display = 'block';
            this.startSession(); // Start session tracking
        }
        
        // Only process single characters and space
        if (e.key.length !== 1 && e.key !== ' ') {
            return;
        }
        
        // Blink the corresponding letter circle (but not for space)
        if (e.key !== ' ' && e.key.match(/[a-zA-Z]/)) {
            this.blinkLetterCircle(e.key);
        }
        
        // Check if we need to add more words
        if (this.currentPosition > this.textContent.length - 20) {
            for (let i = 0; i < 10; i++) {
                this.addRandomWord();
            }
            // Re-render to include new words
            this.renderText();
            return; // Return early to avoid double processing
        }
        
        const currentItem = this.textContent[this.currentPosition];
        const typedChar = e.key.toLowerCase();
        const expectedChar = currentItem.char.toLowerCase();
        
        // Check if the keystroke matches
        if (typedChar === expectedChar) {
            // Correct keystroke
            currentItem.isCorrect = true;
            currentItem.isIncorrect = false;
            
            // If this letter had previous incorrect attempts, mark it as struggled with
            if (currentItem.wasIncorrect) {
                currentItem.wasStruggled = true;
            }
            
            // Update total characters count only on correct advancement
            this.totalCharacters++;
            this.correctCharacters++;
            
            // Record for general accuracy
            this.recordGeneralAccuracy(true);
            
            // Update letter-specific accuracy for letters (not spaces)
            if (expectedChar !== ' ' && expectedChar.match(/[a-z]/)) {
                this.updateLetterAccuracy(expectedChar, true);
            }
            
            // Handle word completion tracking
            if (expectedChar === ' ') {
                // Word completed - record the completion
                this.completeWord();
            } else if (this.wordStartTime === null) {
                // First letter of a new word - start timing
                this.startNewWord();
            }
            
            // Move to next position only on correct keystroke
            this.currentPosition++;
        } else {
            // Incorrect keystroke - mark current letter as incorrect but DON'T move forward
            currentItem.isIncorrect = true;
            currentItem.wasIncorrect = true; // Track that this letter was typed incorrectly
            
            // Mark current word as having errors
            this.currentWordCorrect = false;
            
            // Record for general accuracy
            this.recordGeneralAccuracy(false);
            
            // Update letter-specific accuracy for the expected letter (not the typed one)
            if (expectedChar !== ' ' && expectedChar.match(/[a-z]/)) {
                this.updateLetterAccuracy(expectedChar, false);
            }
            
            // Update total characters count for accuracy calculation
            this.totalCharacters++;
            
            // DON'T move to next position - wait for correct key
        }
        
        this.renderText();
    }
    
    startNewWord() {
        this.wordStartTime = Date.now();
        this.currentWordStartIndex = this.currentPosition;
        this.currentWordCorrect = true;
    }
    
    completeWord() {
        if (this.wordStartTime !== null) {
            const completionTime = Date.now();
            const wordLength = this.currentPosition - this.currentWordStartIndex;
            
            // Record word completion with character count
            this.wordCompletionTimes.push({
                timestamp: completionTime,
                wordLength: wordLength,
                correct: this.currentWordCorrect,
                duration: completionTime - this.wordStartTime,
                startTime: this.wordStartTime,
                characters: wordLength // Include space in character count
            });
            
            this.wordsCompleted++;
            
            // Auto-save session every 30 words for authenticated users
            if (this.isAuthenticated && this.wordsCompleted % 30 === 0) {
                this.saveCurrentSession();
            }
            
            // Check if we should update WPM (every 10 words)
            if (this.wordsCompleted % 10 === 0) {
                this.updateWpmAfter10Words();
            }
            
            // Reset for next word
            this.wordStartTime = null;
            this.currentWordCorrect = true;
        }
    }
    
    async saveCurrentSession() {
        if (!this.isAuthenticated || !this.sessionStartTime) return;
        
        const sessionDuration = Date.now() - this.sessionStartTime;
        const currentWPM = this.calculateCurrentWPM();
        const currentAccuracy = this.calculateGeneralAccuracy();
        
        const sessionData = {
            wpm: currentWPM,
            accuracy: currentAccuracy,
            wordsTyped: this.wordsCompleted,
            charactersTyped: this.totalCharacters,
            timeSpent: sessionDuration,
            letterStats: this.getSessionLetterStats()
        };
        
        // Save to Firebase
        if (window.authManager) {
            await window.authManager.recordSession(sessionData);
            console.log('Auto-saved session at', this.wordsCompleted, 'words');
        }
    }
    
    updateWpmAfter10Words() {
        if (this.wordCompletionTimes.length < 10) {
            return;
        }
        
        // Get the last 10 completed words
        const last10Words = this.wordCompletionTimes.slice(-10);
        
        // Calculate total characters in these 10 words
        const totalCharacters = last10Words.reduce((sum, word) => sum + word.characters, 0);
        
        // Calculate time span from first to last word in this batch
        const startTime = last10Words[0].startTime;
        const endTime = last10Words[last10Words.length - 1].timestamp;
        const timeInMs = endTime - startTime;
        
        if (timeInMs <= 0) {
            return;
        }
        
        // Convert to minutes
        const timeInMinutes = timeInMs / 60000;
        
        // Calculate WPM: (characters / 5) / time in minutes
        const wpm = Math.round((totalCharacters / 5) / timeInMinutes);
        
        // Update display
        this.wpmValue.textContent = Math.max(0, wpm);
        
        console.log(`WPM updated after ${this.wordsCompleted} words:`);
        console.log(`- Last 10 words: ${totalCharacters} characters`);
        console.log(`- Time span: ${(timeInMs / 1000).toFixed(1)} seconds`);
        console.log(`- WPM: (${totalCharacters} ÷ 5) ÷ ${timeInMinutes.toFixed(2)} = ${wpm}`);
    }
    
    startGeneralAccuracyTracking() {
        // Update general accuracy every 500ms for smooth updates
        this.wpmUpdateInterval = setInterval(() => {
            this.updateGeneralAccuracy();
        }, 500);
    }
    
    calculateGeneralAccuracy() {
        if (this.generalAccuracyHistory.length === 0) {
            return 0;
        }
        
        const correctCount = this.generalAccuracyHistory.filter(entry => entry.correct).length;
        return Math.round((correctCount / this.generalAccuracyHistory.length) * 100);
    }
    
    updateGeneralAccuracy() {
        const accuracy = this.calculateGeneralAccuracy();
        if (this.generalAccuracyValue) {
            this.generalAccuracyValue.textContent = accuracy;
        }
        
        // Clean up old entries (older than 1000 characters)
        if (this.generalAccuracyHistory.length > 1000) {
            this.generalAccuracyHistory = this.generalAccuracyHistory.slice(-1000);
        }
    }
    
    recordGeneralAccuracy(correct) {
        this.generalAccuracyHistory.push({
            correct: correct
        });
    }
    
    // Clean up method for when the app is closed
    destroy() {
        if (this.wpmUpdateInterval) {
            clearInterval(this.wpmUpdateInterval);
        }
    }
    
    // Firebase integration methods
    onUserAuthenticated(userStats) {
        this.isAuthenticated = true;
        this.userStats = userStats;
        
        // Load user's letter statistics
        if (userStats && userStats.letterStats) {
            this.letterStats = { ...userStats.letterStats };
            this.updateAllLetterAccuracyDisplays();
        }
        
        console.log('User authenticated, stats loaded');
        this.instruction.textContent = `Welcome back, ${userStats.displayName || 'User'}! Press any key to start...`;
    }
    
    onUserSignedOut() {
        this.isAuthenticated = false;
        this.userStats = null;
        
        // Reset to default letter stats
        this.initializeLetterStats();
        this.updateAllLetterAccuracyDisplays();
        
        console.log('User signed out, reset to guest mode');
        this.instruction.textContent = 'Press any key to start...';
    }
    
    updateAllLetterAccuracyDisplays() {
        // Update all letter circles with current stats
        for (const letter in this.letterStats) {
            const circle = document.getElementById(`circle-${letter}`);
            if (circle) {
                const stats = this.letterStats[letter];
                const accuracyValue = circle.querySelector('.accuracy-value');
                if (accuracyValue) {
                    accuracyValue.textContent = `${stats.accuracy}%`;
                }
                this.updateLetterCircleColor(circle, stats.accuracy);
            }
        }
    }
    
    updateLetterCircleColor(circle, accuracy) {
        // Update circle color based on accuracy
        circle.classList.remove('good', 'excellent');
        
        const normalizedAccuracy = Math.max(0, Math.min(100, accuracy));
        let backgroundColor, borderColor;
        
        if (normalizedAccuracy >= 20) {
            const factor = (normalizedAccuracy - 20) / 80; // 0 to 1 (80% range)
            
            let red, green, blue;
            
            if (factor <= 0.5) {
                const localFactor = factor * 2; // 0 to 1
                red = Math.round(44 * (1 - localFactor) + 90 * localFactor);
                green = Math.round(44 * (1 - localFactor) + 90 * localFactor);
                blue = Math.round(44 * (1 - localFactor) + 90 * localFactor);
            } else {
                const localFactor = (factor - 0.5) * 2; // 0 to 1
                red = Math.round(90 * (1 - localFactor) + 123 * localFactor);
                green = Math.round(90 * (1 - localFactor) + 163 * localFactor);
                blue = Math.round(90 * (1 - localFactor) + 176 * localFactor);
            }
            
            backgroundColor = `rgb(${red}, ${green}, ${blue})`;
            borderColor = `rgba(255, 255, 255, ${0.2 + factor * 0.25})`;
            
            if (normalizedAccuracy >= 80) {
                backgroundColor = `linear-gradient(135deg, rgb(${red}, ${green}, ${blue}), #7BA3B0)`;
            }
        } else {
            backgroundColor = `linear-gradient(135deg, #1A1A1A, #0F0F0F)`;
            borderColor = 'rgba(255, 255, 255, 0.1)';
        }
        
        circle.style.background = backgroundColor;
        circle.style.borderColor = borderColor;
        
        if (normalizedAccuracy >= 90) {
            circle.style.boxShadow = `0 8px 20px rgba(0, 0, 0, 0.25), 0 0 20px rgba(123, 163, 176, 0.5)`;
        } else {
            circle.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.25)';
        }
    }
    
    startSession() {
        if (!this.sessionStartTime) {
            this.sessionStartTime = Date.now();
            
            // Reset session-specific tracking for clean session data
            this.accuracyHistory = [];
            this.generalAccuracyHistory = [];
            this.wordCompletionTimes = [];
            this.wordsCompleted = 0;
            this.totalCharacters = 0;
            this.correctCharacters = 0;
        }
    }
    
    async endSession() {
        if (!this.sessionStartTime) return;
        
        const sessionDuration = Date.now() - this.sessionStartTime;
        const currentWPM = this.calculateCurrentWPM();
        const currentAccuracy = this.calculateGeneralAccuracy();
        
        const sessionData = {
            wpm: currentWPM,
            accuracy: currentAccuracy,
            wordsTyped: this.wordsCompleted,
            charactersTyped: this.totalCharacters,
            timeSpent: sessionDuration,
            letterStats: this.getSessionLetterStats()
        };
        
        // Save to Firebase if user is authenticated
        if (this.isAuthenticated && window.authManager) {
            await window.authManager.recordSession(sessionData);
            console.log('Session saved to Firebase:', sessionData);
        }
        
        // Reset session tracking for next session
        this.sessionStartTime = null;
        this.accuracyHistory = [];
        this.generalAccuracyHistory = [];
        this.wordCompletionTimes = [];
        this.wordsCompleted = 0;
        this.totalCharacters = 0;
        this.correctCharacters = 0;
    }
    
    getSessionLetterStats() {
        // Return only the session's letter stats (not cumulative)
        const sessionStats = {};
        
        for (const entry of this.accuracyHistory) {
            const letter = entry.letter;
            if (!sessionStats[letter]) {
                sessionStats[letter] = { correct: 0, total: 0 };
            }
            sessionStats[letter].total++;
            if (entry.correct) {
                sessionStats[letter].correct++;
            }
        }
        
        return sessionStats;
    }
    
    calculateCurrentWPM() {
        if (this.wordCompletionTimes.length === 0) return 0;
        
        const last10Words = this.wordCompletionTimes.slice(-10);
        if (last10Words.length === 0) return 0;
        
        const totalCharacters = last10Words.reduce((sum, word) => sum + word.characters, 0);
        const startTime = last10Words[0].startTime;
        const endTime = last10Words[last10Words.length - 1].timestamp;
        const timeInMs = endTime - startTime;
        
        if (timeInMs <= 0) return 0;
        
        const timeInMinutes = timeInMs / 60000;
        return Math.round((totalCharacters / 5) / timeInMinutes);
    }
}

// Initialize the typing trainer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TypingTrainer();
});