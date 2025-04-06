import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import theme from '../constants/theme';

const FloatingActionButton = ({ onPress, style, iconName = 'add' }) => {
  const animatableRef = useRef();
  const iconRef = useRef();
  
  const handlePressIn = () => {
    animatableRef.current?.animate({ scale: 0.9 }, 150);
    iconRef.current?.animate({ rotate: '45deg' }, 300);
  };
  
  const handlePressOut = () => {
    animatableRef.current?.animate({ scale: 1 }, 300);
    iconRef.current?.animate({ rotate: '0deg' }, 300);
  };

  return (
    <View style={[styles.container, style]}>
      <Animatable.View ref={animatableRef} style={styles.buttonWrapper}>
        <BlurView intensity={20} style={styles.blurContainer} tint="light">
          <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7B70FF', '#6C63FF', '#5A51E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Animatable.View ref={iconRef}>
                <Ionicons name={iconName} size={28} color="#FFFFFF" />
              </Animatable.View>
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    zIndex: 999,
  },
  buttonWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  blurContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default FloatingActionButton; 