/**
 * Utility functions for data processing and analysis
 */

/**
 * Group transactions by category
 * @param {Array} transactions - Array of transaction objects
 * @param {string} type - Transaction type to filter by ('income', 'expense', or 'all')
 * @returns {Object} Object with categories as keys and arrays of transactions as values
 */
export const groupTransactionsByCategory = (transactions, type = 'all') => {
  const filteredTransactions = type === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === type);
  
  return filteredTransactions.reduce((groups, transaction) => {
    const category = transaction.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(transaction);
    return groups;
  }, {});
};

/**
 * Calculate total amount by category
 * @param {Array} transactions - Array of transaction objects
 * @param {string} type - Transaction type to filter by ('income', 'expense', or 'all')
 * @returns {Object} Object with categories as keys and total amounts as values
 */
export const calculateTotalsByCategory = (transactions, type = 'all') => {
  const filteredTransactions = type === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === type);
  
  return filteredTransactions.reduce((totals, transaction) => {
    const category = transaction.category;
    if (!totals[category]) {
      totals[category] = 0;
    }
    totals[category] += transaction.amount;
    return totals;
  }, {});
};

/**
 * Group transactions by date
 * @param {Array} transactions - Array of transaction objects
 * @param {string} groupBy - How to group ('day', 'month', 'year')
 * @returns {Object} Object with dates as keys and arrays of transactions as values
 */
export const groupTransactionsByDate = (transactions, groupBy = 'day') => {
  return transactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date);
    let key;
    
    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // YYYY-MM
    } else if (groupBy === 'year') {
      key = date.getFullYear().toString(); // YYYY
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(transaction);
    return groups;
  }, {});
};

/**
 * Filter transactions by date range
 * @param {Array} transactions - Array of transaction objects
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Array} Filtered array of transactions
 */
export const filterTransactionsByDateRange = (transactions, startDate, endDate) => {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= start && transactionDate <= end;
  });
};

/**
 * Calculate overall financial summary
 * @param {Array} transactions - Array of transaction objects
 * @returns {Object} Object containing income, expense, and balance totals
 */
export const calculateFinancialSummary = (transactions) => {
  let income = 0;
  let expense = 0;
  
  transactions.forEach(transaction => {
    if (transaction.type === 'income') {
      income += transaction.amount;
    } else if (transaction.type === 'expense') {
      expense += transaction.amount;
    }
  });
  
  return {
    income,
    expense,
    balance: income - expense
  };
}; 