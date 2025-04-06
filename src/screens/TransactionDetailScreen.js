import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Animated,
  Platform,
  ToastAndroid,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../context/TransactionContext';
import { getCategoryById } from '../constants/categories';
import theme from '../theme';
import Button from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';


const TransactionDetailScreen = ({ navigation, route }) => {
  const { id } = route.params;
  const { getTransactionById, deleteTransaction } = useTransactions();
  const [transaction, setTransaction] = useState(route.params.transaction);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  const isFocused = useIsFocused();
  
  const fetchTransactionData = useCallback(async () => {
    const currentTransaction = await getTransactionById(id);
    if (currentTransaction) {
      setTransaction(currentTransaction);
    }
  }, [id, getTransactionById]);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactionData();
    setRefreshing(false);
  }, [fetchTransactionData]);
  
  // Refresh transaction data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh transaction data when the screen comes into focus
      fetchTransactionData();
      
      // For Android, show a toast if we're returning after an edit
      if (Platform.OS === 'android' && route.params?.edited) {
        ToastAndroid.show('Transaction updated successfully', ToastAndroid.SHORT);
        // Clear the params after using them
        navigation.setParams({ edited: undefined });
      }
      
      // Run entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
      
      return () => {
        // Reset animations when screen is unfocused
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
      };
    }, [id, fadeAnim, slideAnim, fetchTransactionData, isFocused, route.params?.edited, navigation])
  );
  
  const categoryData = transaction ? getCategoryById(transaction.category) : null;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  const handleEdit = () => {
    navigation.navigate('Add', { 
      transaction
    });
  };
  
  const confirmDelete = async () => {
    try {
      setLoading(true);
      setShowDeleteModal(false); // Close modal immediately for better UX
      
      const success = await deleteTransaction(transaction.id);
      
      if (success) {
        // Show success message
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Transaction deleted successfully',
          position: 'bottom',
        });
        
        // Navigate back to main screen
        navigation.navigate('Main');
      } else {
        // Show error message
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to delete transaction. Please try again.',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred. Please try again.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <Text>Loading transaction details...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[
          transaction.type === 'expense' ? '#FF6B78' : '#4CD964',
          transaction.type === 'expense' ? '#FF8086' : '#5AE273',
        ]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Transaction Details</Text>
          <TouchableOpacity
            style={styles.editHeaderButton}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      
        <Animatable.View 
          animation="fadeIn" 
          duration={800} 
          style={styles.amountContainer}
        >
          <View style={styles.typeIndicator}>
            <Ionicons
              name={transaction.type === 'expense' ? 'arrow-up' : 'arrow-down'}
              size={20}
              color="white"
            />
            <Text style={styles.typeText}>
              {transaction.type === 'expense' ? 'Expense' : 'Income'}
            </Text>
          </View>
          
          <Animatable.Text 
            animation="fadeInUp" 
            delay={200} 
            style={styles.amount}
          >
            {formatCurrency(transaction.amount)}
          </Animatable.Text>
        </Animatable.View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Animated.View style={[
          styles.card, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <View style={styles.categoryContainer}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: categoryData.color },
                ]}
              >
                <Ionicons
                  name={categoryData.icon}
                  size={16}
                  color="white"
                />
              </View>
              <Text style={styles.detailValue}>{categoryData.name}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.date)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>{transaction.description || 'No description'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={[styles.detailValue, styles.idText]}>{transaction.id}</Text>
          </View>
          
          {transaction.createdAt ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>
                  {formatDate(transaction.createdAt)}
                </Text>
              </View>
            </>
          ) : null}
          
          {transaction.updatedAt ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Updated</Text>
                <Text style={styles.detailValue}>
                  {formatDate(transaction.updatedAt)}
                </Text>
              </View>
            </>
          ) : null}
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteModal(true)}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={styles.deleteButtonText}>Delete Transaction</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        onClose={() => !loading && setShowDeleteModal(false)}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        cancelText="Cancel"
        confirmText="Delete"
        onCancel={() => !loading && setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        confirmButtonType="destructive"
        loading={loading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  editHeaderButton: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: 'bold',
    color: 'white',
  },
  amountContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: theme.spacing.sm,
  },
  typeText: {
    color: 'white',
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  amount: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    marginTop: -20,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  idText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 2,
  },
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: theme.colors.status.error,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.status.error}10`,
  },
  deleteButtonText: {
    color: theme.colors.status.error,
    marginLeft: 8,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
  },
  cardContainer: {
    marginTop: -30,
    marginHorizontal: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background.card,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});

export default TransactionDetailScreen; 