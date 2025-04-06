import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../context/TransactionContext';
import Input from '../components/Input';
import Button from '../components/Button';
import theme from '../theme';
import { getCategories } from '../constants/categories';
import { useNavigation, useRoute } from '@react-navigation/native';
import { scheduleBudgetThresholdNotification } from '../utils/notificationUtils';
import { useAuth } from '../context/AuthContext';

const TransactionFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { addTransaction, updateTransaction } = useTransactions();
  const { user } = useAuth();
  const editTransaction = route.params?.transaction;
  const isEditing = !!editTransaction;

  const [type, setType] = useState(editTransaction?.type || 'expense');
  const [amount, setAmount] = useState(editTransaction?.amount?.toString() || '');
  const [category, setCategory] = useState(editTransaction?.category || '');
  const [note, setNote] = useState(editTransaction?.note || '');
  const [date, setDate] = useState(editTransaction?.date || new Date().toISOString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get filtered categories based on transaction type
  const categories = getCategories(type);

  const validateForm = () => {
    setError('');
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (!category) {
      setError('Please select a category');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    // Prepare data
    const transactionData = {
      amount: parseFloat(amount),
      category,
      date: date,
      note,
      type,
      description: note, // Use note as description for simplicity
    };
    
    setLoading(true);
    try {
      let success;
      
      if (isEditing) {
        try {
          // When editing, update the existing transaction
          success = await updateTransaction(editTransaction.id, transactionData);
        } catch (updateError) {
          console.error('Transaction update error:', updateError);
          // Handle specific errors
          if (updateError.code === 'permission-denied') {
            setError('Permission denied: You do not have access to update this transaction.');
            setLoading(false);
            return;
          }
          throw updateError;
        }
      } else {
        try {
          success = await addTransaction(transactionData);
        } catch (addError) {
          console.error('Transaction add error:', addError);
          // Handle specific errors
          if (addError.code === 'permission-denied') {
            setError('Permission denied: You do not have access to add transactions.');
            setLoading(false);
            return;
          }
          throw addError;
        }
      }

      if (success) {
        // Check if we need to send budget threshold notification for expense transactions
        if (type === 'expense' && user) {
          // Schedule budget threshold notification in background
          scheduleBudgetThresholdNotification(user.id).catch(err => {
            // Just log errors, don't block the transaction flow
            console.error('Budget notification error:', err);
          });
        }
        
        // Show success message
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            isEditing ? 'Transaction updated successfully' : 'Transaction added successfully',
            ToastAndroid.SHORT
          );
        }
        
        if (isEditing) {
          // Set a param to indicate the transaction was successfully edited
          navigation.navigate({
            name: 'TransactionDetail',
            params: { id: editTransaction.id, edited: true },
            merge: true,
          });
        } else {
          // Navigate to Home screen instead of using goBack
          navigation.navigate('Main');
        }
      } else {
        setError('Failed to save transaction. Please try again.');
      }
    } catch (error) {
      console.error('Transaction form error:', error);
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        setError('Permission denied: You cannot modify this transaction.');
      } else if (error.code === 'unavailable' || error.code === 'network-request-failed') {
        setError('Network error: Please check your internet connection.');
      } else {
        setError('An error occurred while saving the transaction. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {isEditing ? 'Edit Transaction' : 'New Transaction'}
            </Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'expense' && styles.activeTypeButton,
              ]}
              onPress={() => setType('expense')}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={type === 'expense' ? theme.colors.financial.expense : theme.colors.expense}
              />
              <Text
                style={[
                  styles.typeText,
                  type === 'expense' && styles.activeTypeText,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'income' && styles.activeTypeButton,
                type === 'income' && { backgroundColor: theme.colors.financial.income },
              ]}
              onPress={() => setType('income')}
            >
              <Ionicons
                name="arrow-down"
                size={20}
                color={type === 'income' ? theme.colors.financial.income : theme.colors.income}
              />
              <Text
                style={[
                  styles.typeText,
                  type === 'income' && styles.activeTypeText,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              leftIcon={
                <Ionicons name="cash-outline" size={24} color={theme.colors.primary} />
              }
            />

            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    category === cat.id && styles.activeCategoryItem,
                    category === cat.id && { borderColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: cat.color },
                    ]}
                  >
                    <Ionicons name={cat.icon} size={20} color="white" />
                  </View>
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat.id && { color: cat.color },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Note (Optional)"
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              multiline
              numberOfLines={3}
              leftIcon={
                <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
              }
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title={isEditing ? 'Update Transaction' : 'Add Transaction'}
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  spacer: {
    width: 40,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeTypeButton: {
    backgroundColor: theme.colors.financial.expense,
    borderColor: theme.colors.financial.expense,
  },
  typeText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  activeTypeText: {
    color: theme.colors.text.white,
  },
  formContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    margin: '1.5%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.card,
  },
  activeCategoryItem: {
    borderWidth: 2,
    backgroundColor: theme.colors.background.card,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryText: {
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    color: theme.colors.text.secondary,
  },
  errorText: {
    color: theme.colors.status.error,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: theme.spacing.lg,
  },
});

export default TransactionFormScreen; 