import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import theme from '../theme';
import Input from '../components/Input';
import { useForm } from '../hooks';
import { validateEmail } from '../utils/validators';
import { useFadeIn } from '../hooks/useAnimatedValue';

const ForgotPasswordScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Animations for staggered appearance
  const { opacity: fadeAnim } = useFadeIn(800);
  const { opacity: formFadeAnim } = useFadeIn(1000);

  const handleResetPassword = async ({ email }) => {
    try {
      setLoading(true);
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      
      setEmailSent(true);
      Alert.alert(
        'Email Sent',
        `We've sent a password reset email to ${email}. Please check your inbox and follow the instructions to reset your password.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'An error occurred while sending the password reset email';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No user found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is invalid';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      }
      
      Alert.alert('Reset Password Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initialize form with validation
  const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid } = useForm({
    initialValues: {
      email: '',
    },
    validationSchema: {
      email: validateEmail,
    },
    onSubmit: handleResetPassword
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBarWrapper />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Forgot Password</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {/* Logo and title */}
          <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
            <Image 
              source={require('../../assets/app-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Password Reset</Text>
            <Text style={styles.subtitle}>
              {emailSent 
                ? "Check your email for reset instructions" 
                : "Enter your email to receive a reset link"}
            </Text>
          </Animated.View>
          
          {/* Form */}
          {!emailSent && (
            <Animated.View style={[styles.formContainer, { opacity: formFadeAnim }]}>
              <Input
                label="Email"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                error={touched.email && errors.email}
                leftIcon={<Ionicons name="mail-outline" size={20} color="#FFFFFF" />}
                textColor="#FFFFFF"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
              />
              
              <TouchableOpacity
                style={[styles.button, !isValid && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!isValid || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {/* Success view */}
          {emailSent && (
            <View style={styles.successContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={80} color={theme.colors.primary} />
              </View>
              <Text style={styles.successText}>Reset Email Sent!</Text>
              <Text style={styles.instructionsText}>
                We've sent instructions to reset your password to your email address. Please check your inbox.
              </Text>
              
              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.buttonText}>Return to Login</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Custom StatusBar component for better appearance
const StatusBarWrapper = () => {
  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.background.light}
        translucent={true}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: '#E0E0E0',
    textAlign: 'center',
    marginHorizontal: theme.spacing.lg,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    height: 56,
    paddingHorizontal: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(160, 149, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  successText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: theme.typography.fontSize.md,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
});

export default ForgotPasswordScreen; 