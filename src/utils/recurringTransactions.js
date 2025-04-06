/**
 * Recurring Transactions Utility
 * 
 * This utility helps manage recurring transactions with different frequencies.
 * It generates transaction instances based on recurrence rules and checks
 * which transactions are due for a given time period.
 */

import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

// Frequency definitions
export const RECURRENCE_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
};

/**
 * Create a recurring transaction definition
 * @param {Object} transaction - Base transaction object
 * @param {string} frequency - Recurrence frequency from RECURRENCE_FREQUENCIES
 * @param {Date} startDate - Start date for recurrence
 * @param {Date|null} endDate - Optional end date for recurrence
 * @param {number} occurrences - Optional number of occurrences (alternative to endDate)
 * @returns {Object} Recurring transaction definition
 */
export const createRecurringTransaction = (
  transaction,
  frequency,
  startDate,
  endDate = null,
  occurrences = null
) => {
  // Validate arguments
  if (!transaction || !frequency || !startDate) {
    throw new Error('Missing required parameters for recurring transaction');
  }
  
  if (!Object.values(RECURRENCE_FREQUENCIES).includes(frequency)) {
    throw new Error(`Invalid frequency: ${frequency}`);
  }
  
  if (endDate && occurrences) {
    throw new Error('Cannot specify both endDate and occurrences');
  }
  
  // Create a unique ID for the recurring transaction
  const recurringId = `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  return {
    id: recurringId,
    baseTransaction: {
      ...transaction,
      isRecurring: true,
      recurringId,
    },
    frequency,
    startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
    endDate: endDate instanceof Date ? endDate.toISOString() : endDate,
    occurrences,
    createdInstances: 0,
    lastCreatedDate: null,
    active: true,
  };
};

/**
 * Calculate the next occurrence date based on frequency and previous date
 * @param {Date} previousDate - The previous occurrence date
 * @param {string} frequency - Recurrence frequency
 * @returns {Date} The next occurrence date
 */
export const calculateNextOccurrence = (previousDate, frequency) => {
  const nextDate = new Date(previousDate);
  
  switch (frequency) {
    case RECURRENCE_FREQUENCIES.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case RECURRENCE_FREQUENCIES.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case RECURRENCE_FREQUENCIES.BIWEEKLY:
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case RECURRENCE_FREQUENCIES.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case RECURRENCE_FREQUENCIES.QUARTERLY:
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case RECURRENCE_FREQUENCIES.YEARLY:
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
  
  return nextDate;
};

/**
 * Get all occurrences for a recurring transaction within a date range
 * @param {Object} recurringDef - Recurring transaction definition
 * @param {Date} startRange - Start date of the range
 * @param {Date} endRange - End date of the range
 * @returns {Array} Array of transaction instances with dates
 */
export const getOccurrencesInRange = (recurringDef, startRange, endRange) => {
  const {
    baseTransaction,
    frequency,
    startDate,
    endDate,
    occurrences,
    createdInstances,
  } = recurringDef;
  
  // Parse dates
  const recStart = new Date(startDate);
  const recEnd = endDate ? new Date(endDate) : null;
  const rangeStart = new Date(startRange);
  const rangeEnd = new Date(endRange);
  
  // Ensure range start is not before recurring start
  if (rangeStart < recStart) {
    rangeStart.setTime(recStart.getTime());
  }
  
  const instances = [];
  let currentDate = recStart;
  let instanceCount = 0;
  
  // Loop until we reach the end of the range or recurrence limits
  while (currentDate <= rangeEnd) {
    // Check if we've reached recurrence limits
    if (
      (recEnd && currentDate > recEnd) ||
      (occurrences && instanceCount >= occurrences)
    ) {
      break;
    }
    
    // If the current date is within our range, add an instance
    if (currentDate >= rangeStart) {
      instances.push({
        ...baseTransaction,
        date: currentDate.toISOString(),
        id: `${baseTransaction.id}_${instanceCount}`,
        isRecurringInstance: true,
        recurringId: baseTransaction.recurringId,
        instanceIndex: instanceCount,
      });
    }
    
    // Move to next occurrence
    currentDate = calculateNextOccurrence(currentDate, frequency);
    instanceCount++;
  }
  
  return instances;
};

/**
 * Update a recurring transaction in Firestore
 * @param {string} userId - The user ID
 * @param {Object} recurringDef - Recurring transaction definition
 * @returns {Promise} Promise that resolves when the update is complete
 */
export const updateRecurringTransaction = async (userId, recurringDef) => {
  if (!userId || !recurringDef) {
    throw new Error('Missing required parameters');
  }
  
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    // Get current recurring transactions
    const userData = userDoc.data();
    const recurringTransactions = userData.recurringTransactions || [];
    
    // Find and update existing definition
    const existingIndex = recurringTransactions.findIndex(
      rt => rt.id === recurringDef.id
    );
    
    if (existingIndex >= 0) {
      // Remove old definition
      const oldDef = recurringTransactions[existingIndex];
      await updateDoc(userDocRef, {
        recurringTransactions: arrayRemove(oldDef),
      });
      
      // Add updated definition
      await updateDoc(userDocRef, {
        recurringTransactions: arrayUnion(recurringDef),
      });
    } else {
      // Add new definition
      await updateDoc(userDocRef, {
        recurringTransactions: arrayUnion(recurringDef),
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    throw error;
  }
};

/**
 * Delete a recurring transaction from Firestore
 * @param {string} userId - The user ID
 * @param {Object} recurringDef - Recurring transaction definition
 * @returns {Promise} Promise that resolves when the deletion is complete
 */
export const deleteRecurringTransaction = async (userId, recurringDef) => {
  if (!userId || !recurringDef) {
    throw new Error('Missing required parameters');
  }
  
  try {
    const userDocRef = doc(db, 'users', userId);
    
    // Remove the definition
    await updateDoc(userDocRef, {
      recurringTransactions: arrayRemove(recurringDef),
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    throw error;
  }
};

/**
 * Process due recurring transactions for a user
 * This should be called periodically to generate transaction instances
 * @param {string} userId - The user ID
 * @param {Date} asOfDate - The date to check for due transactions (default: now)
 * @returns {Promise<Array>} Promise that resolves with new transaction instances
 */
export const processDueRecurringTransactions = async (userId, asOfDate = new Date()) => {
  if (!userId) {
    throw new Error('Missing required user ID');
  }
  
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    // Get current recurring transactions
    const userData = userDoc.data();
    const recurringTransactions = userData.recurringTransactions || [];
    const currentTransactions = userData.transactions || [];
    
    const newInstances = [];
    const updatedDefinitions = [];
    
    // Process each recurring transaction
    for (const recurringDef of recurringTransactions) {
      if (!recurringDef.active) continue;
      
      // Determine the date range to check
      const lastCreated = recurringDef.lastCreatedDate 
        ? new Date(recurringDef.lastCreatedDate)
        : new Date(recurringDef.startDate);
      
      // Get instances due until today
      const dueInstances = getOccurrencesInRange(
        recurringDef,
        lastCreated,
        asOfDate
      );
      
      if (dueInstances.length > 0) {
        // Add to new instances array
        newInstances.push(...dueInstances);
        
        // Update the recurring definition
        const updatedDef = {
          ...recurringDef,
          createdInstances: recurringDef.createdInstances + dueInstances.length,
          lastCreatedDate: asOfDate.toISOString(),
        };
        
        // Check if we've reached the end of occurrences
        if (
          recurringDef.occurrences && 
          updatedDef.createdInstances >= recurringDef.occurrences
        ) {
          updatedDef.active = false;
        }
        
        updatedDefinitions.push({
          oldDef: recurringDef,
          newDef: updatedDef,
        });
      }
    }
    
    // Update Firestore if we have new instances
    if (newInstances.length > 0) {
      // Update transaction list
      await updateDoc(userDocRef, {
        transactions: [...currentTransactions, ...newInstances],
      });
      
      // Update recurring definitions
      for (const { oldDef, newDef } of updatedDefinitions) {
        await updateDoc(userDocRef, {
          recurringTransactions: arrayRemove(oldDef),
        });
        await updateDoc(userDocRef, {
          recurringTransactions: arrayUnion(newDef),
        });
      }
    }
    
    return newInstances;
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
    throw error;
  }
};

/**
 * Get a human-readable description of a recurrence frequency
 * @param {string} frequency - Recurrence frequency
 * @returns {string} Human-readable description
 */
export const getFrequencyDescription = (frequency) => {
  switch (frequency) {
    case RECURRENCE_FREQUENCIES.DAILY:
      return 'Daily';
    case RECURRENCE_FREQUENCIES.WEEKLY:
      return 'Weekly';
    case RECURRENCE_FREQUENCIES.BIWEEKLY:
      return 'Every 2 weeks';
    case RECURRENCE_FREQUENCIES.MONTHLY:
      return 'Monthly';
    case RECURRENCE_FREQUENCIES.QUARTERLY:
      return 'Every 3 months';
    case RECURRENCE_FREQUENCIES.YEARLY:
      return 'Yearly';
    default:
      return 'Custom';
  }
};

export default {
  RECURRENCE_FREQUENCIES,
  createRecurringTransaction,
  calculateNextOccurrence,
  getOccurrencesInRange,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  processDueRecurringTransactions,
  getFrequencyDescription,
}; 