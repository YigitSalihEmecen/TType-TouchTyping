class TypingTrainer {
    constructor() {
        this.words = [];
        this.textContent = [];
        this.currentPosition = 0;
        this.totalCharacters = 0;
        this.correctCharacters = 0;
        this.isStarted = false;
        
        // WPM tracking
        this.keystrokeHistory = []; // Array of {timestamp, correct: boolean}
        this.wpmUpdateInterval = null;
        
        // Letter accuracy tracking (rolling 500 characters)
        this.letterStats = {};
        this.accuracyHistory = []; // Array of {letter, correct: boolean} for last 500 chars
        this.initializeLetterStats();
        
        // DOM elements
        this.textDisplay = document.getElementById('textDisplay');
        this.instruction = document.querySelector('.instruction');
        this.cursor = document.getElementById('cursor');
        this.letterAccuracyContainer = document.getElementById('letterAccuracy');
        this.wpmCounter = document.getElementById('wpmCounter');
        this.wpmValue = document.getElementById('wpmValue');
        
        // Create text content container
        this.textContentElement = document.createElement('div');
        this.textContentElement.className = 'text-content';
        this.textDisplay.appendChild(this.textContentElement);
        
        this.createLetterAccuracyDisplay();
        this.initializeEventListeners();
        this.loadWords();
        this.startWpmTracking();
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
        // Add to accuracy history
        this.accuracyHistory.push({
            letter: letter.toLowerCase(),
            correct: isCorrect
        });
        
        // Keep only last 500 characters
        if (this.accuracyHistory.length > 500) {
            this.accuracyHistory = this.accuracyHistory.slice(-500);
        }
        
        // Recalculate accuracy for this letter based on last 500 characters
        const letterAttempts = this.accuracyHistory.filter(entry => entry.letter === letter.toLowerCase());
        const correctAttempts = letterAttempts.filter(entry => entry.correct).length;
        
        if (letterAttempts.length > 0) {
            const accuracy = Math.round((correctAttempts / letterAttempts.length) * 100);
            
            // Update the letter stats
            this.letterStats[letter.toLowerCase()] = {
                correct: correctAttempts,
                total: letterAttempts.length,
                accuracy: accuracy
            };
            
            // Update the display
            const circle = document.getElementById(`circle-${letter.toLowerCase()}`);
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
        // Get all letters that have been typed in the last 500 characters
        const typedLetters = Object.keys(this.letterStats)
            .filter(letter => this.letterStats[letter].total > 0)
            .map(letter => ({
                letter: letter,
                accuracy: this.letterStats[letter].accuracy,
                total: this.letterStats[letter].total
            }))
            .sort((a, b) => {
                // Sort by accuracy (lowest first), then by total attempts (highest first for more data)
                if (a.accuracy !== b.accuracy) {
                    return a.accuracy - b.accuracy;
                }
                return b.total - a.total;
            });
        
        // If we don't have enough typed letters, add random letters to fill the list
        const result = typedLetters.slice(0, count).map(item => item.letter);
        
        // Fill remaining slots with random letters if needed
        if (result.length < count) {
            const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
            const remainingLetters = allLetters.filter(letter => !result.includes(letter));
            
            while (result.length < count && remainingLetters.length > 0) {
                const randomIndex = Math.floor(Math.random() * remainingLetters.length);
                result.push(remainingLetters.splice(randomIndex, 1)[0]);
            }
        }
        
        return result;
    }
    
    countLeastAccurateLetters(word, leastAccurateLetters) {
        const wordLetters = word.toLowerCase().split('');
        let totalWeight = 0;
        
        for (const letter of wordLetters) {
            const letterIndex = leastAccurateLetters.indexOf(letter);
            if (letterIndex !== -1) {
                // Weight decreases from 10 for the worst letter to 1 for the 10th worst
                const weight = 10 - letterIndex;
                totalWeight += weight;
            }
        }
        
        return totalWeight;
    }
    
    selectOptimalWord() {
        const leastAccurateLetters = this.getLeastAccurateLetters(10);
        console.log('Least accurate letters (ranked):', leastAccurateLetters);
        
        // Choose 50 random words from the word list
        const candidateWords = [];
        for (let i = 0; i < 50 && i < this.words.length; i++) {
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
                const weight = 10 - letterIndex;
                breakdown.push(`${letter}(${weight})`);
            }
        }
        
        return breakdown.join(' ');
    }
    
    generateInitialText() {
        // Generate initial text content
        this.textContent = [];
        
        // Generate enough text to fill screen and have buffer
        for (let i = 0; i < 50; i++) {
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
            
            if (item.isCorrect) {
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
        // This ensures the current letter is always aligned with the center cursor
        this.textContentElement.style.transform = `translateY(-50%) translateX(-${totalWidth + textOffset}px)`;
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
        if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1 && e.key !== ' ' && e.key !== 'Backspace') {
            return;
        }
        
        // Start on first meaningful keypress
        if (!this.isStarted && (e.key.length === 1 || e.key === ' ')) {
            this.isStarted = true;
            this.instruction.textContent = '';
            this.cursor.style.display = 'block';
        }
        
        // Handle backspace
        if (e.key === 'Backspace') {
            this.handleBackspace();
            return;
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
        
        // Update total characters count
        this.totalCharacters++;
        
        // Check if the keystroke matches
        if (typedChar === expectedChar) {
            // Correct keystroke
            currentItem.isCorrect = true;
            currentItem.isIncorrect = false;
            this.correctCharacters++;
            
            // Record correct keystroke for WPM calculation
            this.recordKeystroke(true);
            
            // Update letter-specific accuracy for letters (not spaces)
            if (expectedChar !== ' ' && expectedChar.match(/[a-z]/)) {
                this.updateLetterAccuracy(expectedChar, true);
            }
            
            // Move to next position
            this.currentPosition++;
        } else {
            // Incorrect keystroke - mark as incorrect but don't advance
            currentItem.isIncorrect = true;
            
            // Record incorrect keystroke for WPM calculation
            this.recordKeystroke(false);
            
            // Update letter-specific accuracy for letters (not spaces)
            if (expectedChar !== ' ' && expectedChar.match(/[a-z]/)) {
                this.updateLetterAccuracy(expectedChar, false);
            }
        }
        
        this.renderText();
    }
    
    handleBackspace() {
        if (this.currentPosition > 0) {
            // Move back one position
            this.currentPosition--;
            const currentItem = this.textContent[this.currentPosition];
            
            // Reset the item's state
            if (currentItem.isCorrect) {
                this.correctCharacters--;
            }
            currentItem.isCorrect = false;
            currentItem.isIncorrect = false;
            
            // Adjust character counts
            if (this.totalCharacters > 0) {
                this.totalCharacters--;
            }
            
            this.renderText();
        }
    }
    
    startWpmTracking() {
        // Update WPM every 500ms for smooth updates
        this.wpmUpdateInterval = setInterval(() => {
            this.updateWpmDisplay();
        }, 500);
    }
    
    calculateWpm() {
        const now = Date.now();
        const fifteenSecondsAgo = now - 15000; // 15 seconds in milliseconds
        
        // Filter keystrokes from the last 15 seconds
        const recentKeystrokes = this.keystrokeHistory.filter(
            keystroke => keystroke.timestamp >= fifteenSecondsAgo
        );
        
        if (recentKeystrokes.length === 0) {
            return 0;
        }
        
        // Count correct characters in the last 15 seconds
        const correctCharsInPeriod = recentKeystrokes.filter(k => k.correct).length;
        
        // Calculate time span of actual typing (from first to last keystroke in period)
        const firstKeystroke = recentKeystrokes[0].timestamp;
        const lastKeystroke = recentKeystrokes[recentKeystrokes.length - 1].timestamp;
        const typingDuration = Math.max(lastKeystroke - firstKeystroke, 1000); // At least 1 second
        
        // WPM = (characters / 5) / (time in minutes)
        // Using actual typing duration rather than full 15 seconds for more accurate measurement
        const timeInMinutes = typingDuration / 60000;
        const wpm = Math.round((correctCharsInPeriod / 5) / timeInMinutes);
        
        return Math.max(0, wpm); // Don't show negative WPM
    }
    
    updateWpmDisplay() {
        const wpm = this.calculateWpm();
        this.wpmValue.textContent = wpm;
        
        // Clean up old keystrokes (older than 15 seconds)
        const fifteenSecondsAgo = Date.now() - 15000;
        this.keystrokeHistory = this.keystrokeHistory.filter(
            keystroke => keystroke.timestamp >= fifteenSecondsAgo
        );
    }
    
    recordKeystroke(correct) {
        this.keystrokeHistory.push({
            timestamp: Date.now(),
            correct: correct
        });
    }
    
    // Clean up method for when the app is closed
    destroy() {
        if (this.wpmUpdateInterval) {
            clearInterval(this.wpmUpdateInterval);
        }
    }
}

// Initialize the typing trainer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TypingTrainer();
}); 