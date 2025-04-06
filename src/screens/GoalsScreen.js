import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  FlatList,
  Platform
} from 'react-native';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from '../components/ProgressBar';
import { formatCurrency, formatLongDate } from '../utils/formatters';
import { useTransactions } from '../context/TransactionContext';
import { useLoading } from '../hooks';
import theme from '../theme';

const GoalsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { loading, startLoading, stopLoading } = useLoading();
  
  // Goals state
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    amount: '',
    targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)), // Default 3 months
    category: 'savings',
    id: Date.now().toString(),
    createdAt: new Date(),
    currentAmount: 0
  });
  const [currency, setCurrency] = useState('USD');
  const [editingGoalId, setEditingGoalId] = useState(null);
  
  // Load goals from Firestore
  useEffect(() => {
    loadGoals();
  }, [user]);
  
  // Calculate goal progress based on transactions
  useEffect(() => {
    if (goals.length > 0 && transactions.length > 0) {
      updateGoalProgress();
    }
  }, [goals, transactions]);
  
  const loadGoals = async () => {
    if (!user) return;
    
    try {
      startLoading();
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Set currency
        if (userData.currency) {
          setCurrency(userData.currency);
        }
        
        // Set goals
        if (userData.goals && Array.isArray(userData.goals)) {
          setGoals(userData.goals);
        }
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      Alert.alert('Error', 'Failed to load goals. Please try again.');
    } finally {
      stopLoading();
    }
  };
  
  const updateGoalProgress = () => {
    // For each goal, calculate progress based on related transactions
    const updatedGoals = goals.map(goal => {
      // For savings goals, look for transactions with associated goal ID
      if (goal.category === 'savings') {
        const relatedTransactions = transactions.filter(t => 
          t.goalId === goal.id && t.type === 'income' && t.category === 'savings'
        );
        
        const savedAmount = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);
        return { ...goal, currentAmount: savedAmount };
      }
      
      return goal;
    });
    
    setGoals(updatedGoals);
  };
  
  const handleAddGoal = async () => {
    if (!user) return;
    
    // Validate inputs
    if (!newGoal.title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }
    
    const targetAmount = parseFloat(newGoal.amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }
    
    try {
      startLoading();
      
      // Create the goal object
      const goalToAdd = {
        ...newGoal,
        amount: targetAmount,
        currentAmount: 0
      };
      
      // Update Firestore
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        goals: arrayUnion(goalToAdd)
      });
      
      // Update local state
      setGoals([...goals, goalToAdd]);
      
      // Reset form and close modal
      setNewGoal({
        title: '',
        amount: '',
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        category: 'savings',
        id: Date.now().toString(),
        createdAt: new Date(),
        currentAmount: 0
      });
      setShowAddGoal(false);
      
      Alert.alert('Success', 'Goal added successfully');
    } catch (error) {
      console.error('Error adding goal:', error);
      Alert.alert('Error', 'Failed to add goal. Please try again.');
    } finally {
      stopLoading();
    }
  };
  
  const handleEditGoal = (goal) => {
    setEditingGoalId(goal.id);
    setNewGoal({
      ...goal,
      amount: goal.amount.toString()
    });
    setShowAddGoal(true);
  };
  
  const handleUpdateGoal = async () => {
    if (!user || !editingGoalId) return;
    
    // Validate inputs
    if (!newGoal.title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }
    
    const targetAmount = parseFloat(newGoal.amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }
    
    try {
      startLoading();
      
      // Find the old goal to remove
      const oldGoal = goals.find(g => g.id === editingGoalId);
      if (!oldGoal) {
        throw new Error('Goal not found');
      }
      
      // Create the updated goal
      const updatedGoal = {
        ...newGoal,
        amount: targetAmount,
        id: editingGoalId,
      };
      
      // Update Firestore - first remove the old goal, then add the updated one
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        goals: arrayRemove(oldGoal)
      });
      await updateDoc(userDocRef, {
        goals: arrayUnion(updatedGoal)
      });
      
      // Update local state
      const updatedGoals = goals.map(g => 
        g.id === editingGoalId ? updatedGoal : g
      );
      setGoals(updatedGoals);
      
      // Reset form and close modal
      setNewGoal({
        title: '',
        amount: '',
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        category: 'savings',
        id: Date.now().toString(),
        createdAt: new Date(),
        currentAmount: 0
      });
      setShowAddGoal(false);
      setEditingGoalId(null);
      
      Alert.alert('Success', 'Goal updated successfully');
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    } finally {
      stopLoading();
    }
  };
  
  const handleDeleteGoal = async (goal) => {
    if (!user) return;
    
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.title}"?`,
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
              startLoading();
              
              // Remove from Firestore
              const userDocRef = doc(db, 'users', user.id);
              await updateDoc(userDocRef, {
                goals: arrayRemove(goal)
              });
              
              // Update local state
              const updatedGoals = goals.filter(g => g.id !== goal.id);
              setGoals(updatedGoals);
              
              Alert.alert('Success', 'Goal deleted successfully');
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal. Please try again.');
            } finally {
              stopLoading();
            }
          }
        }
      ]
    );
  };
  
  const calculateProgress = (goal) => {
    if (!goal.amount || goal.amount <= 0) return 0;
    const percentage = Math.min(100, (goal.currentAmount / goal.amount) * 100);
    return Math.round(percentage);
  };
  
  const renderGoalItem = ({ item }) => {
    const progress = calculateProgress(item);
    
    return (
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{item.title}</Text>
          <View style={styles.goalActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEditGoal(item)}
            >
              <Ionicons name="create-outline" size={20} color="#4A90E2" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleDeleteGoal(item)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.goalDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Target:</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(item.amount, currency)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current:</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(item.currentAmount, currency)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Remaining:</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(Math.max(0, item.amount - item.currentAmount), currency)}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <ProgressBar 
            progress={progress}
            color="#4CD964"
            height={8}
          />
          <Text style={styles.progressText}>{progress}% completed</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addFundsButton}
          onPress={() => navigation.navigate('AddTransaction', { 
            presetCategory: 'savings',
            presetType: 'income',
            isForGoal: true,
            goalId: item.id,
            goalName: item.title
          })}
        >
          <Text style={styles.addFundsText}>Add Funds to Goal</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Financial Goals</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            setEditingGoalId(null);
            setNewGoal({
              title: '',
              amount: '',
              targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
              category: 'savings',
              id: Date.now().toString(),
              createdAt: new Date(),
              currentAmount: 0
            });
            setShowAddGoal(true);
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : goals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="flag-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>You don't have any goals yet</Text>
          <Text style={styles.emptySubtext}>
            Set financial goals to help you save for the things that matter
          </Text>
        </View>
      ) : (
        <FlatList
          data={goals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      {/* Add/Edit Goal Modal */}
      <Modal
        visible={showAddGoal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddGoal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingGoalId ? 'Edit Goal' : 'Add New Goal'}
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goal Title</Text>
              <TextInput
                style={styles.input}
                value={newGoal.title}
                onChangeText={(text) => setNewGoal({...newGoal, title: text})}
                placeholder="e.g., Vacation Fund, New Car"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Amount</Text>
              <View style={styles.amountInput}>
                <Text style={styles.currencyLabel}>{currency}</Text>
                <TextInput
                  style={styles.amountTextInput}
                  value={newGoal.amount}
                  onChangeText={(text) => setNewGoal({...newGoal, amount: text})}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddGoal(false);
                  setEditingGoalId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingGoalId ? handleUpdateGoal : handleAddGoal}
              >
                <Text style={styles.saveButtonText}>
                  {editingGoalId ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  goalCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  goalActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  goalDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
    textAlign: 'right',
  },
  addFundsButton: {
    backgroundColor: theme.colors.background.light,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addFundsText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: '80%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background.light,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.light,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginRight: 8,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 16,
    padding: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.background.light,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  progressDetailCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

export default GoalsScreen; 