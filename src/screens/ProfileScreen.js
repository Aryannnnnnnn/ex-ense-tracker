import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { updateProfile, signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatters';
import { useLoading } from '../hooks';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadImageToImgBB, getProfileImagePlaceholder, handleImageUpload } from '../utils/imageUpload';
import theme from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '../components/Button';
import AnimatedScreenWrapper from '../components/AnimatedScreenWrapper';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from 'react-native-toast-message';

const ProfileScreen = ({ navigation }) => {
  const { user, logoutUser, deleteAccount } = useAuth();
  const { loading, startLoading, stopLoading, executeWithLoading } = useLoading();
  
  const [displayName, setDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [bio, setBio] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load profile data from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      
      try {
        setProfileLoading(true);
        const userDocRef = doc(db, 'users', user.uid || user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setDisplayName(userData.displayName || user.displayName || '');
          setBio(userData.bio || '');
          setCurrency(userData.currency || 'INR');
          setMonthlyBudget(userData.monthlyBudget?.toString() || '');
          setProfileImage(userData.photoURL || user.photoURL || getProfileImagePlaceholder(userData.displayName));
        } else {
          // Initialize with auth data if available
          setDisplayName(user.displayName || '');
          setProfileImage(user.photoURL || getProfileImagePlaceholder(user.displayName));
          
          // Create a user document in Firestore
          await setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || getProfileImagePlaceholder(user.displayName),
            currency: 'INR',
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setProfileLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant permission to access your photos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    try {
      setSavingProfile(true);
      
      let photoURL = profileImage;
      // Upload new image if it's a local file (starts with 'file:' or is a blob)
      if (profileImage && (profileImage.startsWith('file:') || profileImage.startsWith('blob:'))) {
        try {
          setUploadingImage(true);
          
          // Show toast message about upload
          Toast.show({
            type: 'info',
            text1: 'Uploading image...',
            text2: 'This may take a moment depending on your connection',
            position: 'top',
            visibilityTime: 2000,
          });
          
          // Create a simple form data object to pass to handleImageUpload
          const formData = { photoURL };
          const setFormData = (newData) => {
            photoURL = newData.photoURL || newData.imageUrl;
          };
          
          // Upload using the improved handleImageUpload with progress tracking
          await handleImageUpload(
            profileImage,
            formData,
            setFormData,
            () => {}, // No camera to close
            setUploadingImage,
            setUploadProgress
          );
          
          if (photoURL && photoURL !== profileImage) {
            Toast.show({
              type: 'success',
              text1: 'Image uploaded successfully',
              position: 'top',
              visibilityTime: 2000,
            });
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          setUploadingImage(false);
          setUploadProgress(0);
          
          Toast.show({
            type: 'error',
            text1: 'Image upload failed',
            text2: 'Using local image instead',
            position: 'top',
            visibilityTime: 3000,
          });
          
          // Fallback to a placeholder if upload fails
          photoURL = getProfileImagePlaceholder(displayName);
        }
      }
      
      // Continue with profile update
      // Update Firestore profile
      const userDocRef = doc(db, 'users', user.uid || user.id);
      await updateDoc(userDocRef, {
        displayName,
        bio,
        currency,
        monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null,
        photoURL,
        updatedAt: new Date(),
      });
      
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL,
      });
      
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
      setUploadProgress(0);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            startLoading();
            try {
              // Clear any stored authentication data first
              await AsyncStorage.removeItem('user');
              await AsyncStorage.removeItem('onboardingCompleted');
              
              // Explicitly call Firebase signOut
              await signOut(auth);
              
              // Clear the user state
              await logoutUser();
              
              // Navigate to Login screen using reset to prevent going back
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Logout Failed', 'Please try again.');
            } finally {
              stopLoading();
            }
          } 
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to delete your account');
      setShowDeleteModal(false);
      return;
    }
    
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password to confirm account deletion');
      return;
    }
    
    setDeletingAccount(true);
    const success = await deleteAccount(deletePassword);
    setDeletingAccount(false);
    
    if (success) {
      setShowDeleteModal(false);
      // Navigate to the login screen - this should happen automatically as the user will be logged out
    } else {
      // Error is set by the deleteAccount function
      // We can access it via auth context if needed
    }
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  
  if (!user) {
    // Redirect to login if no user is found after loading
    setTimeout(() => {
      navigation.navigate('Login');
    }, 100);
    
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Please login to view profile</Text>
      </View>
    );
  }

  return (
    <AnimatedScreenWrapper>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.headerButton} 
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                
                {!editMode && (
                  <TouchableOpacity 
                    style={styles.headerButton} 
                    onPress={() => setEditMode(true)}
                  >
                    <Ionicons name="create-outline" size={24} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            
              <TouchableOpacity 
                style={styles.profileImageContainer}
                onPress={editMode ? handlePickImage : null}
                disabled={!editMode || uploadingImage}
              >
                {uploadingImage ? (
                  <View style={styles.uploadingContainer}>
                    {uploadProgress > 0 ? (
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                        <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
                      </View>
                    ) : (
                      <ActivityIndicator size="large" color="white" />
                    )}
                  </View>
                ) : profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={60} color="white" />
                  </View>
                )}
                {editMode && !uploadingImage && (
                  <View style={styles.editImageOverlay}>
                    <Ionicons name="camera" size={24} color="white" />
                    <Text style={styles.editImageText}>Edit</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.profileInfo}>
                {editMode ? (
                  <TextInput
                    style={styles.nameInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your Name"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    maxLength={30}
                  />
                ) : (
                  <Text style={styles.userName}>{displayName || 'No Name Set'}</Text>
                )}
                <Text style={styles.userEmail}>{user?.email || 'No email address'}</Text>
              </View>
            </LinearGradient>

            <View style={styles.contentContainer}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person-circle-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Personal Information</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bio</Text>
                  {editMode ? (
                    <TextInput
                      style={styles.input}
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Tell us about yourself"
                      multiline
                      maxLength={150}
                    />
                  ) : (
                    <Text style={styles.valueText}>
                      {bio || 'No bio added yet'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Financial Settings</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Preferred Currency</Text>
                  {editMode ? (
                    <View style={styles.pickerContainer}>
                      <TouchableOpacity 
                        style={[
                          styles.currencyOption, 
                          currency === 'USD' && styles.selectedCurrencyOption
                        ]}
                        onPress={() => setCurrency('USD')}
                      >
                        <Text style={[
                          styles.currencyText, 
                          currency === 'USD' && styles.selectedCurrencyText
                        ]}>
                          $ (USD)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.currencyOption, 
                          currency === 'EUR' && styles.selectedCurrencyOption
                        ]}
                        onPress={() => setCurrency('EUR')}
                      >
                        <Text style={[
                          styles.currencyText, 
                          currency === 'EUR' && styles.selectedCurrencyText
                        ]}>
                          € (EUR)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.currencyOption, 
                          currency === 'INR' && styles.selectedCurrencyOption
                        ]}
                        onPress={() => setCurrency('INR')}
                      >
                        <Text style={[
                          styles.currencyText, 
                          currency === 'INR' && styles.selectedCurrencyText
                        ]}>
                          ₹ (INR)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.valueText}>
                      {currency === 'USD' ? '$ (USD)' : currency === 'EUR' ? '€ (EUR)' : '₹ (INR)'}
                    </Text>
                  )}
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Monthly Budget</Text>
                  {editMode ? (
                    <TextInput
                      style={styles.input}
                      value={monthlyBudget}
                      onChangeText={setMonthlyBudget}
                      placeholder="Enter your monthly budget"
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={styles.valueText}>
                      {monthlyBudget ? formatCurrency(Number(monthlyBudget), currency) : 'No budget set'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            
            {editMode ? (
              <View style={styles.buttonContainer}>
                <Button
                  title="Cancel"
                  onPress={() => setEditMode(false)}
                  variant="outline"
                  style={styles.cancelButton}
                  disabled={savingProfile}
                />
                <Button
                  title="Save Changes"
                  onPress={saveProfile}
                  loading={savingProfile}
                  style={styles.saveButton}
                />
              </View>
            ) : (
              <View style={styles.buttonContainer}>
                <Button
                  title="Log Out"
                  onPress={handleLogout}
                  variant="secondary"
                  style={styles.logoutButton}
                  loading={loading}
                  icon="log-out-outline"
                />
                
                <Button
                  title="Delete Account"
                  onPress={() => setShowDeleteModal(true)}
                  variant="destructive"
                  style={styles.deleteAccountButton}
                  icon="trash-outline"
                />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
        }}
        title="Delete Account"
        message="Warning: This action is permanent and cannot be undone. All your data, including transactions and settings, will be permanently deleted. Please enter your password to confirm."
        cancelText="Cancel"
        confirmText="Delete Account"
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
        }}
        onConfirm={handleDeleteAccount}
        confirmButtonType="destructive"
        loading={deletingAccount}
        customContent={
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
        }
      />
    </AnimatedScreenWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  uploadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  editImageText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 14,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 4,
    marginBottom: 4,
    width: '80%',
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    color: theme.colors.text.primary,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: theme.colors.text.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background.light,
    color: theme.colors.text.primary,
  },
  valueText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    paddingVertical: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currencyOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  selectedCurrencyOption: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  currencyText: {
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  selectedCurrencyText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    width: '100%',
    flexDirection: 'column',
  },
  logoutButton: {
    marginBottom: 12,
    width: '100%',
  },
  deleteAccountButton: {
    backgroundColor: theme.colors.status.error,
    width: '100%',
  },
  cancelButton: {
    marginBottom: 12,
    width: '100%',
  },
  saveButton: {
    width: '100%',
  },
  passwordInputContainer: {
    marginTop: 16,
    marginBottom: 8,
    width: '100%',
  },
  passwordInput: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.light,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  progressContainer: {
    width: '80%',
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
  },
  progressText: {
    position: 'absolute',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    left: 0,
    right: 0,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ProfileScreen; 