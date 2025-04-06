import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatLongDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import {
  RECURRENCE_FREQUENCIES,
  createRecurringTransaction,
  getFrequencyDescription,
  updateRecurringTransaction
} from '../utils/recurringTransactions';
import { categorizeTransaction } from '../utils/autoCategorizationUtil';
import theme from '../theme';

const RecurringTransactionForm = ({ 
  initialData = null, 
  onComplete = () => {},
  onCancel = () => {} 
}) => {
  const { user } = useAuth();
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [transactionType, setTransactionType] = useState('expense');
  const [startDate, setStartDate] = useState(new Date());
  const [frequency, setFrequency] = useState(RECURRENCE_FREQUENCIES.MONTHLY);
  const [endDate, setEndDate] = useState(null);
  const [occurrences, setOccurrences] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [hasOccurrences, setHasOccurrences] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      const { baseTransaction, frequency, startDate, endDate, occurrences } = initialData;
      
      setDescription(baseTransaction.description || '');
      setAmount(Math.abs(baseTransaction.amount).toString());
      setCategory(baseTransaction.category || 'other');
      setTransactionType(baseTransaction.type || 'expense');
      setStartDate(new Date(startDate));
      setFrequency(frequency);
      
      if (endDate) {
        setEndDate(new Date(endDate));
        setHasEndDate(true);
      }
      
      if (occurrences) {
        setOccurrences(occurrences.toString());
        setHasOccurrences(true);
      }
    }
  }, [initialData]);
  
  // Auto-categorize based on description
  useEffect(() => {
    if (description && !initialData) {
      const suggestedCategory = categorizeTransaction(
        description,
        parseFloat(amount) || 0,
        transactionType === 'income'
      );
      
      if (suggestedCategory) {
        setCategory(suggestedCategory);
      }
    }
  }, [description]);
  
  const handleSave = async () => {
    // Validate form
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (hasEndDate && hasOccurrences) {
      Alert.alert('Error', 'You can set either an end date or number of occurrences, not both');
      return;
    }
    
    const parsedOccurrences = hasOccurrences ? parseInt(occurrences) : null;
    if (hasOccurrences && (!parsedOccurrences || parsedOccurrences <= 0)) {
      Alert.alert('Error', 'Please enter a valid number of occurrences');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create the base transaction
      const baseTransaction = {
        id: initialData?.baseTransaction?.id || `trans_${Date.now()}`,
        description,
        amount: transactionType === 'expense' ? -parsedAmount : parsedAmount,
        category,
        type: transactionType,
      };
      
      // Create or update recurring transaction
      const recurringDef = createRecurringTransaction(
        baseTransaction,
        frequency,
        startDate,
        hasEndDate ? endDate : null,
        hasOccurrences ? parsedOccurrences : null
      );
      
      // If editing, preserve the original ID
      if (initialData) {
        recurringDef.id = initialData.id;
      }
      
      // Save to Firestore
      await updateRecurringTransaction(user.id, recurringDef);
      
      // Notify parent component
      onComplete(recurringDef);
      
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
      Alert.alert('Error', 'Failed to save recurring transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleTransactionType = () => {
    setTransactionType(transactionType === 'expense' ? 'income' : 'expense');
  };
  
  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      
      // Ensure end date is after start date
      if (hasEndDate && endDate && selectedDate > endDate) {
        setEndDate(new Date(selectedDate.getTime() + 86400000)); // Add one day
      }
    }
  };
  
  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {initialData ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
        </Text>
      </View>
      
      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Monthly Rent, Netflix Subscription"
        />
      </View>
      
      {/* Amount */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountContainer}>
          <TouchableOpacity
            style={[
              styles.typeToggle,
              transactionType === 'expense' ? styles.expenseToggle : styles.incomeToggle
            ]}
            onPress={toggleTransactionType}
          >
            <Ionicons
              name={transactionType === 'expense' ? 'arrow-down' : 'arrow-up'}
              size={16}
              color="white"
            />
            <Text style={styles.toggleText}>
              {transactionType === 'expense' ? 'Expense' : 'Income'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
          />
        </View>
      </View>
      
      {/* Category */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.categorySelector}>
          <Text style={styles.categoryText}>{category}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {/* Frequency */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Frequency</Text>
        <View style={styles.frequencyOptions}>
          {Object.values(RECURRENCE_FREQUENCIES).map(freq => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.frequencyOption,
                frequency === freq ? styles.selectedFrequency : null
              ]}
              onPress={() => setFrequency(freq)}
            >
              <Text
                style={[
                  styles.frequencyText,
                  frequency === freq ? styles.selectedFrequencyText : null
                ]}
              >
                {getFrequencyDescription(freq)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Start Date */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Start Date</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text style={styles.dateText}>{formatLongDate(startDate)}</Text>
          <Ionicons name="calendar-outline" size={20} color="#666" />
        </TouchableOpacity>
        
        {showStartDatePicker && (
          <Modal
            transparent={true}
            visible={showStartDatePicker}
            animationType="fade"
            onRequestClose={() => setShowStartDatePicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowStartDatePicker(false)}>
              <View style={styles.datePickerModal}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.datePickerContent}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerTitle}>Select Start Date</Text>
                      <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                        <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.dateButtonsContainer}>
                      <TouchableOpacity 
                        style={styles.dateOptionButton}
                        onPress={() => {
                          const today = new Date();
                          handleStartDateChange(null, today);
                        }}
                      >
                        <Text style={styles.dateOptionText}>Today</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.dateOptionButton}
                        onPress={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          handleStartDateChange(null, tomorrow);
                        }}
                      >
                        <Text style={styles.dateOptionText}>Tomorrow</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.dateOptionButton}
                        onPress={() => {
                          const nextWeek = new Date();
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          handleStartDateChange(null, nextWeek);
                        }}
                      >
                        <Text style={styles.dateOptionText}>Next Week</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.dateOptionButton}
                        onPress={() => {
                          const nextMonth = new Date();
                          nextMonth.setMonth(nextMonth.getMonth() + 1);
                          handleStartDateChange(null, nextMonth);
                        }}
                      >
                        <Text style={styles.dateOptionText}>Next Month</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.manualDateContainer}>
                      <Text style={styles.manualDateLabel}>
                        Selected Date: {startDate.toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </View>
      
      {/* End Options */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>End Condition</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>No End Date</Text>
          <Switch
            value={!hasEndDate && !hasOccurrences}
            onValueChange={(value) => {
              if (value) {
                setHasEndDate(false);
                setHasOccurrences(false);
              } else {
                setHasEndDate(true);
              }
            }}
          />
        </View>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>End Date</Text>
          <Switch
            value={hasEndDate}
            onValueChange={(value) => {
              setHasEndDate(value);
              if (value) {
                setHasOccurrences(false);
                if (!endDate) {
                  // Set default end date to 1 year from start
                  const defaultEnd = new Date(startDate);
                  defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
                  setEndDate(defaultEnd);
                }
              }
            }}
          />
        </View>
        
        {hasEndDate && (
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatLongDate(endDate || new Date())}</Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
        
        {showEndDatePicker && (
          <Modal
            transparent={true}
            visible={showEndDatePicker}
            animationType="fade"
            onRequestClose={() => setShowEndDatePicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowEndDatePicker(false)}>
              <View style={styles.datePickerModal}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.datePickerContent}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerTitle}>Select End Date</Text>
                      <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                        <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.dateButtonsContainer}>
                      <TouchableOpacity 
                        style={styles.dateOptionButton}
                        onPress={() => {
                          const threeMonths = new Date(startDate);
                          threeMonths.setMonth(threeMonths.getMonth() + 3);
                          handleEndDateChange(null, threeMonths);
                        }}
                      >
                        <Text style={styles.dateOptionText}>3 Months</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.dateOptionButton}
                        onPress={() => {
                          const sixMonths = new Date(startDate);
                          sixMonths.setMonth(sixMonths.getMonth() + 6);
                          handleEndDateChange(null, sixMonths);
                        }}
                      >
                        <Text style={styles.dateOptionText}>6 Months</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.dateOptionButton}
                        onPress={() => {
                          const oneYear = new Date(startDate);
                          oneYear.setFullYear(oneYear.getFullYear() + 1);
                          handleEndDateChange(null, oneYear);
                        }}
                      >
                        <Text style={styles.dateOptionText}>1 Year</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.dateOptionButton}
                        onPress={() => {
                          const twoYears = new Date(startDate);
                          twoYears.setFullYear(twoYears.getFullYear() + 2);
                          handleEndDateChange(null, twoYears);
                        }}
                      >
                        <Text style={styles.dateOptionText}>2 Years</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.manualDateContainer}>
                      <Text style={styles.manualDateLabel}>
                        Selected Date: {(endDate || new Date()).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Number of Occurrences</Text>
          <Switch
            value={hasOccurrences}
            onValueChange={(value) => {
              setHasOccurrences(value);
              if (value) {
                setHasEndDate(false);
                if (!occurrences) {
                  setOccurrences('12'); // Default to 12 occurrences
                }
              }
            }}
          />
        </View>
        
        {hasOccurrences && (
          <TextInput
            style={styles.occurrencesInput}
            value={occurrences}
            onChangeText={setOccurrences}
            placeholder="12"
            keyboardType="numeric"
          />
        )}
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  formGroup: {
    padding: 16,
    backgroundColor: theme.colors.background.card,
    marginBottom: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  expenseToggle: {
    backgroundColor: '#FF3B30',
  },
  incomeToggle: {
    backgroundColor: '#4CD964',
  },
  toggleText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 8,
    padding: 12,
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
  },
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  frequencyOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 8,
    margin: 4,
  },
  selectedFrequency: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  frequencyText: {
    fontSize: 14,
    color: '#333',
  },
  selectedFrequencyText: {
    color: 'white',
    fontWeight: '500',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  occurrencesInput: {
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F5F7FA',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  optionButton: {
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    backgroundColor: theme.colors.background.card,
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  dateButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateOptionButton: {
    width: '48%',
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.background.light,
    marginBottom: 10,
  },
  dateOptionText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  manualDateContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.light,
    padding: 12,
    borderRadius: 8,
  },
  manualDateLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
});

export default RecurringTransactionForm; 