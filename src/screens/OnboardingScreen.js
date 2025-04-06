import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatters';
import { useLoading } from '../hooks';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToImgBB, getProfileImagePlaceholder } from '../utils/imageUpload';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../theme';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { loading, startLoading, stopLoading, executeWithLoading } = useLoading();
  
  // Profile data
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [bio, setBio] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Onboarding flags
  const [nameValid, setNameValid] = useState(false);
  const [currencyValid, setCurrencyValid] = useState(true); // Default to true since we have a default

  // Check onboarding status first - before rendering any UI
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      try {
        // Check AsyncStorage first (fastest check)
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        if (onboardingCompleted === 'true') {
          // Skip loading any data, just navigate to Main
          navigation.replace('Main');
          return;
        }
        
        // Also check Firestore as a backup
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().onboardingCompleted) {
          // Set onboarding as completed in AsyncStorage
          await AsyncStorage.setItem('onboardingCompleted', 'true');
          await AsyncStorage.removeItem('onboardingRequired');
          
          // Navigate to main app
          navigation.replace('Main');
          return;
        }
        
        // If we're here, onboarding is needed, so proceed with initialization
        initializeUserData();
      } catch (error) {
        // Proceed with initialization even if there was an error
        initializeUserData();
      }
    };
    
    checkOnboardingStatus();
  }, [user, navigation]);

  // Load initial user data (only called if onboarding is needed)
  const initializeUserData = async () => {
    if (!user) return;
    
    try {
      // Set initial display name from auth
      if (user.displayName) {
        setDisplayName(user.displayName);
        setNameValid(true);
      }
      
      // Set initial profile image from auth
      if (user.photoURL) {
        setProfileImage(user.photoURL);
      } else {
        // Use placeholder if no photo is available
        setProfileImage(getProfileImagePlaceholder(user.displayName || ''));
      }
      
      // Check if user doc exists for partial data
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // Populate the form with existing data
        const userData = userDoc.data();
        setDisplayName(userData.displayName || user.displayName || '');
        setBio(userData.bio || '');
        setCurrency(userData.currency || 'INR');
        setMonthlyBudget(userData.monthlyBudget?.toString() || '');
        setProfileImage(userData.photoURL || user.photoURL || getProfileImagePlaceholder(userData.displayName));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setIsInitializing(false);
    }
  };

  // Validate inputs for each step
  useEffect(() => {
    // Validate name
    setNameValid(displayName.trim().length >= 2);
    
    // Validate currency (simple check for now)
    setCurrencyValid(currency.trim().length >= 1);
  }, [displayName, currency]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'You need to grant permission to access your photos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (step === 1 && !nameValid) {
      Alert.alert('Invalid Name', 'Please enter your name (at least 2 characters)');
      return;
    }
    
    if (step === 2 && !currencyValid) {
      Alert.alert('Invalid Currency', 'Please enter your preferred currency');
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Final step, save all data
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;
    
    try {
      setSavingProfile(true);
      
      let photoURL = profileImage;
      // Upload new image if it's a local file (starts with 'file:' or is a blob)
      if (profileImage && (profileImage.startsWith('file:') || profileImage.startsWith('blob:'))) {
        try {
          // Upload to ImgBB using the unique user ID
          photoURL = await uploadImageToImgBB(
            profileImage,
            `profile_${user.id}`
          );
        } catch (uploadError) {
          // Fallback to a placeholder if upload fails
          photoURL = getProfileImagePlaceholder(displayName);
        }
      }
      
      // Create or update user document in Firestore
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userDocRef, {
          displayName,
          bio,
          currency,
          monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null,
          photoURL,
          onboardingCompleted: true,
          updatedAt: new Date(),
        });
      } else {
        // Create new document
        await setDoc(userDocRef, {
          email: user.email,
          displayName,
          bio,
          currency,
          monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null,
          photoURL,
          onboardingCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL,
      });
      
      // Mark onboarding as completed
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      // Remove onboardingRequired flag
      await AsyncStorage.removeItem('onboardingRequired');
      
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
      
    } catch (error) {
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Render different content based on current step
  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Welcome to Expense Tracker!</Text>
            <Text style={styles.stepDescription}>Let's start with the basics. What should we call you?</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                maxLength={30}
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.profileImageSection}>
              <Text style={styles.inputLabel}>Profile Picture</Text>
              <TouchableOpacity 
                style={styles.profileImageContainer}
                onPress={handlePickImage}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={60} color="#ccc" />
                  </View>
                )}
                <View style={styles.editImageOverlay}>
                  <Ionicons name="camera" size={24} color="white" />
                  <Text style={styles.editImageText}>Add Photo</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.stepIndicator}>
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>
        );
        
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
            <Text style={styles.stepDescription}>This helps personalize your experience</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bio (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us a little about yourself"
                multiline
                maxLength={150}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Preferred Currency</Text>
              <TextInput
                style={styles.input}
                value={currency}
                onChangeText={setCurrency}
                placeholder="INR"
                maxLength={3}
                autoCapitalize="characters"
              />
              <Text style={styles.helperText}>Enter the 3-letter code (e.g., USD, EUR, GBP)</Text>
            </View>
            
            <View style={styles.stepIndicator}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
            </View>
          </View>
        );
        
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Set your budget goals</Text>
            <Text style={styles.stepDescription}>This helps you track your financial progress</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Monthly Budget (Optional)</Text>
              <Text style={styles.inputDescription}>
                Setting a monthly budget helps you track spending and receive alerts when approaching your limit.
              </Text>
              <View style={styles.budgetInputContainer}>
                <Text style={styles.currencyPrefix}>
                  {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : currency}
                </Text>
                <TextInput
                  style={styles.budgetInput}
                  value={monthlyBudget}
                  onChangeText={setMonthlyBudget}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.helperText}>
                You can always update this later in your profile or budget settings.
              </Text>
            </View>
            
            <View style={styles.completionMessage}>
              <Ionicons name="checkmark-circle" size={48} color="#34C759" />
              <Text style={styles.completionText}>
                You're all set! Click "Complete" to start tracking your expenses.
              </Text>
            </View>
            
            <View style={styles.stepIndicator}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={[styles.dot, styles.activeDot]} />
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  // If still initializing, show a loading spinner
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background.light }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 20, fontSize: 16, color: theme.colors.text.secondary }}>
          Preparing your profile...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderStepContent()}
          
          <View style={styles.navigationButtons}>
            {step > 1 && (
              <TouchableOpacity 
                style={[styles.button, styles.backButton]}
                onPress={handleBack}
                disabled={savingProfile}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.nextButton,
                (step === 1 && !nameValid) ? styles.disabledButton : null,
                (step === 2 && !currencyValid) ? styles.disabledButton : null,
              ]}
              onPress={handleNext}
              disabled={
                savingProfile || 
                (step === 1 && !nameValid) || 
                (step === 2 && !currencyValid)
              }
            >
              {savingProfile && step === 3 ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {step < 3 ? 'Next' : 'Complete'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 5,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },
  button: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    flex: 1,
    marginLeft: 15,
  },
  disabledButton: {
    backgroundColor: theme.colors.primary_light,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: theme.colors.text.light,
    fontSize: 16,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  profileImageSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    width: '100%',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.light,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 10,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.light,
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    alignItems: 'center',
  },
  editImageText: {
    color: theme.colors.text.light,
    fontSize: 12,
  },
  completionMessage: {
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 10,
  },
  completionText: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.background.card,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.card,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    paddingRight: 8,
  },
  budgetInput: {
    flex: 1,
    height: 50,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  inputDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  summaryValueMuted: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.text.muted,
    fontStyle: 'italic',
  },
});

export default OnboardingScreen; 