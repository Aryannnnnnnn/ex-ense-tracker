import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Get additional user data from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          // Create user object with Firebase auth data
          const userData = {
            id: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || 'User',
            photoURL: currentUser.photoURL,
            emailVerified: currentUser.emailVerified,
            // Add additional Firestore data if available
            ...(userDoc.exists() ? userDoc.data() : {})
          };
          
          setUser(userData);
          // Store user data in AsyncStorage for offline access
          AsyncStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to basic user data if Firestore fetch fails
          const userData = {
            id: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || 'User',
            photoURL: currentUser.photoURL,
            emailVerified: currentUser.emailVerified,
          };
          setUser(userData);
          AsyncStorage.setItem('user', JSON.stringify(userData));
        }
      } else {
        setUser(null);
        AsyncStorage.removeItem('user');
      }
      setLoading(false);
    });
    
    // Check for cached user if not yet authenticated
    const loadCachedUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser && !user) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
      }
    };
    
    loadCachedUser();
    
    // Clean up the listener on unmount
    return unsubscribe;
  }, []);

  const loginUser = async (email, password) => {
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // We need to check if the user has completed onboarding
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().onboardingCompleted) {
        await AsyncStorage.setItem('onboardingCompleted', 'true');
      } else {
        await AsyncStorage.removeItem('onboardingCompleted');
      }
      
      return true;
    } catch (error) {
      let errorMessage = 'An error occurred during login';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/user-not-found':
          errorMessage = 'User not found. Please check your email or sign up';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        default:
          errorMessage = error.message;
      }
      
      setError(errorMessage);
      return false;
    }
  };

  const registerUser = async (email, password, name) => {
    setError('');
    try {
      // Create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Create a minimal user document in Firestore
      // Note: We don't set onboardingCompleted to true here so the user will go through onboarding
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        email: userCredential.user.email,
        displayName: name,
        createdAt: new Date(),
        onboardingCompleted: false, // Ensure user goes through onboarding
      });
      
      // Make sure onboardingCompleted is not set in AsyncStorage
      await AsyncStorage.removeItem('onboardingCompleted');
      // Explicitly set onboardingRequired to true in AsyncStorage to ensure onboarding happens
      await AsyncStorage.setItem('onboardingRequired', 'true');
      
      // Refresh user to get updated profile
      await userCredential.user.reload();
      
      // Authentication listener will update the user state
      return true;
    } catch (error) {
      let errorMessage = 'An error occurred during registration';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          errorMessage = error.message;
      }
      
      setError(errorMessage);
      return false;
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      // Additionally clear onboarding state
      await AsyncStorage.removeItem('onboardingCompleted');
      // Auth listener will handle clearing the user state
      return true;
    } catch (error) {
      return false;
    }
  };

  // Improved method to resend verification email with better error handling
  const resendVerificationEmail = async () => {
    try {
      if (!auth.currentUser) {
        return false;
      }
      
      // Try with custom settings first if needed
      try {
        await sendEmailVerification(auth.currentUser);
        
        // Record that we sent a verification email
        await AsyncStorage.setItem('verificationEmailSent', Date.now().toString());
        return true;
      } catch (error) {
        // Common Firebase errors with user-friendly messages
        if (error.code === 'auth/too-many-requests') {
          setError('Too many verification emails sent. Please try again later.');
        } else if (error.code === 'auth/invalid-email') {
          setError('The email address is invalid.');
        } else if (error.code === 'auth/user-not-found') {
          setError('Account not found. Please try logging in again.');
        } else {
          setError('Failed to send verification email. Please try again later.');
        }
        return false;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return false;
    }
  };

  // Improved method to check verification status with better reloading
  const checkEmailVerification = async () => {
    try {
      if (!auth.currentUser) {
        return false;
      }
      
      // First try to get a fresh token to force refresh
      try {
        await auth.currentUser.getIdToken(true);
      } catch (tokenError) {
        // Continue with reload
      }
      
      // Now reload the user object to get the latest state
      try {
        await auth.currentUser.reload();
        
        if (auth.currentUser.emailVerified) {
          // Update our user state with verification status
          const updatedUser = {
            ...user,
            emailVerified: true
          };
          
          setUser(updatedUser);
          
          // Also update in AsyncStorage
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Mark verification as complete in AsyncStorage (for multiple components that might check)
          await AsyncStorage.setItem('emailVerified', 'true');
          
          return true;
        } else {
          return false;
        }
      } catch (reloadError) {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Delete user account and all associated data
  const deleteAccount = async (password) => {
    setError('');
    try {
      if (!auth.currentUser) {
        setError('You must be logged in to delete your account');
        return false;
      }

      // Re-authenticate the user before deletion
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      
      try {
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch (reauthError) {
        setError('Authentication failed. Please check your password and try again.');
        return false;
      }
      
      // Delete user data from Firestore
      try {
        const userId = auth.currentUser.uid;
        
        // Delete user document
        const userDocRef = doc(db, 'users', userId);
        await deleteDoc(userDocRef);
        
        // Delete user transactions
        const transactionsRef = collection(db, 'transactions');
        const transactionsQuery = query(transactionsRef, where('userId', '==', userId));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        const transactionDeletePromises = [];
        transactionsSnapshot.forEach((doc) => {
          transactionDeletePromises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(transactionDeletePromises);
        
        // Delete budget data
        const budgetsRef = collection(db, 'budgets');
        const budgetsQuery = query(budgetsRef, where('userId', '==', userId));
        const budgetsSnapshot = await getDocs(budgetsQuery);
        
        const budgetDeletePromises = [];
        budgetsSnapshot.forEach((doc) => {
          budgetDeletePromises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(budgetDeletePromises);
        
        // Delete recurring transactions
        const recurringRef = collection(db, 'recurringTransactions');
        const recurringQuery = query(recurringRef, where('userId', '==', userId));
        const recurringSnapshot = await getDocs(recurringQuery);
        
        const recurringDeletePromises = [];
        recurringSnapshot.forEach((doc) => {
          recurringDeletePromises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(recurringDeletePromises);
        
        // Delete any other user-specific data (categories, settings, etc.)
        const settingsRef = collection(db, 'settings');
        const settingsQuery = query(settingsRef, where('userId', '==', userId));
        const settingsSnapshot = await getDocs(settingsQuery);
        
        const settingsDeletePromises = [];
        settingsSnapshot.forEach((doc) => {
          settingsDeletePromises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(settingsDeletePromises);
      } catch (firestoreError) {
        // Continue with account deletion even if Firestore deletion fails
      }
      
      // Delete user from Firebase Auth
      await deleteUser(auth.currentUser);
      
      // Clear local storage
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('onboardingCompleted');
      await AsyncStorage.removeItem(`transactions_${user.id}`);
      await AsyncStorage.removeItem(`settings_${user.id}`);
      await AsyncStorage.removeItem(`budgets_${user.id}`);
      
      return true;
    } catch (error) {
      setError(error.message || 'Failed to delete account. Please try again.');
      return false;
    }
  };

  // Update user profile
  const updateUserProfile = async (displayName, photoURL) => {
    setError('');
    try {
      if (!auth.currentUser) {
        setError('You must be logged in to update your profile');
        return false;
      }

      // Update profile in Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: displayName || user.name,
        photoURL: photoURL || user.photoURL
      });

      // Update in Firestore if the document exists
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          // Only update fields that are provided
          const updateData = {};
          if (displayName) updateData.displayName = displayName;
          if (photoURL) updateData.photoURL = photoURL;
          
          await setDoc(userDocRef, updateData, { merge: true });
        }
      } catch (firestoreError) {
        // Continue with profile update even if Firestore update fails
      }

      // Refresh user to get updated profile
      await auth.currentUser.reload();
      
      // Update user state
      const updatedUser = {
        ...user,
        name: displayName || user.name,
        photoURL: photoURL || user.photoURL
      };
      
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return true;
    } catch (error) {
      setError('Failed to update profile. Please try again.');
      return false;
    }
  };

  // Complete onboarding process
  const completeOnboarding = async () => {
    try {
      if (!user) {
        return false;
      }
      
      // Update Firestore
      const userDocRef = doc(db, 'users', user.id);
      await setDoc(userDocRef, {
        onboardingCompleted: true
      }, { merge: true });
      
      // Update local storage
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      
      // Update user state
      const updatedUser = {
        ...user,
        onboardingCompleted: true
      };
      
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return true;
    } catch (error) {
      return false;
    }
  };

  const value = {
    user,
    loading,
    error,
    loginUser,
    registerUser,
    logoutUser,
    resendVerificationEmail,
    checkEmailVerification,
    deleteAccount,
    updateProfile: updateUserProfile,
    completeOnboarding
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 