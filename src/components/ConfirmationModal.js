import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import theme from '../theme';

const { width } = Dimensions.get('window');

/**
 * iOS-style confirmation popup modal
 * 
 * @param {boolean} visible - Whether the modal is visible
 * @param {function} onClose - Function to call when the modal is closed
 * @param {string} title - Title of the modal
 * @param {string} message - Message to display in the modal
 * @param {string} cancelText - Text for the cancel button
 * @param {string} confirmText - Text for the confirm button
 * @param {function} onCancel - Function to call when cancel is pressed
 * @param {function} onConfirm - Function to call when confirm is pressed
 * @param {string} confirmButtonType - Type of confirm button: 'default', 'destructive'
 * @param {React.ReactNode} customContent - Custom content to display in the modal
 * @param {boolean} loading - Whether to show a loading indicator on the confirm button
 */
const ConfirmationModal = ({
  visible,
  onClose,
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'OK',
  onCancel,
  onConfirm,
  confirmButtonType = 'default',
  customContent = null,
  loading = false
}) => {
  const [scaleAnim] = useState(new Animated.Value(1.1));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleCancel = () => {
    if (onCancel) onCancel();
    else onClose();
  };

  const handleConfirm = () => {
    if (!loading && onConfirm) onConfirm();
  };

  // Get the text color for the confirm button based on the type
  const getConfirmTextColor = () => {
    switch (confirmButtonType) {
      case 'destructive':
        return theme.colors.status.error;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ scale: scaleAnim }],
                }
              ]}
            >
              <View style={styles.contentContainer}>
                {title && <Text style={styles.title}>{title}</Text>}
                {message && <Text style={styles.message}>{message}</Text>}
                
                {/* Custom content if provided */}
                {customContent}
              
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancel}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.cancelText,
                      loading && styles.disabledButtonText
                    ]}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.buttonDivider} />
                  
                  <TouchableOpacity
                    style={[styles.button, styles.confirmButton]}
                    onPress={handleConfirm}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator
                        size="small"
                        color={getConfirmTextColor()}
                      />
                    ) : (
                      <Text style={[
                        styles.confirmText, 
                        { color: getConfirmTextColor() }
                      ]}>
                        {confirmText}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.8,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contentContainer: {
    paddingTop: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderBottomLeftRadius: 14,
  },
  confirmButton: {
    borderBottomRightRadius: 14,
  },
  buttonDivider: {
    width: 0.5,
    backgroundColor: theme.colors.border,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonText: {
    opacity: 0.5,
  },
});

export default ConfirmationModal; 