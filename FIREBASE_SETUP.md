# Firebase Setup Guide for TType

This guide will walk you through setting up Firebase Authentication and Firestore for the TType typing trainer.

## Prerequisites

- A Google account
- The TType application files

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "ttype-typing-trainer")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click on "Google" provider
5. Toggle "Enable"
6. Add your project's domain to authorized domains:
   - For GitHub Pages: `yourusername.github.io`
   - For local development: `localhost`
7. Click "Save"

## Step 3: Set up Firestore Database

1. In your Firebase project, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (we'll set up security rules later)
4. Choose a location for your database (select closest to your users)
5. Click "Done"

## Step 4: Configure Security Rules

1. In Firestore Database, go to the "Rules" tab
2. Replace the default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Firebase Configuration

1. Go to Project Settings (gear icon in the left sidebar)
2. Scroll down to "Your apps" section
3. Click on the web icon (`</>`) to add a web app
4. Give your app a nickname (e.g., "TType Web App")
5. Check "Also set up Firebase Hosting" if you want to host on Firebase (optional)
6. Click "Register app"
7. Copy the Firebase configuration object

## Step 6: Update Your Application

1. Open `index.html` in your TType project
2. Find the Firebase configuration section (around line 65)
3. Replace the placeholder config with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Step 7: Set up Authorized Domains

1. In Firebase Console, go to Authentication > Settings
2. In the "Authorized domains" tab, add your domain:
   - For GitHub Pages: `yourusername.github.io`
   - For custom domain: `yourdomain.com`
   - `localhost` should already be there for development

## Step 8: Test the Integration

1. Deploy your updated application to GitHub Pages
2. Visit your app
3. Click "Sign in with Google"
4. Complete the authentication flow
5. Start typing to generate some statistics
6. Check Firestore Database in Firebase Console to see if user data is being saved

## Firestore Data Structure

The application will create documents in the `users` collection with this structure:

```
users/{userId}
├── userId: string
├── email: string
├── displayName: string
├── photoURL: string
├── createdAt: timestamp
├── lastLogin: timestamp
├── totalWordsTyped: number
├── totalCharactersTyped: number
├── totalTimeSpent: number
├── sessionsCompleted: number
├── bestWPM: number
├── averageWPM: number
├── bestAccuracy: number
├── averageAccuracy: number
├── letterStats: object
│   ├── a: {correct: number, total: number, accuracy: number}
│   ├── b: {correct: number, total: number, accuracy: number}
│   └── ... (for each letter a-z)
├── recentSessions: array
├── achievements: array
├── streakCount: number
└── lastSessionDate: timestamp
```

## Troubleshooting

### Authentication Issues
- Ensure your domain is added to authorized domains
- Check that the Firebase config is correct
- Verify Google sign-in is enabled in Authentication settings

### Firestore Permission Denied
- Check that security rules are correctly set up
- Ensure the user is authenticated before trying to read/write data
- Verify the document path matches the security rules

### Data Not Saving
- Check browser console for errors
- Verify Firestore rules allow write access
- Ensure the user is authenticated

## Optional: Firebase Hosting

If you want to host your app on Firebase instead of GitHub Pages:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize hosting: `firebase init hosting`
4. Deploy: `firebase deploy`

## Security Best Practices

1. **Use Security Rules**: Never leave Firestore in test mode for production
2. **Limit Data Access**: Users should only access their own data
3. **Validate Data**: Add validation rules for data structure and types
4. **Monitor Usage**: Set up billing alerts and quotas
5. **Regular Backups**: Consider setting up automated backups for user data

## Additional Features to Consider

- **Offline Support**: Firestore supports offline data persistence
- **Real-time Updates**: Listen for real-time changes to user stats
- **Analytics**: Add Firebase Analytics to track app usage
- **Performance Monitoring**: Monitor app performance with Firebase Performance
- **Cloud Functions**: Add server-side logic for achievements or leaderboards

## Support

If you encounter issues:
1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Look at browser console for error messages
3. Verify your Firebase project configuration
4. Test authentication flow step by step 