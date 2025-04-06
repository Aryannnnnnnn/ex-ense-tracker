import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import theme from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost'
  size = 'medium', // 'small', 'medium', 'large'
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  iconName,
  rounded = false,
  style,
  textStyle,
  ...props
}) => {
  
  const animatableRef = React.useRef();
  
  const handlePressIn = () => {
    animatableRef.current?.animate({ scale: 0.97 }, 100);
  };
  
  const handlePressOut = () => {
    animatableRef.current?.animate({ scale: 1 }, 200);
  };
  
  const getButtonStyles = () => {
    const baseStyles = [styles.button, styles[`${size}Button`]];
    
    if (variant === 'outline') {
      baseStyles.push(styles.outlineButton);
    } else if (variant === 'ghost') {
      baseStyles.push(styles.ghostButton);
    }
    
    if (fullWidth) {
      baseStyles.push(styles.fullWidth);
    }
    
    if (rounded) {
      baseStyles.push(styles.rounded);
    }
    
    if (disabled) {
      baseStyles.push(styles.disabledButton);
    }
    
    return baseStyles;
  };
  
  const getTextStyles = () => {
    const baseStyles = [styles.text, styles[`${size}Text`]];
    
    if (variant === 'primary') {
      baseStyles.push(styles.primaryText);
    } else if (variant === 'secondary') {
      baseStyles.push(styles.secondaryText);
    } else if (variant === 'outline') {
      baseStyles.push(styles.outlineText);
    } else if (variant === 'ghost') {
      baseStyles.push(styles.ghostText);
    }
    
    if (disabled) {
      baseStyles.push(styles.disabledText);
    }
    
    return baseStyles;
  };
  
  // Create icon element based on iconName if provided
  const renderIcon = () => {
    if (iconName) {
      const iconColor = 
        variant === 'primary' || variant === 'secondary' 
          ? 'white' 
          : theme.colors.primary;
      
      return <Ionicons name={iconName} size={size === 'small' ? 16 : size === 'large' ? 20 : 18} color={iconColor} style={styles.icon} />;
    }
    return null;
  };
  
  // For gradient variants (primary and secondary)
  if ((variant === 'primary' || variant === 'secondary') && !disabled) {
    const gradientColors = variant === 'primary' 
      ? ['#7B70FF', '#6C63FF', '#5A51E5'] 
      : ['#FF7694', '#FF6584', '#E35776'];
      
    return (
      <Animatable.View ref={animatableRef} style={{ borderRadius: rounded ? 50 : theme.borderRadius.md }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={0.8}
          {...props}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[...getButtonStyles(), style]}
          >
            {leftIcon && !loading && leftIcon}
            {!leftIcon && iconName && !loading && renderIcon()}
            
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={[...getTextStyles(), textStyle, styles.gradientText]}>{title}</Text>
            )}
            
            {rightIcon && !loading && rightIcon}
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    );
  }
  
  return (
    <Animatable.View ref={animatableRef}>
      <TouchableOpacity
        style={[...getButtonStyles(), style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...props}
      >
        {leftIcon && !loading && leftIcon}
        {!leftIcon && iconName && !loading && renderIcon()}
        
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'outline' || variant === 'ghost' 
              ? theme.colors.primary 
              : 'white'} 
          />
        ) : (
          <Text style={[...getTextStyles(), textStyle]}>{title}</Text>
        )}
        
        {rightIcon && !loading && rightIcon}
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    borderWidth: 0,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#E2E8F0',
    borderWidth: 0,
  },
  fullWidth: {
    width: '100%',
  },
  rounded: {
    borderRadius: 50,
  },
  smallButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 36,
  },
  mediumButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 46,
  },
  largeButton: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 56,
  },
  text: {
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  smallText: {
    fontSize: theme.typography.fontSize.sm,
  },
  mediumText: {
    fontSize: theme.typography.fontSize.md,
  },
  largeText: {
    fontSize: theme.typography.fontSize.lg,
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: 'white',
  },
  outlineText: {
    color: theme.colors.primary,
  },
  ghostText: {
    color: theme.colors.primary,
  },
  disabledText: {
    color: '#64748B',
  },
  gradientText: {
    color: 'white',
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
});

export default Button; 