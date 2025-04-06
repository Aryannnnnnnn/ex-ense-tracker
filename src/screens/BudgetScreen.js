import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Platform
} from 'react-native';
import { doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { useTransactions } from '../context/TransactionContext';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from '../components/ProgressBar';
import { formatCurrency } from '../utils/formatters';
import { useLoading } from '../hooks';
import { createBudgetComparisonConfig } from '../utils/chartUtils';
import Toast from 'react-native-toast-message';
import theme from '../theme';
import { scheduleBudgetThresholdNotification } from '../utils/notificationUtils';

// Default categories with icons
const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: 'fast-food-outline', color: theme.colors.categories.food },
  { id: 'transport', name: 'Transportation', icon: 'car-outline', color: theme.colors.categories.transport },
  { id: 'shopping', name: 'Shopping', icon: 'bag-outline', color: theme.colors.categories.shopping },
  { id: 'entertainment', name: 'Entertainment', icon: 'film-outline', color: theme.colors.categories.entertainment },
  { id: 'housing', name: 'Housing', icon: 'home-outline', color: theme.colors.categories.housing },
  { id: 'utilities', name: 'Utilities', icon: 'flash-outline', color: theme.colors.categories.utilities },
  { id: 'healthcare', name: 'Healthcare', icon: 'medical-outline', color: theme.colors.categories.healthcare },
  { id: 'education', name: 'Education', icon: 'school-outline', color: theme.colors.categories.education },
  { id: 'personal', name: 'Personal Care', icon: 'person-outline', color: theme.colors.categories.personal },
  { id: 'bills', name: 'Bills & Utilities', icon: 'document-text-outline', color: theme.colors.categories.utilities },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal-outline', color: theme.colors.categories.other },
];

const BudgetScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { transactions, refreshTransactions } = useTransactions();
  const { loading, startLoading, stopLoading, executeWithLoading } = useLoading();
  
  // Budget state
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [newBudget, setNewBudget] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [savingBudget, setSavingBudget] = useState(false);
  const [error, setError] = useState(null);
  
  // Usage calculations
  const [totalSpent, setTotalSpent] = useState(0);
  const [categorySpending, setCategorySpending] = useState({});
  
  // Add new state for notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [testingNotification, setTestingNotification] = useState(false);
  
  useEffect(() => {
    loadBudgetData();
  }, [user]);
  
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      calculateSpending();
    }
  }, [transactions, user]);
  
  // Load budget data from Firestore
  const loadBudgetData = async () => {
    if (!user) return;
    
    try {
      startLoading();
      setError(null);
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Set monthly budget
        if (userData.monthlyBudget) {
          setMonthlyBudget(userData.monthlyBudget.toString());
        }
        
        // Set currency
        if (userData.currency) {
          setCurrency(userData.currency);
        }
        
        // Set category budgets
        if (userData.categoryBudgets) {
          setCategoryBudgets(userData.categoryBudgets);
        }
      }
      
      // Calculate spending with current transactions
      if (transactions && transactions.length > 0) {
        calculateSpending();
      }
    } catch (error) {
      console.error('Error loading budget data:', error);
      setError('Failed to load budget data. Please try again.');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load budget data. Please try again.',
        position: 'bottom',
      });
    } finally {
      stopLoading();
    }
  };
  
  // Calculate spending for the current month
  const calculateSpending = () => {
    if (!transactions || transactions.length === 0) return;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter transactions for current month and expenses only
    const currentMonthExpenses = transactions.filter(transaction => {
      const transactionDate = transaction.date instanceof Timestamp 
        ? transaction.date.toDate() 
        : new Date(transaction.date);
        
      return (
        transaction.type === 'expense' && 
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });
    
    // Calculate total spent this month
    const total = currentMonthExpenses.reduce((sum, transaction) => 
      sum + Math.abs(transaction.amount), 0);
    setTotalSpent(total);
    
    // Calculate spending by category
    const spendingByCategory = currentMonthExpenses.reduce((acc, transaction) => {
      const { category, amount } = transaction;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Math.abs(amount);
      return acc;
    }, {});
    
    setCategorySpending(spendingByCategory);
  };
  
  // Save monthly budget
  const saveMonthlyBudget = async () => {
    if (!user) return;
    
    try {
      setSavingBudget(true);
      const budget = parseFloat(monthlyBudget);
      
      if (isNaN(budget) || budget < 0) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Budget',
          text2: 'Please enter a valid budget amount',
          position: 'bottom',
        });
        return;
      }
      
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        monthlyBudget: budget,
        updatedAt: new Date(),
      });
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Monthly budget updated successfully',
        position: 'bottom',
      });

      // Recalculate spending after budget update
      calculateSpending();
    } catch (error) {
      console.error('Error saving budget:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save budget. Please try again.',
        position: 'bottom',
      });
    } finally {
      setSavingBudget(false);
    }
  };
  
  // Save category budget
  const saveCategoryBudget = async () => {
    if (!user || !editingCategory) return;
    
    try {
      setSavingBudget(true);
      const budget = parseFloat(newBudget);
      
      if (isNaN(budget) || budget < 0) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Budget',
          text2: 'Please enter a valid budget amount',
          position: 'bottom',
        });
        return;
      }
      
      // Update local state
      const updatedBudgets = {
        ...categoryBudgets,
        [editingCategory.id]: budget
      };
      setCategoryBudgets(updatedBudgets);
      
      // Save to Firestore
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        categoryBudgets: updatedBudgets,
        updatedAt: new Date(),
      });
      
      // Reset editing state
      setEditingCategory(null);
      setNewBudget('');
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Budget for ${editingCategory.name} updated successfully`,
        position: 'bottom',
      });

      // Recalculate spending after category budget update
      calculateSpending();
    } catch (error) {
      console.error('Error saving category budget:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save category budget. Please try again.',
        position: 'bottom',
      });
    } finally {
      setSavingBudget(false);
    }
  };
  
  // Start editing a category budget
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewBudget(categoryBudgets[category.id]?.toString() || '');
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewBudget('');
  };
  
  // Calculate budget usage percentage
  const calculateBudgetUsage = (budget) => {
    if (budget <= 0 || totalSpent <= 0) return 0;
    const percentage = (totalSpent / budget) * 100;
    return Math.min(Math.round(percentage), 100);
  };
  
  // Calculate category usage percentage
  const calculateCategoryUsage = (categoryId) => {
    const budget = categoryBudgets[categoryId] || 0;
    const spent = categorySpending[categoryId] || 0;
    
    if (budget <= 0 || spent <= 0) return 0;
    const percentage = (spent / budget) * 100;
    return Math.round(percentage);
  };
  
  // Get budget status message based on usage percentage
  const getBudgetStatusMessage = () => {
    const budget = parseFloat(monthlyBudget);
    if (!budget || budget <= 0) return null;
    
    const percentage = calculateBudgetUsage(budget);
    
    if (percentage >= 100) {
      return {
        message: 'Budget exceeded! You have spent more than your monthly budget.',
        type: 'error',
        icon: 'alert-circle'
      };
    } else if (percentage >= 90) {
      return {
        message: 'Warning! You are very close to exceeding your monthly budget.',
        type: 'warning',
        icon: 'warning'
      };
    } else if (percentage >= 80) {
      return {
        message: 'Caution! You have used 80% of your monthly budget.',
        type: 'caution',
        icon: 'information-circle'
      };
    }
    
    return null;
  };
  
  // Function to test budget notification
  const testBudgetNotification = async () => {
    if (!user) return;
    
    setTestingNotification(true);
    try {
      const result = await scheduleBudgetThresholdNotification(user.id);
      
      if (result) {
        Toast.show({
          type: 'success',
          text1: 'Notification Sent',
          text2: 'Budget threshold notification was sent successfully',
          position: 'bottom',
        });
      } else {
        Toast.show({
          type: 'info',
          text1: 'No Notification Needed',
          text2: 'No budget threshold has been crossed',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('Error testing budget notification:', error);
      Toast.show({
        type: 'error',
        text1: 'Notification Error',
        text2: 'Failed to send budget notification',
        position: 'bottom',
      });
    } finally {
      setTestingNotification(false);
    }
  };
  
  const budgetStatus = getBudgetStatusMessage();
  
  // Render category item
  const renderCategoryItem = ({ item }) => {
    const categoryBudget = categoryBudgets[item.id] || 0;
    const spent = categorySpending[item.id] || 0;
    const usage = calculateCategoryUsage(item.id);
    const isOverBudget = spent > categoryBudget && categoryBudget > 0;
    
    return (
      <View style={styles.categoryItem}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={20} color={item.color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{item.name}</Text>
            {categoryBudget > 0 ? (
              <Text style={styles.budgetText}>
                {formatCurrency(spent, currency)} of {formatCurrency(categoryBudget, currency)}
              </Text>
            ) : (
              <Text style={styles.noBudgetText}>No budget set</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditCategory(item)}
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {categoryBudget > 0 && (
          <View style={styles.progressContainer}>
            <ProgressBar 
              progress={usage} 
              color={isOverBudget ? theme.colors.status.error : theme.colors.status.success}
              height={6}
            />
            <Text style={[
              styles.percentageText, 
              isOverBudget ? styles.overBudgetText : null
            ]}>
              {usage}%
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  // Add loading state for initial data load
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading budget data...</Text>
      </SafeAreaView>
    );
  }

  // Add error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.errorContainer]}>
        <Ionicons name="alert-circle" size={50} color={theme.colors.status.error} />
        <Text style={styles.errorTitle}>Error Loading Budget</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadBudgetData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Budget Management</Text>
          <Text style={styles.headerSubtitle}>
            Set and track your spending limits
          </Text>
        </View>
        
        {/* Monthly Budget */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Budget</Text>
          <Text style={styles.sectionDescription}>
            Set your total spending limit for the month
          </Text>
          
          <View style={styles.budgetInputContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={monthlyBudget}
                onChangeText={setMonthlyBudget}
                placeholder="Enter monthly budget"
                placeholderTextColor={theme.colors.text.muted}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveMonthlyBudget}
              disabled={savingBudget}
            >
              {savingBudget ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.budgetInfoContainer}>
            {parseFloat(monthlyBudget) > 0 && (
              <View style={styles.budgetSummary}>
                <View style={styles.budgetDetailRow}>
                  <Text style={styles.detailLabel}>Spent this month:</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(totalSpent, currency)}
                  </Text>
                </View>
                
                <View style={styles.budgetDetailRow}>
                  <Text style={styles.detailLabel}>Remaining:</Text>
                  <Text style={[
                    styles.detailValue,
                    totalSpent > parseFloat(monthlyBudget) ? styles.negativeAmount : styles.positiveAmount
                  ]}>
                    {formatCurrency(parseFloat(monthlyBudget) - totalSpent, currency)}
                  </Text>
                </View>
                
                <View style={styles.progressContainer}>
                  <ProgressBar 
                    progress={calculateBudgetUsage(parseFloat(monthlyBudget))}
                    color={totalSpent > parseFloat(monthlyBudget) ? theme.colors.status.error : theme.colors.status.success}
                    height={8}
                  />
                  <Text style={styles.percentageText}>
                    {calculateBudgetUsage(parseFloat(monthlyBudget))}% used
                  </Text>
                </View>
                
                {/* Budget Status Alert */}
                {budgetStatus && (
                  <View style={[
                    styles.budgetAlertContainer,
                    budgetStatus.type === 'error' ? styles.errorAlert : 
                    budgetStatus.type === 'warning' ? styles.warningAlert : 
                    styles.cautionAlert
                  ]}>
                    <Ionicons 
                      name={budgetStatus.icon} 
                      size={20} 
                      color={
                        budgetStatus.type === 'error' ? theme.colors.status.error : 
                        budgetStatus.type === 'warning' ? theme.colors.status.warning : 
                        theme.colors.status.info
                      } 
                    />
                    <Text style={styles.budgetAlertText}>{budgetStatus.message}</Text>
                  </View>
                )}
                
                {/* Budget Notification Test */}
                <View style={styles.notificationContainer}>
                  <Text style={styles.notificationTitle}>Budget Notifications</Text>
                  <Text style={styles.notificationDescription}>
                    You will be notified when your spending approaches your budget limit.
                  </Text>
                  <TouchableOpacity
                    style={styles.testNotificationButton}
                    onPress={testBudgetNotification}
                    disabled={testingNotification}
                  >
                    {testingNotification ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Text style={styles.testNotificationText}>Test Notification</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
        
        {/* Category Budgets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Budgets</Text>
          <Text style={styles.sectionDescription}>
            Set spending limits for each category to track where your money goes
          </Text>
          
          <FlatList
            data={DEFAULT_CATEGORIES}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
      
      {/* Category Budget Edit Modal */}
      {editingCategory && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Budget</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              {editingCategory.name}
            </Text>
            
            <View style={styles.modalInputContainer}>
              <TextInput
                style={styles.modalInput}
                value={newBudget}
                onChangeText={setNewBudget}
                placeholder="Enter budget amount"
                placeholderTextColor={theme.colors.text.muted}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveCategoryBudget}
                disabled={savingBudget}
              >
                {savingBudget ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? 60 : theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  budgetInfoContainer: {
    marginTop: theme.spacing.md,
  },
  budgetSummary: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  budgetDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  negativeAmount: {
    color: theme.colors.status.error,
  },
  positiveAmount: {
    color: theme.colors.status.success,
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  percentageText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    textAlign: 'right',
  },
  overBudgetText: {
    color: theme.colors.status.error,
  },
  categoryItem: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  budgetText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  noBudgetText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.muted,
    fontStyle: 'italic',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '85%',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  modalSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  modalInputContainer: {
    marginBottom: theme.spacing.lg,
  },
  modalInput: {
    backgroundColor: theme.colors.background.light,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.sm,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  budgetAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
  },
  errorAlert: {
    backgroundColor: `${theme.colors.status.error}15`,
    borderLeftColor: theme.colors.status.error,
  },
  warningAlert: {
    backgroundColor: `${theme.colors.status.warning}15`,
    borderLeftColor: theme.colors.status.warning,
  },
  cautionAlert: {
    backgroundColor: `${theme.colors.status.info}15`,
    borderLeftColor: theme.colors.status.info,
  },
  budgetAlertText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
  },
  notificationContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  notificationTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  testNotificationButton: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  testNotificationText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
  },
  retryButtonText: {
    color: 'white',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default BudgetScreen;