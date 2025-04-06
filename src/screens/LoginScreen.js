import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validateRequired } from '../utils/validators';
import { useForm } from '../hooks';
import { Ionicons } from '@expo/vector-icons';
import { useFadeIn } from '../hooks/useAnimatedValue';
import { Animated } from 'react-native';
import { getAuth } from 'firebase/auth';
import theme from '../theme';
import Input from '../components/Input';

const LoginScreen = ({ navigation }) => {
  const { loginUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Animations for staggered appearance
  const { opacity: fadeAnim } = useFadeIn(1000);
  const { opacity: formFadeAnim } = useFadeIn(1200);
  const { opacity: buttonsFadeAnim } = useFadeIn(1400);

  const handleLogin = async ({ email, password }) => {
    try {
      setLoading(true);
      const success = await loginUser(email, password);
      
      if (success) {
        // Check if email is verified
        const auth = getAuth();
        if (auth.currentUser) {
          // Force a reload to get the latest verification status
          await auth.currentUser.reload();
          
          if (!auth.currentUser.emailVerified) {
            // If email is not verified, send to verification screen
            navigation.navigate('EmailVerification', { 
              email: auth.currentUser.email 
            });
          }
          // If email is verified, navigation will be handled by AuthContext
        }
      } else {
        Alert.alert(
          'Login Failed', 
          'Invalid email or password. Please try again.',
          [{ text: 'OK', onPress: () => setLoading(false) }]
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'An error occurred during login';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is invalid';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      }
      
      Alert.alert('Login Error', errorMessage, [
        { text: 'OK', onPress: () => setLoading(false) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize form with validation
  const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid } = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: {
      email: validateEmail,
      password: (val) => validateRequired(val, 'Password'),
    },
    onSubmit: handleLogin
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo & Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Image 
            source={require('../../assets/app-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[styles.form, { opacity: formFadeAnim }]}>
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
          
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.buttonContainer, { opacity: buttonsFadeAnim }]}>
          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing['3xl'],
    marginBottom: theme.spacing.xl
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: '#E0E0E0',
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg
  },
  form: {
    width: '100%',
    marginBottom: theme.spacing.lg
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    height: 55,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.text.white,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
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

export default LoginScreen; 