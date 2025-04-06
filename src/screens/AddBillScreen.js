import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, updateDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import theme from '../theme';
import { formatCurrency } from '../utils/formatters';

const AddBillScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Check if we're in edit mode by looking at route params
  const editMode = route.params?.editMode || false;
  const billId = route.params?.billId || null;
  const initialBillData = route.params?.billData || null;
  
  // Initialize form data based on edit mode
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: new Date(),
    frequency: 'monthly',
    category: 'bills',
    type: 'expense',
  });
  
  // Load bill data if in edit mode
  useEffect(() => {
    if (editMode && initialBillData) {
      setFormData({
        name: initialBillData.name || '',
        amount: initialBillData.amount?.toString() || '',
        dueDate: initialBillData.dueDate instanceof Date 
          ? initialBillData.dueDate 
          : new Date(initialBillData.dueDate),
        frequency: initialBillData.frequency || 'monthly',
        category: initialBillData.category || 'bills',
        type: initialBillData.type || 'expense',
      });
    }
  }, [editMode, initialBillData]);

  const handleSave = async () => {
    if (!formData.name || !formData.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Parse the amount and make it negative for expenses
      let billAmount = parseFloat(formData.amount);
      if (formData.type === 'expense' && billAmount > 0) {
        billAmount = -billAmount; // Make it negative for expenses
      }

      // Create bill data object
      const billData = {
        ...formData,
        amount: billAmount,
        dueDate: Timestamp.fromDate(formData.dueDate),
        updatedAt: Timestamp.now(),
        userId: user.id,
      };
      
      // In edit mode, we update the existing document
      if (editMode && billId) {
        
        const billRef = doc(db, 'users', user.id, 'bills', billId);
        await updateDoc(billRef, billData);
        
        Alert.alert(
          'Success',
          'Bill updated successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Create a new bill
        
        // Add creation timestamp for new bills
        billData.createdAt = Timestamp.now();

        // Add to bills collection
        const billsRef = collection(db, 'users', user.id, 'bills');
        const docRef = await addDoc(billsRef, billData);

        // Also add as a transaction
        const transactionsRef = collection(db, 'users', user.id, 'transactions');
        await addDoc(transactionsRef, {
          ...billData,
          date: billData.dueDate,
          note: `Bill: ${billData.name}`,
        });

        Alert.alert(
          'Success',
          'Bill added successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      Alert.alert('Error', 'Failed to save bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!editMode || !billId) return;
    
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const billRef = doc(db, 'users', user.id, 'bills', billId);
              await deleteDoc(billRef);
              Alert.alert('Success', 'Bill deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting bill:', error);
              Alert.alert('Error', 'Failed to delete bill. Please try again.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, dueDate: selectedDate });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editMode ? 'Edit Bill' : 'Add New Bill'}
        </Text>
        {editMode ? (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={24} color={theme.colors.status.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Bill Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter bill name"
            placeholderTextColor={theme.colors.text.muted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Amount *</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>
              {user?.currency || 'USD'}
            </Text>
            <TextInput
              style={styles.amountInput}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              placeholder="0.00"
              placeholderTextColor={theme.colors.text.muted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Due Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formData.dueDate.toLocaleDateString()}
            </Text>
            <Ionicons name="calendar" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.frequencyContainer}>
            {['monthly', 'quarterly', 'yearly', 'once'].map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  formData.frequency === freq && styles.frequencyButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, frequency: freq })}
              >
                <Text
                  style={[
                    styles.frequencyButtonText,
                    formData.frequency === freq && styles.frequencyButtonTextActive,
                  ]}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading || deleting}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text.white} />
          ) : (
            <Text style={styles.saveButtonText}>
              {editMode ? 'Update Bill' : 'Save Bill'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      {showDatePicker && (
        <DateTimePicker
          value={formData.dueDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  frequencyButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  frequencyButtonTextActive: {
    color: theme.colors.text.white,
  },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.background.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: theme.colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddBillScreen; 