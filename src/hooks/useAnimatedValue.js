import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Custom hook for managing Animated.Value with automatic animations
 * @param {number} initialValue - Initial value
 * @param {number} toValue - Target value
 * @param {Object} config - Animation configuration
 * @returns {Animated.Value} Animated value reference
 */
const useAnimatedValue = (
  initialValue = 0,
  toValue = null,
  config = { duration: 300, useNativeDriver: true }
) => {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;

  useEffect(() => {
    // Only animate if toValue is provided and different from initial
    if (toValue !== null && toValue !== initialValue) {
      Animated.timing(animatedValue, {
        toValue,
        duration: config.duration,
        useNativeDriver: config.useNativeDriver,
        easing: config.easing,
      }).start();
    }
  }, [animatedValue, toValue, initialValue, config]);

  return animatedValue;
};

/**
 * Custom hook for fade in animation
 * @param {number} duration - Animation duration
 * @returns {Object} Animated value and style
 */
export const useFadeIn = (duration = 500) => {
  const opacity = useAnimatedValue(0, 1, { 
    duration, 
    useNativeDriver: true 
  });

  return {
    opacity,
    fadeStyle: { opacity },
  };
};

/**
 * Custom hook for slide in animation
 * @param {string} direction - Slide direction ('up', 'down', 'left', 'right')
 * @param {number} distance - Slide distance
 * @param {number} duration - Animation duration
 * @returns {Object} Animated value and style
 */
export const useSlideIn = (direction = 'up', distance = 100, duration = 500) => {
  let initialTranslation = 0;
  let axis = 'translateY';

  if (direction === 'up') {
    initialTranslation = distance;
    axis = 'translateY';
  } else if (direction === 'down') {
    initialTranslation = -distance;
    axis = 'translateY';
  } else if (direction === 'left') {
    initialTranslation = distance;
    axis = 'translateX';
  } else if (direction === 'right') {
    initialTranslation = -distance;
    axis = 'translateX';
  }

  const translation = useAnimatedValue(initialTranslation, 0, { 
    duration, 
    useNativeDriver: true 
  });

  return {
    translation,
    slideStyle: {
      transform: [{ [axis]: translation }],
    },
  };
};

export default useAnimatedValue; 