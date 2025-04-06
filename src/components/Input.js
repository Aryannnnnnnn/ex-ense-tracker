import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform, Animated, ActivityIndicator } from 'react-native';
import theme from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { isValidEmail } from '../utils/validators';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  error,
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  rightIcon,
  iconName,
  onRightIconPress,
  editable = true,
  containerStyle,
  inputStyle,
  labelStyle,
  helper,
  isEmail = false,
  textColor,
  placeholderTextColor,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const [localError, setLocalError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [emailState, setEmailState] = useState('default'); // 'default', 'valid', 'invalid'
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Handle email validation if isEmail is true
  useEffect(() => {
    if (isEmail && value) {
      // Only validate when user has stopped typing for a moment
      const timeoutId = setTimeout(() => {
        if (value.length > 0) {
          setIsValidating(true);
          // Small delay to show the validation spinner
          setTimeout(() => {
            const isValid = isValidEmail(value);
            setEmailState(isValid ? 'valid' : 'invalid');
            if (!isValid && !error) {
              setLocalError('Please enter a valid email format');
            } else if (isValid) {
              setLocalError('');
            }
            setIsValidating(false);
            
            // Fade in the validation indicator
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }, 500);
        } else {
          setEmailState('default');
          setLocalError('');
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [value, isEmail, error]);

  const handleFocus = () => {
    setIsFocused(true);
    // Reset fade animation on focus
    fadeAnim.setValue(0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // For email fields, validate on blur
    if (isEmail && value) {
      const isValid = isValidEmail(value);
      setEmailState(isValid ? 'valid' : 'invalid');
      if (!isValid && !error) {
        setLocalError('Please enter a valid email format');
      }
      
      // Fade in the validation indicator
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const togglePasswordVisibility = () => setIsPasswordVisible(prev => !prev);

  // Get the right email icon based on validation state
  const getEmailIcon = () => {
    if (isValidating) {
      return <ActivityIndicator size="small" color={theme.colors.primary} />;
    }
    
    switch (emailState) {
      case 'valid':
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.status.success} />
          </Animated.View>
        );
      case 'invalid':
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.status.error} />
          </Animated.View>
        );
      default:
        return rightIcon || null;
    }
  };

  // Determine if we should show the email error
  const showEmailError = isEmail && emailState === 'invalid' && (isFocused || localError);
  const displayError = error || (showEmailError ? localError : '');

  // Get border color based on focus and validation state
  const getBorderStyle = () => {
    if (error) {
      return styles.errorInput;
    }
    
    if (isFocused) {
      return styles.focusedInput;
    }
    
    if (isEmail) {
      if (emailState === 'valid') {
        return styles.validInput;
      }
      if (emailState === 'invalid' && value) {
        return styles.errorInput;
      }
    }
    
    return {};
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          getBorderStyle(),
          !editable && styles.disabledInput,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        
        {iconName && !leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons 
              name={iconName} 
              size={18} 
              color={isFocused ? theme.colors.primary : theme.colors.text.secondary} 
            />
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            (leftIcon || iconName) && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry || isEmail) && styles.inputWithRightIcon,
            multiline && styles.multilineInput,
            inputStyle,
            textColor && { color: textColor },
          ]}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (isEmail && emailState !== 'default') {
              setEmailState('default');
              setLocalError('');
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || theme.colors.text.muted}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={isEmail ? 'email-address' : keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          editable={editable}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity 
            style={styles.rightIconContainer} 
            onPress={togglePasswordVisibility}
          >
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color={theme.colors.text.secondary} 
            />
          </TouchableOpacity>
        )}
        
        {isEmail && !secureTextEntry && (
          <View style={styles.rightIconContainer}>
            {getEmailIcon()}
          </View>
        )}
        
        {rightIcon && !secureTextEntry && !isEmail && (
          <TouchableOpacity 
            style={styles.rightIconContainer} 
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {displayError ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color={theme.colors.status.error} />
          {' '}{displayError}
        </Text>
      ) : helper ? (
        <Text style={styles.helperText}>{helper}</Text>
      ) : isEmail && emailState === 'valid' && value ? (
        <Text style={styles.successText}>
          <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.status.success} />
          {' '}Email format is valid
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.light,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    minHeight: 48,
  },
  multilineInput: {
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  leftIconContainer: {
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs,
  },
  rightIconContainer: {
    paddingRight: theme.spacing.md,
    paddingLeft: theme.spacing.xs,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  focusedInput: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    backgroundColor: theme.colors.background.white,
  },
  validInput: {
    borderColor: theme.colors.status.success,
    backgroundColor: `${theme.colors.status.success}05`,
  },
  errorInput: {
    borderColor: theme.colors.status.error,
    backgroundColor: `${theme.colors.status.error}05`,
  },
  disabledInput: {
    backgroundColor: theme.colors.background.light,
    opacity: 0.7,
  },
  errorText: {
    color: theme.colors.status.error,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    color: theme.colors.status.success,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
});

export default Input; 