import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth, db } from './firebase';
import { doc, getDoc, getDocs, collection, query, where, Timestamp, limit } from 'firebase/firestore';

// Check and request notification permissions
export const registerForPushNotifications = async () => {
  try {
    // Check if device is physical (not simulator/emulator)
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return false;
      }
      
      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      
      // Configure notification handling
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      
      return token;
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
  
  return null;
};

// Schedule notifications when spending approaches monthly budget limit
export const scheduleBudgetThresholdNotification = async (userId) => {
  try {
    if (!userId) return false;
    
    // Verify user auth state and permissions
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    // Get the user document to get the monthly budget
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    const monthlyBudget = userData.monthlyBudget;
    const currency = userData.currency || 'USD';
    
    // If no budget set, no need to check
    if (!monthlyBudget || monthlyBudget <= 0) {
      return false;
    }
    
    // Calculate current month's spending
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get expenses for current month
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const expenseQuery = query(
      transactionsRef,
      where('type', '==', 'expense')
    );
    
    const expensesSnapshot = await getDocs(expenseQuery);
    let totalSpent = 0;
    
    expensesSnapshot.forEach(doc => {
      const transaction = doc.data();
      const transactionDate = transaction.date instanceof Timestamp 
        ? transaction.date.toDate() 
        : new Date(transaction.date);
      
      // Only count expenses for the current month
      if (transactionDate.getMonth() === currentMonth && 
          transactionDate.getFullYear() === currentYear) {
        totalSpent += Math.abs(transaction.amount);
      }
    });
    
    // Calculate percentage of budget used
    const budgetUsed = (totalSpent / monthlyBudget) * 100;
    
    // Check for last notification sent to avoid duplicates
    const lastNotificationKey = `budget_notification_${userId}_${currentYear}_${currentMonth}`;
    const lastNotification = await AsyncStorage.getItem(lastNotificationKey);
    const lastNotificationData = lastNotification ? JSON.parse(lastNotification) : { lastThreshold: 0 };
    
    // Define thresholds for notifications
    const thresholds = [
      { percent: 80, message: 'You have used 80% of your monthly budget.' },
      { percent: 90, message: 'You have used 90% of your monthly budget! Be careful with additional expenses.' },
      { percent: 100, message: 'You have reached your monthly budget limit!' },
      { percent: 110, message: 'Warning: You have exceeded your monthly budget by 10%!' }
    ];
    
    // Check if we've crossed any new thresholds
    let highestThresholdCrossed = 0;
    let notificationMessage = '';
    
    for (const threshold of thresholds) {
      if (budgetUsed >= threshold.percent && threshold.percent > lastNotificationData.lastThreshold) {
        if (threshold.percent > highestThresholdCrossed) {
          highestThresholdCrossed = threshold.percent;
          notificationMessage = threshold.message;
        }
      }
    }
    
    // If we crossed a new threshold, send notification
    if (highestThresholdCrossed > 0) {
      // Format currency for the message
      const formattedTotal = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(totalSpent);
      
      const formattedBudget = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(monthlyBudget);
      
      // Schedule immediate notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Budget Alert',
          body: `${notificationMessage} (${formattedTotal} of ${formattedBudget})`,
          data: { type: 'budget_alert', spent: totalSpent, budget: monthlyBudget },
        },
        trigger: null, // Send immediately
      });
      
      // Update the last notification threshold
      await AsyncStorage.setItem(lastNotificationKey, JSON.stringify({
        lastThreshold: highestThresholdCrossed,
        timestamp: new Date().toISOString()
      }));
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error scheduling budget threshold notification:', error);
    return false;
  }
};

