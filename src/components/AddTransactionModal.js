import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Modal, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  BackHandler,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../theme';
import Button from './Button';
import Input from './Input';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import CategorySelector from './CategorySelector';
import { formatCurrency, formatLongDate } from '../utils/formatters';
import { validateTransaction } from '../utils/validators';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../utils/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleBudgetThresholdNotification } from '../utils/notificationUtils';

// Add an improved ID generator function that includes the user's UID
const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const firebaseUid = auth.currentUser?.uid;
  
  // Include Firebase UID in the transaction ID if available
  if (firebaseUid) {
    // Use truncated UID (first 8 chars) for privacy reasons
    const shortUid = firebaseUid.substring(0, 8);
    return `txn_${timestamp}_${shortUid}_${random}`;
  }
  
  // Fallback to the original format if no UID available
  return `txn_${timestamp}_${random}`;
};

const { height, width } = Dimensions.get('window');

const AddTransactionModal = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { addTransaction } = useTransactions();
  const [modalVisible, setModalVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { user } = useAuth();
  
  // Handle visibility changes with improved animations
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      
      // Slight delay to ensure modal is rendered before animation
      setTimeout(() => {
        setIsReady(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 45,
            useNativeDriver: true,
          })
        ]).start();
      }, 10);
    } else {
      // Run exit animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 60,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setModalVisible(false);
        setIsReady(false);
      });
    }
    
    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    };
  }, [visible, fadeAnim, slideAnim]);
  
  // Handle back button press when modal is open (Android)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true; // Prevent default back behavior
      }
      return false; // Let the default back behavior happen
    });
    
    return () => backHandler.remove();
  }, [visible, onClose]);
  
  // Reset transaction state when modal opens
  useEffect(() => {
    if (visible) {
      setTransaction({
        description: '',
        amount: '',
        category: '',
        date: new Date(),
        type: 'expense',
        note: '',
      });
      setErrors({});
    }
  }, [visible]);
  
  const [transaction, setTransaction] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date(),
    type: 'expense',
    note: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const handleInputChange = (field, value) => {
    setTransaction({ ...transaction, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };
  
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('date', selectedDate);
    }
  };
  
  const handleSave = async () => {
    // Validate transaction
    const validationErrors = validateTransaction(transaction);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsLoading(true);
    try {
      // Format the amount as a number
      const formattedTransaction = {
        ...transaction,
        id: generateTransactionId(), // Use new function instead of uuidv4()
        amount: parseFloat(transaction.amount),
        createdAt: new Date().toISOString(),
        // Map description to note for consistency
        note: transaction.description,
      };
      
      // Add transaction to context
      await addTransaction(formattedTransaction);
      
      // Check if we need to send budget threshold notification for expense transactions
      if (transaction.type === 'expense' && user) {
        // Schedule budget threshold notification in background
        scheduleBudgetThresholdNotification(user.id).catch(err => {
          // Just log errors, don't block the transaction flow
          console.error('Budget notification error:', err);
        });
      }
      
      // Give user visual feedback that transaction was added
      setTimeout(() => {
        onClose();
        // Don't navigate, just close the modal
      }, 300);
    } catch (error) {
      console.error('Error adding transaction:', error);
      setErrors({ general: 'Failed to add transaction. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCustomDateEntry = () => {
    Alert.alert(
      'Enter Custom Date', 
      'Please enter date (MM/DD/YYYY)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: (dateText) => {
            if (!dateText) return;
            
            // Try to parse the entered date
            try {
              const parts = dateText.split('/');
              if (parts.length === 3) {
                const month = parseInt(parts[0]) - 1; // JavaScript months are 0-based
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                
                const newDate = new Date(year, month, day);
                if (!isNaN(newDate.getTime())) {
                  handleInputChange('date', newDate);
                  setShowDatePicker(false);
                } else {
                  Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format');
                }
              } else {
                Alert.alert('Invalid Format', 'Please enter date in MM/DD/YYYY format');
              }
            } catch (e) {
              Alert.alert('Error', 'Could not parse date. Please use MM/DD/YYYY format');
            }
          }
        }
      ],
      {
        cancelable: true,
        prompt: true,
        defaultValue: transaction.date.toLocaleDateString()
      }
    );
  };
  
  if (!modalVisible) return null;
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none" // We'll handle animations ourselves
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.6)" translucent barStyle="light-content" />
      
      <View style={styles.modalWrapper}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View 
            style={[
              styles.overlay,
              { opacity: fadeAnim }
            ]}
          />
        </TouchableWithoutFeedback>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={
                transaction.type === 'expense' 
                  ? ['#FF5B79', '#FF4B69'] 
                  : ['#33C6AA', '#28B99D']
              }
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <Text style={styles.title}>
                  {transaction.type === 'expense' ? 'Add Expense' : 'Add Income'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            
            <View style={styles.body}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transaction.type === 'expense' && styles.activeExpenseButton,
                  ]}
                  onPress={() => handleInputChange('type', 'expense')}
                >
                  <Ionicons 
                    name="arrow-up-outline" 
                    size={18} 
                    color={transaction.type === 'expense' ? 'white' : '#FC8181'} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    transaction.type === 'expense' && styles.activeTypeText,
                  ]}>
                    Expense
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transaction.type === 'income' && styles.activeIncomeButton,
                  ]}
                  onPress={() => handleInputChange('type', 'income')}
                >
                  <Ionicons 
                    name="arrow-down-outline" 
                    size={18} 
                    color={transaction.type === 'income' ? 'white' : '#38B2AC'} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    transaction.type === 'income' && styles.activeTypeText,
                  ]}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.form}
                contentContainerStyle={styles.formContentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={true}
              >
                <Input
                  label="Description"
                  value={transaction.description}
                  onChangeText={text => handleInputChange('description', text)}
                  placeholder="What was it for?"
                  error={errors.description}
                  iconName="create-outline"
                  autoCapitalize="sentences"
                />
                
                <Input
                  label="Amount"
                  value={transaction.amount}
                  onChangeText={text => handleInputChange('amount', text.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={errors.amount}
                  iconName="cash-outline"
                />
                
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Category</Text>
                  <CategorySelector
                    selectedCategory={transaction.category}
                    onSelect={category => handleInputChange('category', category)}
                    type={transaction.type}
                    error={errors.category}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.datePickerContent}>
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.text.secondary} />
                    <Text style={styles.datePickerText}>
                      {transaction.date.toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={transaction.date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                  />
                )}
                
                <Input
                  label="Note (Optional)"
                  value={transaction.note}
                  onChangeText={text => handleInputChange('note', text)}
                  placeholder="Add a note"
                  multiline
                  numberOfLines={3}
                  iconName="create-outline"
                />
                
                {errors.general && (
                  <Text style={styles.generalError}>{errors.general}</Text>
                )}
                
                <View style={styles.footer}>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveButtonTouchable}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={transaction.type === 'expense' 
                        ? ['#FF5B79', '#FF4B69'] 
                        : ['#33C6AA', '#28B99D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.saveButtonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Ionicons name="save-outline" size={20} color="white" style={{ marginRight: 8 }} />
                          <Text style={styles.saveButtonText}>Save Transaction</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center', 
    justifyContent: 'center',
    maxHeight: height * 0.92,
  },
  modalContainer: {
    width: '92%',
    maxHeight: '92%',
    borderRadius: 24,
    backgroundColor: theme.colors.background.card,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.9,
        shadowRadius: 16,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  header: {
    padding: 20,
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  body: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 4,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '48%',
    backgroundColor: theme.colors.background.light,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 1,
  },
  activeExpenseButton: {
    backgroundColor: '#FF5B79',
    shadowColor: '#FF5B79',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  activeIncomeButton: {
    backgroundColor: '#33C6AA',
    shadowColor: '#33C6AA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  activeTypeText: {
    color: 'white',
  },
  form: {
    paddingHorizontal: 16,
    maxHeight: height * 0.6,
  },
  formContentContainer: {
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.light,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
  },
  generalError: {
    color: theme.colors.status.error,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButtonTouchable: {
    flex: 1,
    height: 54,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    shadowColor: 'rgba(51, 198, 170, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: 'white',
  },
});

export default AddTransactionModal; 