import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, Easing, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

const { height, width } = Dimensions.get('window');

const AnimatedScreenWrapper = ({ children, style }) => {
  const isFocused = useIsFocused();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Simplified animation to avoid interfering with scrolling
  useEffect(() => {
    if (isFocused) {
      // Quick fade in only
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation values when screen is not focused
      fadeAnim.setValue(0);
    }

    return () => {
      // Cleanup
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1,
        useNativeDriver: true
      }).start();
    };
  }, [isFocused, fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Remove shadows that might affect performance
    backfaceVisibility: 'hidden',
  },
});

export default AnimatedScreenWrapper; 