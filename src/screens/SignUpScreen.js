import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, validateRequired } from '../utils/validators';
import { useForm } from '../hooks';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import theme from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Input from '../components/Input';
import { StatusBar } from 'react-native';

const SignUpScreen = ({ navigation }) => {
  const { registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async ({ name, email, password }) => {
    try {
      setLoading(true);
      const success = await registerUser(email, password, name);
      
      if (success) {
        // Registration successful, now send verification email
        const auth = getAuth();
        const user = auth.currentUser;
        
        try {
          await sendEmailVerification(user);
          
          // Store that we've sent a verification email with timestamp
          await AsyncStorage.setItem('verificationEmailSent', Date.now().toString());
          
          // Navigate to verification screen with clear instructions
          navigation.navigate('EmailVerification', { 
            email,
            freshSignup: true // Flag to indicate this is a fresh signup
          });
        } catch (verificationError) {
          // Still navigate to verification screen, but user may need to resend
          Alert.alert(
            'Verification Email',
            'We had trouble sending your verification email. You can try resending it from the next screen.',
            [{ text: 'Continue', onPress: () => {
              navigation.navigate('EmailVerification', { email });
            }}]
          );
        }
      } else {
        Alert.alert('Registration Failed', 'There was a problem creating your account. Please try again.');
      }
    } catch (error) {
      let errorMessage = 'An error occurred during registration';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use. Please try another email or login instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is invalid.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initialize form with validation
  const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid } = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema: {
      name: (val) => validateRequired(val, 'Name'),
      email: validateEmail,
      password: validatePassword,
      confirmPassword: (val, allValues) => {
        if (!val) return 'Confirm password is required';
        if (val !== allValues.password) return 'Passwords do not match';
        return '';
      }
    },
    onSubmit: handleSignUp
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background.light} />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          {/* Name Input */}
          <Input
            label="Full Name"
            value={values.name}
            onChangeText={handleChange('name')}
            onBlur={handleBlur('name')}
            placeholder="Enter your name"
            autoCapitalize="words"
            error={touched.name && errors.name}
            leftIcon={<Ionicons name="person-outline" size={20} color="#FFFFFF" />}
            textColor="#FFFFFF"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
          />

          {/* Email Input */}
          <Input
            label="Email Address"
            value={values.email}
            onChangeText={handleChange('email')}
            onBlur={handleBlur('email')}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={touched.email && errors.email}
            leftIcon={<Ionicons name="mail-outline" size={20} color="#FFFFFF" />}
            isEmail={true}
            textColor="#FFFFFF"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
          />

          {/* Password Input */}
          <Input
            label="Password"
            value={values.password}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            error={touched.password && errors.password}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#FFFFFF" />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            }
            textColor="#FFFFFF"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
          />

          {/* Confirm Password Input */}
          <Input
            label="Confirm Password"
            value={values.confirmPassword}
            onChangeText={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            placeholder="Confirm your password"
            secureTextEntry={!showConfirmPassword}
            error={touched.confirmPassword && errors.confirmPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#FFFFFF" />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            }
            textColor="#FFFFFF"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
          />

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
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
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  formContainer: {
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    height: 56,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  footerText: {
    color: '#E0E0E0',
    fontSize: theme.typography.fontSize.sm,
    marginRight: theme.spacing.xs,
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default SignUpScreen; 