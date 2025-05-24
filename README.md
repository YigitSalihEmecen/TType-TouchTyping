# TType - Touch Typing Trainer

A modern, web-based touch typing trainer with intelligent word selection and comprehensive accuracy tracking.

[🚀 Try it live!](https://yigitsalihemecen.github.io/TType-TouchTyping/)


## Features

- **Google Authentication**: Sign in to save your progress and track statistics across sessions
- **Intelligent Word Selection**: Targets your weakest letters for focused improvement
- **Real-time Performance Tracking**: Live WPM counter and accuracy monitoring
- **Letter-specific Accuracy**: Visual feedback for each letter in QWERTY keyboard layout
- **Cloud Storage**: All your typing statistics saved to Firebase
- **Infinite Scrolling**: Continuous text generation keeps you typing without interruption
- **Progress Persistence**: Your statistics and accuracy data are preserved between sessions

## Quick Start

### For Users
1. Visit the live application at your GitHub Pages URL
2. Click "Sign in with Google" to save your progress (optional)
3. Press any key to start typing
4. Follow the moving cursor and type the displayed text
5. Track your improvement over time with saved statistics

### For Developers
1. Clone this repository
2. Set up Firebase (see [Firebase Setup Guide](FIREBASE_SETUP.md))
3. Update the Firebase configuration in `index.html`
4. Host the files on a web server
5. Add your domain to Firebase authorized domains

## Firebase Integration

The application includes comprehensive Firebase integration for:
- **User Authentication**: Google sign-in with profile management
- **Statistics Tracking**: Persistent WPM, accuracy, and letter-specific data
- **Session Management**: Automatic saving every 100 words typed
- **Progress History**: Track improvement over multiple sessions
- **Cross-device Sync**: Access your stats from any device

### Statistics Tracked
- Total words and characters typed
- Best and average WPM
- Letter-specific accuracy (a-z)
- Session history and performance trends
- Time spent practicing

## Setup Instructions

1. **Local Development**:
   ```bash
   python3 -m http.server 8000
   # Visit http://localhost:8000
   ```

2. **Firebase Setup**:
   - Follow the detailed [Firebase Setup Guide](FIREBASE_SETUP.md)
   - Configure authentication and Firestore database
   - Update `index.html` with your Firebase configuration

3. **Deploy to GitHub Pages**:
   - Push to your repository
   - Enable GitHub Pages in repository settings
   - Add your GitHub Pages URL to Firebase authorized domains

## File Structure

- `index.html` - Main application with Firebase configuration
- `script.js` - Core typing trainer logic with Firebase integration
- `auth.js` - Authentication and data management
- `styles.css` - Application styling and responsive design
- `words_common.txt` - Curated word list for typing practice
- `FIREBASE_SETUP.md` - Comprehensive Firebase setup guide

## Technical Details

- **Framework**: Vanilla JavaScript with Firebase SDK
- **Authentication**: Firebase Auth with Google provider
- **Database**: Cloud Firestore for user data storage
- **Hosting**: Compatible with GitHub Pages, Firebase Hosting, or any static host
- **Security**: Firestore rules ensure users can only access their own data

The intelligent algorithm prioritizes letters with poor accuracy and ensures comprehensive coverage of all letters in the alphabet for balanced skill development. 
