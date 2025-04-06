import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * A simple fallback ProgressBar component without animations for use while Reanimated is being fixed
 * @param {Object} props - Component props
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {string|string[]} props.color - Color or gradient colors of the progress bar
 * @param {number} props.height - Height of the progress bar in pixels
 * @param {Object} props.style - Additional style for the container
 * @param {boolean} props.showShadow - Whether to show shadow effects
 * @returns {React.Component} Progress bar component
 */
export const ProgressBarFallback = ({ 
  progress = 0, 
  color = '#6C63FF', 
  height = 10,
  style = {},
  showShadow = true
}) => {
  // Ensure progress is within valid range
  const validProgress = Math.min(100, Math.max(0, progress));
  
  // Determine if we should use a gradient or solid color
  const isGradient = Array.isArray(color) && color.length > 1;
  const gradientColors = isGradient ? color : ['#8A80FF', '#6C63FF', '#5A51E5'];
  
  // Handle shadow style based on platform and preference
  const shadowStyle = showShadow ? Platform.select({
    ios: {
      shadowColor: typeof color === 'string' ? color : gradientColors[0],
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    android: {
      elevation: 3,
    },
  }) : {};
  
  return (
    <View style={[styles.container, { height }, style]}>
      <View 
        style={[
          styles.progressContainer, 
          { width: `${validProgress}%` },
          shadowStyle
        ]}
      >
        {isGradient || typeof color !== 'string' ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientFill}
          />
        ) : (
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: color,
              }
            ]} 
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#E5E9F2',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
  },
  gradientFill: {
    width: '100%',
    height: '100%',
  },
});

export default ProgressBarFallback; 