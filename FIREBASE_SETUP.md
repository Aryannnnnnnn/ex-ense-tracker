# Firebase Setup Guide for Expense Tracker

This guide will help you set up Firebase for your Expense Tracker application. Firebase provides real-time data storage, authentication, and cloud storage capabilities.

## Prerequisites

1. A Google account
2. Node.js and npm installed
3. Expense Tracker project cloned and dependencies installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click on "Add project"
3. Enter a project name (e.g., "Expense Tracker")
4. Choose whether to enable Google Analytics (recommended)
5. Click "Continue" and complete the project setup

## Step 2: Register Your App with Firebase

1. On the Firebase project dashboard, click the web icon (</>) to add a web app
2. Give your app a nickname (e.g., "Expense Tracker Web")
3. Optionally enable Firebase Hosting
4. Click "Register app"
5. You'll see the Firebase configuration object - keep this page open for the next step

## Step 3: Configure Your App

1. In your Expense Tracker project, create a new file called `firebase.config.js` in the root directory (use the provided `firebase.config.example.js` as a template)
2. Copy the Firebase configuration object from the Firebase console and paste it into your `firebase.config.js` file:

```javascript
// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

export default firebaseConfig;
```

## Step 4: Enable Authentication

1. In the Firebase console, go to "Authentication" from the left sidebar
2. Click on "Get started"
3. Enable the "Email/Password" sign-in method
4. Optionally, you can also enable Google, Facebook, or other authentication providers

## Step 5: Set Up Firestore Database

1. In the Firebase console, go to "Firestore Database" from the left sidebar
2. Click on "Create database"
3. Choose "Start in production mode" and select a location close to your target users
4. Click "Next" and wait for the database to be provisioned

## Step 6: Configure Security Rules

1. In the Firestore Database section, go to the "Rules" tab
2. Copy and paste the following security rules (or use the ones from `firestore.rules`):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated users can access their own data only
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow read/write for demo user for convenient testing
      allow read, write: if request.auth != null && 
                          (request.auth.uid == userId || 
                           request.auth.token.email == "demo@example.com");
    }
    
    // Allow users to read and write only their own transactions
    match /transactions/{transactionId} {
      allow read: if request.auth != null && 
                   (resource.data.userId == request.auth.uid ||
                    request.auth.token.email == "demo@example.com");
      
      allow create: if request.auth != null && 
                     request.resource.data.userId == request.auth.uid;
      
      allow update, delete: if request.auth != null && 
                             resource.data.userId == request.auth.uid;
      
      // Additional validation for create and update operations
      allow create, update: if validTransaction(request.resource.data);
    }
    
    // Transaction validation function
    function validTransaction(transaction) {
      return transaction.userId != null &&
             transaction.amount != null &&
             transaction.type != null &&
             transaction.category != null &&
             transaction.date != null &&
             (transaction.type == 'income' || transaction.type == 'expense') &&
             transaction.amount is number &&
             transaction.amount > 0;
    }
    
    // Default deny all rule
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click "Publish" to apply the rules

## Step 7: Set Up Storage

1. In the Firebase console, go to "Storage" from the left sidebar
2. Click on "Get started"
3. Choose "Start in production mode" and select the same location as your Firestore Database
4. Click "Next" and wait for the storage to be provisioned
5. Go to the "Rules" tab and update the rules to allow authenticated users to upload profile images:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile_images/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                   request.auth.uid == userId.split('_')[0] &&
                   request.resource.size < 5 * 1024 * 1024 && // 5MB max
                   request.resource.contentType.matches('image/.*');
    }
    
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click "Publish" to apply the rules

## Step 8: Create a Demo User (Optional)

1. In the Firebase console, go to "Authentication" from the left sidebar
2. Click on "Add user"
3. Enter the email as "demo@example.com" and a password (e.g., "demo123456")
4. Click "Add user" to create the demo account

## Step 9: Test Your App

1. Run your Expense Tracker app
2. Try to register a new user
3. Try to log in with the new user or the demo account
4. Test adding, updating, and deleting transactions
5. Test uploading a profile image

## Troubleshooting

### Common Issues:

1. **"Firebase app already exists" error**: This might happen if you're trying to initialize Firebase multiple times. Make sure you're only initializing it once in your app.

2. **Authentication errors**: Check if you've enabled the Email/Password provider in the Firebase Authentication console.

3. **Firestore permission denied**: Verify your security rules and make sure the user is authenticated before trying to access Firestore.

4. **Storage upload failures**: Check your storage rules and make sure the file size and type are within the allowed limits.

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo with Firebase](https://docs.expo.dev/guides/using-firebase/)

## Next Steps

Now that you have Firebase set up, you can explore more advanced features:

- Implement social authentication (Google, Facebook, etc.)
- Set up Firebase Cloud Functions for backend processing
- Implement Push Notifications using Firebase Cloud Messaging
- Use Firebase Analytics to track user behavior 