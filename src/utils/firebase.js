import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import firebase configuration 
// Note: Users must create this file from firebase.config.example.js
import firebaseConfig from '../../firebase.config';

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Fallback configuration for demo purposes
  const demoConfig = {
    apiKey: "DEMO_API_KEY",
    authDomain: "expense-tracker-demo.firebaseapp.com",
    projectId: "expense-tracker-demo",
    storageBucket: "expense-tracker-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef1234567890",
  };
  
  // Show warning that we're using demo config
  console.warn(
    'Using demo Firebase configuration. Create a firebase.config.js file for production use.'
  );
  
  app = initializeApp(demoConfig);
}

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence for Firestore
if (process.env.NODE_ENV !== 'test') {
  try {
    enableIndexedDbPersistence(db)
      .then(() => {
        console.log('Firestore persistence enabled');
      })
      .catch((err) => {
        console.warn('Firestore persistence could not be enabled:', err);
      });
  } catch (err) {
    console.warn('Error enabling Firestore persistence:', err);
  }
}

// Debugging information - log Firebase configuration without sensitive data
console.log('Firebase Config (Sanitized):', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
});

// Note: We're using ImgBB for image storage instead of Firebase Storage
// See src/utils/imgbbConfig.js and src/utils/imageUpload.js for details

export { app, auth, db }; 