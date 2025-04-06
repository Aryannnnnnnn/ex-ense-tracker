import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  AppState,
  SafeAreaView,
  ScrollView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, sendEmailVerification, signOut, reload } from 'firebase/auth';
import theme from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const EmailVerificationScreen = ({ route, navigation }) => {
  // Use navigation from props, but also get it from hook for components that don't receive it
  const navigationFromHook = useNavigation();
  // Use the prop navigation if available, otherwise use the hook
  const nav = navigation || navigationFromHook;
  
  // Get email from route params or context
  const { email: routeEmail } = route.params || {};
  const { user: contextUser, checkEmailVerification } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const auth = getAuth();
  const user = auth.currentUser;
  const userEmail = routeEmail || user?.email || contextUser?.email || '';

  // Animate screen entry
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
    
    // Check if verification email was already sent recently
    const checkPreviousSend = async () => {
      try {
        const lastSent = await AsyncStorage.getItem('verificationEmailSent');
        if (lastSent) {
          const sentTime = parseInt(lastSent, 10);
          const currentTime = Date.now();
          const elapsedSeconds = Math.floor((currentTime - sentTime) / 1000);
          
          if (elapsedSeconds < 60) {
            setVerificationSent(true);
            setCountdown(60 - elapsedSeconds);
          }
        }
      } catch (error) {
        console.error('Error checking previous verification send:', error);
      }
    };
    
    checkPreviousSend();
    
    return () => {
      // Clean up animations if needed
    };
  }, []);

  // Handle countdown timer for resend cooldown
  useEffect(() => {
    if (countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown(prevTime => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [countdown]);

  // Handle app foreground/background transitions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // App has come to the foreground - check verification status
        if (user && !isCheckingStatus) {
          verifyEmailStatus();
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, isCheckingStatus]);

  // Setup verification check interval
  useEffect(() => {
    // Initial verification check when component mounts
    if (user) {
      verifyEmailStatus();
    }
    
    // Set up interval to check verification status periodically
    const verificationInterval = setInterval(() => {
      if (user && !isCheckingStatus) {
        verifyEmailStatus();
      }
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(verificationInterval);
    };
  }, [user]);

  // Function to verify email status
  const verifyEmailStatus = async () => {
    if (!user || user.emailVerified || isCheckingStatus) return;
    
    setIsCheckingStatus(true);
    try {
      // Force reload user to get fresh emailVerified status
      await reload(user);
      
      if (user.emailVerified) {
        // Email has been verified - navigate to main app
        await AsyncStorage.setItem('emailVerified', 'true');
        
        // Small delay before navigation to ensure state is updated
        setTimeout(() => {
          navigateToMainApp();
        }, 500);
      }
    } catch (error) {
      // Error handling
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Handle navigation to main app after verification
  const navigateToMainApp = async () => {
    try {
      // Check if onboarding has been completed
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      const onboardingRequired = await AsyncStorage.getItem('onboardingRequired');
      
      // Determine the route to navigate to
      const initialRoute = (onboardingCompleted === 'true' || !onboardingRequired) ? 'Main' : 'Onboarding';
      
      // Navigate directly to the appropriate screen using the correct routing
      nav.reset({
        index: 0,
        routes: [{ name: initialRoute }],
      });
    } catch (navError) {
      console.error('Navigation error:', navError);
      // Fallback navigation - try direct navigation
      try {
        // Simply trigger a reload by signing out and back in
        Alert.alert(
          'Verification Complete',
          'Your email has been verified. Please sign in again to continue.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await handleSignOut();
              }
            }
          ]
        );
      } catch (fallbackError) {
        console.error('Fallback navigation error:', fallbackError);
      }
    }
  };

  // Handle manual verification check
  const handleCheckVerification = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use the checkEmailVerification function from AuthContext if available
      if (checkEmailVerification) {
        const verified = await checkEmailVerification();
        if (verified) {
          // Navigate to main app
          navigateToMainApp();
          return;
        }
      } else {
        // Fallback to direct verification check
        await verifyEmailStatus();
        
        // If we're still here, verification hasn't succeeded
        if (!user.emailVerified) {
          Alert.alert(
            'Not Verified Yet',
            'It seems your email hasn\'t been verified yet. Please check your inbox and click the verification link.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Verification Error', 'Failed to check verification status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle send/resend of verification email
  const handleSendVerification = async () => {
    if (!user) return;
    
    setSending(true);
    try {
      await sendEmailVerification(user);
      
      // Store send time
      const sendTime = Date.now();
      await AsyncStorage.setItem('verificationEmailSent', sendTime.toString());
      
      setVerificationSent(true);
      setCountdown(60);
      
      Alert.alert(
        'Verification Email Sent',
        `We've sent a verification email to ${user.email}. Please check your inbox and spam folder.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      let errorMessage = 'Failed to send verification email.';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many verification emails sent. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Handle opening email client
  const handleOpenEmail = async () => {
    const emailProviders = {
      'gmail.com': 'https://mail.google.com',
      'outlook.com': 'https://outlook.live.com',
      'hotmail.com': 'https://outlook.live.com',
      'yahoo.com': 'https://mail.yahoo.com',
      'icloud.com': 'https://www.icloud.com/mail',
    };
    
    try {
      const domain = userEmail.split('@')[1]?.toLowerCase();
      
      if (domain && emailProviders[domain]) {
        await Linking.openURL(emailProviders[domain]);
      } else {
        // Try generic email app opener
        await Linking.openURL('mailto:');
      }
    } catch (error) {
      Alert.alert(
        'Email App',
        'Could not open email app automatically. Please check your email manually.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      
      // Reset state
      setVerificationSent(false);
      
      // Navigation fix: navigate to Login directly
      nav.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render loading state if user is null
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading user information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background.light}
        translucent={false}
      />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleSignOut}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Verification</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            width: '100%',
          }}
        >
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.08)']}
            style={styles.cardContainer}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="mail" size={64} color={theme.colors.primary} />
            </View>
            
            <Text style={styles.title}>Verify Your Email</Text>
            
            <Text style={styles.description}>
              We've sent a verification email to:
            </Text>
            
            <View style={styles.emailContainer}>
              <Text style={styles.emailText}>{userEmail}</Text>
            </View>
            
            <View style={styles.instructionsCard}>
              <Text style={styles.instructions}>
                Please check your inbox and click the verification link to activate your account.
                After verification, you can return here and continue to the app.
              </Text>
              
              <View style={styles.warningContainer}>
                <Ionicons name="alert-circle" size={24} color="#FF9500" />
                <Text style={styles.warningText}>
                  If you don't see the email, please check your spam or junk folder.
                </Text>
              </View>
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                title="I've Verified My Email"
                onPress={handleCheckVerification}
                loading={loading}
                style={styles.verifyButton}
                labelStyle={styles.buttonLabel}
              />
              
              <Button
                title="Open Email App"
                onPress={handleOpenEmail}
                variant="outline"
                iconName="mail-open-outline"
                style={styles.emailButton}
                labelStyle={styles.buttonLabel}
              />
              
              {countdown > 0 ? (
                <View style={styles.countdownContainer}>
                  <Ionicons name="time-outline" size={20} color={theme.colors.text.secondary} />
                  <Text style={styles.countdownText}>
                    Resend available in {countdown} seconds
                  </Text>
                </View>
              ) : (
                <Button
                  title={verificationSent ? "Resend Verification Email" : "Send Verification Email"}
                  onPress={handleSendVerification}
                  loading={sending}
                  variant="ghost"
                  iconName="refresh-outline"
                  style={styles.resendButton}
                  labelStyle={styles.resendButtonLabel}
                />
              )}
            </View>
            
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.colors.text.muted} />
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 16,
    backgroundColor: theme.colors.background.light,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(99, 102, 241, 0.3)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emailContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  emailText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  instructions: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFB74C',
    marginLeft: 8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
    gap: 16,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    marginBottom: 16,
    borderRadius: 12,
  },
  emailButton: {
    width: '100%',
    height: 56,
    marginBottom: 16,
    borderRadius: 12,
  },
  resendButton: {
    width: '100%',
    paddingVertical: 12,
    marginTop: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  resendButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginTop: 8,
  },
  countdownText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 16,
  },
  signOutText: {
    fontSize: 16,
    color: theme.colors.text.muted,
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
});

export default EmailVerificationScreen; 