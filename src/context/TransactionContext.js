import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateFinancialSummary } from '../utils/dataUtils';
import { auth } from '../utils/firebase';

const TransactionContext = createContext();

export const useTransactions = () => {
  return useContext(TransactionContext);
};

export const TransactionProvider = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    categories: {}
  });

  // Load transactions from Firestore when user changes
  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      setError('');
      
      try {
        if (user) {
          // Get the Firebase auth UID directly to avoid any ID mismatch issues
          const firebaseUid = auth.currentUser?.uid;
          if (!firebaseUid) {
            throw new Error('Firebase auth user not found');
          }
          
          // First try to load from AsyncStorage for quick display
          const cachedData = await AsyncStorage.getItem(`transactions_${firebaseUid}`);
          if (cachedData) {
            const parsedTransactions = JSON.parse(cachedData);
            setTransactions(parsedTransactions);
            const financialSummary = calculateFinancialSummary(parsedTransactions);
            setStats({
              ...financialSummary,
              categories: {}
            });
          }
          
          // Then load from Firestore (network)
          const transactionsRef = collection(db, 'transactions');
          const q = query(
            transactionsRef, 
            where('userId', '==', firebaseUid),
            orderBy('date', 'desc')
          );
          
          const querySnapshot = await getDocs(q);
          const transactionsList = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Convert Firestore timestamps to ISO strings
            const transaction = {
              id: data.id || doc.id, // Use the internal ID if available, otherwise use Firestore ID
              firestoreId: doc.id,   // Always store the Firestore document ID
              ...data,
              date: data.date.toDate().toISOString(),
              createdAt: data.createdAt?.toDate().toISOString(),
              updatedAt: data.updatedAt?.toDate().toISOString(),
            };
            transactionsList.push(transaction);
          });
          
          // Save to state and AsyncStorage
          setTransactions(transactionsList);
          await AsyncStorage.setItem(
            `transactions_${firebaseUid}`, 
            JSON.stringify(transactionsList)
          );
          
          // Calculate statistics
          const financialSummary = calculateFinancialSummary(transactionsList);
          setStats({
            ...financialSummary,
            categories: {}
          });
        } else {
          setTransactions([]);
          resetStats();
        }
      } catch (error) {
        console.error('Failed to load transactions:', error);
        
        // Provide more specific error messages
        if (error.code === 'permission-denied') {
          setError('Permission denied: You do not have access to these transactions.');
        } else if (error.code === 'unavailable' || error.code === 'network-request-failed') {
          setError('Network error: Please check your internet connection.');
        } else {
          setError('Failed to load transactions. Please try again later.');
        }
        
        // Still use cached data if available
        try {
          // Get the Firebase auth UID for AsyncStorage
          const firebaseUid = auth.currentUser?.uid;
          const cachedData = await AsyncStorage.getItem(`transactions_${firebaseUid || user?.id}`);
          if (cachedData) {
            const parsedTransactions = JSON.parse(cachedData);
            setTransactions(parsedTransactions);
            const financialSummary = calculateFinancialSummary(parsedTransactions);
            setStats({
              ...financialSummary,
              categories: {}
            });
          }
        } catch (storageError) {
          console.error('Failed to load cached transactions:', storageError);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadTransactions();
    } else {
      setTransactions([]);
      resetStats();
      setLoading(false);
    }
  }, [user]);

  // Reset stats to initial state
  const resetStats = () => {
    setStats({
      balance: 0,
      income: 0,
      expense: 0,
      categories: {}
    });
  };

  // Add a new transaction
  const addTransaction = async (transaction) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }
      
      // Get the Firebase auth UID directly to avoid any ID mismatch issues
      const firebaseUid = auth.currentUser?.uid;
      if (!firebaseUid) {
        throw new Error('Firebase auth user not found');
      }
      
      const newTransaction = {
        ...transaction,
        userId: firebaseUid,
        amount: Number(transaction.amount),
        date: Timestamp.fromDate(new Date(transaction.date || new Date())),
        createdAt: Timestamp.now(),
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'transactions'), newTransaction);
      
      // Convert for local state
      const transactionForState = {
        id: docRef.id,
        ...newTransaction,
        date: newTransaction.date.toDate().toISOString(),
        createdAt: newTransaction.createdAt.toDate().toISOString(),
      };

      // Update local state
      const updatedTransactions = [...transactions, transactionForState];
      setTransactions(updatedTransactions);
      
      // Update AsyncStorage
      await AsyncStorage.setItem(
        `transactions_${firebaseUid}`, 
        JSON.stringify(updatedTransactions)
      );
      
      // Update stats
      const financialSummary = calculateFinancialSummary(updatedTransactions);
      setStats({
        ...financialSummary,
        categories: {}
      });
      
      return true;
    } catch (error) {
      console.error('Error adding transaction:', error);
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        setError('Permission denied: You do not have access to add transactions.');
      } else if (error.code === 'unavailable' || error.code === 'network-request-failed') {
        setError('Network error: Please check your internet connection.');
      } else if (error.message.includes('User must be logged in')) {
        setError('You must be logged in to add transactions.');
      } else {
        setError('Failed to add transaction. Please try again later.');
      }
      
      return false;
    }
  };

  // Update a transaction
  const updateTransaction = async (id, updatedData) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }
      
      // Get the Firebase auth UID directly to avoid any ID mismatch issues
      const firebaseUid = auth.currentUser?.uid;
      if (!firebaseUid) {
        throw new Error('Firebase auth user not found');
      }
      
      // Prepare data for Firestore
      const dataForFirestore = {
        ...updatedData,
        userId: firebaseUid, // Use Firebase auth UID directly
        amount: Number(updatedData.amount),
        updatedAt: Timestamp.now(),
      };
      
      // Handle date conversion if present
      if (updatedData.date) {
        dataForFirestore.date = Timestamp.fromDate(
          new Date(updatedData.date)
        );
      }
      
      // First check if document exists
      const transactionRef = doc(db, 'transactions', id);
      
      try {
        // Check if document exists before updating
        const docSnap = await getDoc(transactionRef);
        
        if (docSnap.exists()) {
          // Document exists, update it
          await updateDoc(transactionRef, dataForFirestore);
        } else {
          // Document doesn't exist, create it with the specified ID
          await setDoc(transactionRef, {
            ...dataForFirestore,
            id,
            userId: firebaseUid, // Use Firebase auth UID directly
            createdAt: Timestamp.now()
          });
        }
      } catch (docError) {
        // Handle document operation errors
        console.error('Document operation error:', docError);
        throw docError;
      }
      
      // Update local state
      const updatedTransactions = transactions.map(transaction => {
        if (transaction.id === id) {
          return {
            ...transaction,
            ...updatedData,
            userId: firebaseUid,
            updatedAt: new Date().toISOString(),
          };
        }
        return transaction;
      });
      
      setTransactions(updatedTransactions);
      
      // Update AsyncStorage
      await AsyncStorage.setItem(
        `transactions_${firebaseUid}`, 
        JSON.stringify(updatedTransactions)
      );
      
      // Update stats
      const financialSummary = calculateFinancialSummary(updatedTransactions);
      setStats({
        ...financialSummary,
        categories: {}
      });
      
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Failed to update transaction');
      return false;
    }
  };

  // Delete a transaction
  const deleteTransaction = async (id) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }
      
      // Get the Firebase auth UID directly to avoid any ID mismatch issues
      const firebaseUid = auth.currentUser?.uid;
      if (!firebaseUid) {
        throw new Error('Firebase auth user not found');
      }

      // Find the transaction in our local state to get any custom ID
      const transactionToDelete = transactions.find(t => t.id === id);
      if (!transactionToDelete) {
        throw new Error('Transaction not found');
      }
      
      // Check if there's a Firestore ID mismatch between document ID and transaction.id field
      const firestoreId = transactionToDelete.firestoreId || id;
      
      // Delete from Firestore
      const transactionRef = doc(db, 'transactions', firestoreId);
      await deleteDoc(transactionRef);
      
      // Update local state
      const updatedTransactions = transactions.filter(
        transaction => transaction.id !== id
      );
      
      setTransactions(updatedTransactions);
      
      // Update AsyncStorage
      await AsyncStorage.setItem(
        `transactions_${firebaseUid}`, 
        JSON.stringify(updatedTransactions)
      );
      
      // Update stats
      const financialSummary = calculateFinancialSummary(updatedTransactions);
      setStats({
        ...financialSummary,
        categories: {}
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        setError('Permission denied: You do not have access to delete this transaction.');
      } else if (error.code === 'unavailable' || error.code === 'network-request-failed') {
        setError('Network error: Please check your internet connection.');
      } else if (error.message.includes('User must be logged in')) {
        setError('You must be logged in to delete transactions.');
      } else if (error.message.includes('Transaction not found')) {
        setError('Transaction not found. It may have been already deleted.');
      } else {
        setError('Failed to delete transaction. Please try again later.');
      }
      
      return false;
    }
  };

  // Get a specific transaction by ID
  const getTransactionById = (id) => {
    if (!id) return null;
    return transactions.find(transaction => transaction.id === id) || null;
  };

  // Get transactions filtered by type and date range
  const getFilteredTransactions = (filters = {}) => {
    const { type, category, startDate, endDate, searchTerm } = filters;
    
    return transactions.filter(transaction => {
      // Filter by type
      if (type && transaction.type !== type) {
        return false;
      }
      
      // Filter by category
      if (category && transaction.category !== category) {
        return false;
      }
      
      // Filter by date range
      const transactionDate = new Date(transaction.date);
      if (startDate && transactionDate < new Date(startDate)) {
        return false;
      }
      if (endDate && transactionDate > new Date(endDate)) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && 
          !transaction.note?.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !transaction.category.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
  };

  const value = {
    transactions,
    stats,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getFilteredTransactions,
    getTransactionById,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}; 