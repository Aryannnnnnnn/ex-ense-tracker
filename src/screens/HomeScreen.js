import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Platform,
  // Temporary: comment out Animated import while fixing Reanimated
  // Animated,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import BalanceCard from '../components/BalanceCard';
import TransactionItem from '../components/TransactionItem';
import UpcomingBillsCard from '../components/UpcomingBillsCard';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import theme from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreenWrapper from '../components/AnimatedScreenWrapper';
import { registerForPushNotifications, scheduleUpcomingBillReminders, checkFirestorePermissions, scheduleBudgetThresholdNotification } from '../utils/notificationUtils';
import Toast from 'react-native-toast-message';
import { formatCurrency } from '../utils/formatters';
import AddTransactionModal from '../components/AddTransactionModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { ProgressBar } from '../components/ProgressBar';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { getFilteredTransactions, loading: transactionsLoading, stats } = useTransactions();
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showUpcomingBills, setShowUpcomingBills] = useState(true);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [budgetUsage, setBudgetUsage] = useState(0);
  
  // Temporary: comment out Animated.Value until Reanimated is fixed
  // const [scrollY] = useState(new Animated.Value(0));

  // Load user's budget data
  const loadBudgetData = useCallback(async () => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Set monthly budget
        if (userData.monthlyBudget) {
          setMonthlyBudget(userData.monthlyBudget);
        }
        
        // Set currency
        if (userData.currency) {
          setCurrency(userData.currency);
        }
      }
    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  }, [user]);

  // Calculate budget usage
  useEffect(() => {
    if (monthlyBudget > 0 && stats && stats.expense > 0) {
      const usage = (Math.abs(stats.expense) / monthlyBudget) * 100;
      setBudgetUsage(Math.min(Math.round(usage), 100));
    } else {
      setBudgetUsage(0);
    }
  }, [monthlyBudget, stats]);

  // Register for push notifications when the component mounts
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        if (user) {
          const token = await registerForPushNotifications();
          if (token) {
            // Successfully registered for notifications
            // Schedule bill reminders
            const scheduled = await scheduleUpcomingBillReminders(user.id);
          }
        }
      } catch (error) {
        // Error setting up notifications
      }
    };
    
    setupNotifications();
  }, [user]);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      if (user) {
        const hasPermissions = await checkFirestorePermissions(user.id);
        setShowUpcomingBills(hasPermissions);
      }
    };
    
    checkPermissions();
  }, [user]);

  // Check for and set up notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const initializeNotifications = async () => {
        if (user) {
          try {
            // Register for push notifications if not already registered
            const token = await registerForPushNotifications();
            
            // Schedule upcoming bill reminders
            await scheduleUpcomingBillReminders(user.id);
            
            // Check for budget threshold and send notification if needed
            await scheduleBudgetThresholdNotification(user.id).catch(err => {
              // Just log errors, don't disrupt the user experience
              console.error('Budget threshold notification error:', err);
            });
          } catch (error) {
            console.error('Error setting up notifications:', error);
          }
        }
      };
      
      initializeNotifications();
      loadBudgetData();
    }, [user, loadBudgetData])
  );

  const loadTransactions = useCallback(() => {
    const recentTransactions = getFilteredTransactions({});
    setTransactions(recentTransactions.slice(0, 15)); // Limit to most recent 15 transactions for performance
  }, [getFilteredTransactions]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    loadTransactions();
    loadBudgetData();
    setRefreshing(false);
  };

  const handleTransactionPress = (transaction) => {
    // Only pass serializable data
    const serializableTransaction = {
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date,
      // Add any other necessary fields that are serializable
    };
    navigation.navigate('TransactionDetail', { id: transaction.id, transaction: serializableTransaction });
  };

  const showAddModal = () => {
    setAddModalVisible(true);
  };

  const hideAddModal = () => {
    setAddModalVisible(false);
  };

  // Temporary: comment out animations until Reanimated is fixed
  // Calculate header opacity based on scroll
  /*
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  // Calculate header elevation based on scroll
  const headerElevation = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, Platform.OS === 'ios' ? 0.3 : 5],
    extrapolate: 'clamp',
  });
  */

  const navigateToBudgetScreen = () => {
    navigation.navigate('Budget');
  };

  // Budget Summary Card Component
  const BudgetSummaryCard = () => {
    if (!monthlyBudget || monthlyBudget <= 0) return null;
    
    const totalSpent = stats?.expense ? Math.abs(stats.expense) : 0;
    const remaining = monthlyBudget - totalSpent;
    const isOverBudget = remaining < 0;
    
    return (
      <TouchableOpacity 
        style={styles.budgetCard}
        onPress={navigateToBudgetScreen}
        activeOpacity={0.8}
      >
        <View style={styles.budgetHeaderRow}>
          <Text style={styles.budgetTitle}>Monthly Budget</Text>
          <Text style={styles.budgetAmountText}>
            {formatCurrency(monthlyBudget, currency)}
          </Text>
        </View>
        
        <View style={styles.budgetProgressContainer}>
          <ProgressBar 
            progress={budgetUsage}
            color={isOverBudget ? theme.colors.status.error : theme.colors.status.success}
            height={8}
          />
          <View style={styles.budgetProgressLabels}>
            <Text style={styles.budgetUsedText}>
              {formatCurrency(totalSpent, currency)} spent
            </Text>
            <Text style={[
              styles.budgetRemainingText,
              isOverBudget ? { color: theme.colors.status.error } : {}
            ]}>
              {isOverBudget ? 'Over by ' : ''}{formatCurrency(Math.abs(remaining), currency)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="receipt-outline" size={70} color={theme.colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start adding your income and expenses by tapping the + button below
      </Text>
      <TouchableOpacity 
        style={styles.startButton}
        onPress={showAddModal}
      >
        <Text style={styles.startButtonText}>Add First Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AnimatedScreenWrapper>
      <SafeAreaView style={styles.container}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={theme.colors.primary}
          translucent={true}
        />
        
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>
                    {(user?.displayName?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.balanceCardContainer}>
            <BalanceCard onPress={showAddModal} />
          </View>
        </LinearGradient>
        
        <FlatList
          ListHeaderComponent={
            <View style={styles.contentContainer}>
              {/* Budget Summary Card */}
              <BudgetSummaryCard />
              
              {/* Upcoming Bills Card */}
              {showUpcomingBills && (
                <UpcomingBillsCard navigation={navigation} />
              )}
          
              <View style={styles.transactionHeaderContainer}>
                <Text style={styles.recentTransactionsTitle}>Recent Transactions</Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('Transactions')}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          }
          data={transactions}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              onPress={handleTransactionPress}
            />
          )}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={
            transactions.length === 0 
              ? styles.emptyListContainer 
              : styles.transactionListContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />

        {/* Add Transaction Modal */}
        <AddTransactionModal 
          visible={isAddModalVisible} 
          onClose={hideAddModal} 
        />
      </SafeAreaView>
    </AnimatedScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
    paddingBottom: 50, // Increased padding to make room for the floating card
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  welcomeText: {
    fontSize: theme.typography.fontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: theme.typography.fontWeight.medium,
  },
  userName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: 'white',
    marginTop: theme.spacing.xs,
  },
  profileButton: {
    height: 52,
    width: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  profileImage: {
    height: '100%',
    width: '100%',
  },
  profileImagePlaceholder: {
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceCardContainer: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    zIndex: 10,
  },
  budgetCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  budgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  budgetTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  budgetAmountText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  budgetProgressContainer: {
    marginTop: theme.spacing.xs,
  },
  budgetProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  budgetUsedText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  budgetRemainingText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.status.success,
  },
  contentContainer: {
    flex: 1,
    marginTop: -60,  // Pull content up to overlap with the header gradient
    paddingTop: 70,  // Add padding to ensure content is visible below the balance card
    backgroundColor: theme.colors.background.light,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    zIndex: 5,
  },
  transactionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  recentTransactionsTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(160, 149, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.lg,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
  emptyListContainer: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  transactionListContainer: {
    paddingBottom: 120,
    paddingTop: theme.spacing.md,
  },
});

export default HomeScreen; 