// Schedule local notification for upcoming bills
export const scheduleUpcomingBillReminders = async (userId) => {
  try {
    if (!userId) return false;
    
    // Verify user auth state and permissions
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    // Verify the user has the correct permissions
    try {
      // Test by getting the user document first
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return false;
      }
    } catch (permissionError) {
      return false;
    }
    
    // Cancel any existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    let bills = [];
    let recurringBills = [];
    
    // Get transactions categorized as bills
    try {
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const billsQuery = query(
        transactionsRef, 
        where('category', '==', 'bills'),
        where('type', '==', 'expense')
      );
      
      const billsSnapshot = await getDocs(billsQuery);
      
      if (billsSnapshot.empty) {
        // Continue execution to check recurring bills
      } else {
        billsSnapshot.forEach(doc => {
          bills.push(doc.data());
        });
      }
    } catch (transactionError) {
      // Continue with empty bills array
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get recurring bills
    try {
      const recurringRef = collection(db, 'users', userId, 'recurringTransactions');
      const recurringSnapshot = await getDocs(recurringRef);
      
      recurringSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.baseTransaction && 
            data.baseTransaction.category === 'bills' &&
            data.baseTransaction.type === 'expense') {
          recurringBills.push(data);
        }
      });
    } catch (recurringError) {
      // Continue with empty recurringBills array
    }
    
    // If no data was fetched, return false
    if (bills.length === 0 && recurringBills.length === 0) {
      return false;
    }
    
    // Group bills by due date pattern (e.g., bills that occur on the same day of month)
    const billsByDay = {};
    bills.forEach(bill => {
      const billDate = bill.date instanceof Timestamp 
        ? bill.date.toDate() 
        : new Date(bill.date);
      
      const dayOfMonth = billDate.getDate();
      const key = `${dayOfMonth}`;
      
      if (!billsByDay[key]) {
        billsByDay[key] = [];
      }
      
      billsByDay[key].push(bill);
    });
    
    // Add recurring bills to the day patterns
    recurringBills.forEach(recurringBill => {
      const startDate = recurringBill.startDate instanceof Timestamp 
        ? recurringBill.startDate.toDate() 
        : new Date(recurringBill.startDate);
      
      const dayOfMonth = startDate.getDate();
      
      if (!billsByDay[dayOfMonth]) {
        billsByDay[dayOfMonth] = [];
      }
      
      billsByDay[dayOfMonth].push({
        ...recurringBill.baseTransaction,
        date: startDate,
        recurring: true
      });
    });
    
    // Schedule notifications for each bill pattern
    for (const [dayOfMonth, bills] of Object.entries(billsByDay)) {
      const dayNum = parseInt(dayOfMonth);
      
      // Create next bill date (may be this month or next month)
      let nextBillDate = new Date(currentYear, currentMonth, dayNum);
      
      // If the day has already passed this month, schedule for next month
      if (nextBillDate < now) {
        nextBillDate = new Date(currentYear, currentMonth + 1, dayNum);
      }
      
      // Schedule reminder 3 days before the bill is due
      const reminderDate = new Date(nextBillDate);
      reminderDate.setDate(reminderDate.getDate() - 3);
      
      // If reminder date is in the past, don't schedule
      if (reminderDate <= now) continue;
      
      // Calculate total amount due for this day
      const totalDue = bills.reduce((sum, bill) => sum + Math.abs(bill.amount), 0);
      
      // Create bill names list
      const billNames = bills.map(bill => bill.note || bill.description || 'Unnamed bill').join(', ');
      
      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Upcoming Bills Reminder`,
          body: `You have bills due on the ${dayNum}${getDaySuffix(dayNum)}: ${billNames} (Total: $${totalDue.toFixed(2)})`,
          data: { bills },
        },
        trigger: reminderDate,
      });
      
      // Also schedule a notification on the due date
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Bills Due Today`,
          body: `Don't forget to pay today's bills: ${billNames} (Total: $${totalDue.toFixed(2)})`,
          data: { bills },
        },
        trigger: nextBillDate,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error scheduling bill reminders:', error);
    return false;
  }
};

// Helper function to get the day suffix (1st, 2nd, 3rd, etc.)
const getDaySuffix = (day) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Check for upcoming bills and return them
export const getUpcomingBills = async (userId) => {
  try {
    if (!userId) return [];
    
    // Verify user auth state and permissions
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }

    // Verify the user has the correct permissions
    try {
      // Test by getting the user document first
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return [];
      }
    } catch (permissionError) {
      return [];
    }
    
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);
    
    let bills = [];
    
    // Get bills from the bills collection
    try {
      const billsRef = collection(db, 'users', userId, 'bills');
      const billsSnapshot = await getDocs(billsRef);
      
      billsSnapshot.forEach(doc => {
        const billData = doc.data();
        const dueDate = billData.dueDate instanceof Timestamp 
          ? billData.dueDate.toDate() 
          : new Date(billData.dueDate);
        
        bills.push({
          id: doc.id,
          ...billData,
          date: dueDate,
          recurring: billData.frequency !== 'once'
        });
      });
    } catch (billsError) {
      // Continue with empty bills array
    }
    
    // Sort by date
    return bills.sort((a, b) => {
      const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
      const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });
    
  } catch (error) {
    console.error('Error getting upcoming bills:', error);
    return [];
  }
};

// Function to check Firestore permissions on app startup
export const checkFirestorePermissions = async (userId) => {
  if (!userId) return false;
  
  try {
    // Verify user auth state 
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    // Test reading the user document
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }
    
    // Test reading from transactions collection
    try {
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      await getDocs(query(transactionsRef, limit(1)));
    } catch (error) {
      return false;
    }
    
    // Test reading from recurringTransactions collection
    try {
      const recurringRef = collection(db, 'users', userId, 'recurringTransactions');
      await getDocs(query(recurringRef, limit(1)));
    } catch (error) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking Firestore permissions:', error);
    return false;
  }
}; 