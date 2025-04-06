/**
 * Chart Utilities for Expense Tracker
 * Provides helper functions for creating chart configurations
 * for use with react-native-chart-kit or similar libraries
 */

import { formatCurrency, formatShortDate } from './formatters';

/**
 * Generates color palette for charts with optional opacity
 * @param {number} count - Number of colors needed
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string[]} Array of color hex/rgba values
 */
export const generateChartColors = (count, opacity = 1) => {
  // Base colors
  const baseColors = [
    '#FF6384', // red
    '#36A2EB', // blue
    '#FFCE56', // yellow
    '#4BC0C0', // teal
    '#9966FF', // purple
    '#FF9F40', // orange
    '#2FCC71', // green
    '#F39C12', // amber
    '#8E44AD', // violet
    '#3498DB', // sky blue
  ];

  // Generate colors based on count needed
  return Array(count).fill().map((_, i) => {
    const colorIndex = i % baseColors.length;
    const color = baseColors[colorIndex];
    
    // If opacity is 1, return the hex color
    if (opacity === 1) return color;
    
    // Otherwise, convert to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  });
};

/**
 * Creates configuration for a pie chart showing expense distribution by category
 * @param {Array} transactions - Transactions array
 * @param {string} currency - Currency code
 * @returns {Object} Pie chart configuration
 */
export const createCategoryPieChartConfig = (transactions, currency) => {
  // Group expenses by category
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, transaction) => {
      const { category, amount } = transaction;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Math.abs(amount);
      return acc;
    }, {});

  // Convert to array and sort by amount (descending)
  const categoriesArray = Object.entries(expensesByCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Generate colors
  const colors = generateChartColors(categoriesArray.length);

  // Create chart data
  const chartData = categoriesArray.map((item, index) => ({
    name: item.name,
    amount: item.amount,
    color: colors[index],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  return {
    data: chartData,
    hasLegend: true,
    accessor: 'amount',
    backgroundColor: 'transparent',
    paddingLeft: '15',
    absolute: false,
  };
};

/**
 * Creates configuration for a line chart showing spending over time
 * @param {Array} transactions - Transactions array
 * @param {number} months - Number of months to include
 * @param {string} currency - Currency code
 * @returns {Object} Line chart configuration
 */
export const createExpenseTrendLineChartConfig = (transactions, months = 6, currency) => {
  // Get date range (last X months)
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);

  // Initialize months array
  const labels = [];
  const datasets = [
    {
      data: [],
      color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
      strokeWidth: 2,
    },
    {
      data: [],
      color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
      strokeWidth: 2,
    }
  ];

  // Fill months array
  for (let i = 0; i < months; i++) {
    const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    labels.push(monthDate.toLocaleString('default', { month: 'short' }));
    
    // Initialize with zeros
    datasets[0].data.push(0); // expenses
    datasets[1].data.push(0); // income
  }

  // Fill data with actual transactions
  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    
    // Skip if transaction is before our start date
    if (transactionDate < startDate) return;
    
    // Calculate which month this transaction belongs to
    const monthIndex = (transactionDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       transactionDate.getMonth() - startDate.getMonth();
    
    if (monthIndex >= 0 && monthIndex < months) {
      if (transaction.type === 'expense') {
        datasets[0].data[monthIndex] += Math.abs(transaction.amount);
      } else {
        datasets[1].data[monthIndex] += transaction.amount;
      }
    }
  });

  return {
    labels,
    datasets,
    legend: ['Expenses', 'Income'],
  };
};

/**
 * Creates configuration for a bar chart comparing income vs expenses
 * @param {Array} transactions - Transactions array 
 * @param {number} months - Number of months to include
 * @param {string} currency - Currency code
 * @returns {Object} Bar chart configuration
 */
export const createIncomeExpenseBarChartConfig = (transactions, months = 3, currency) => {
  // Get date range (last X months)
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);

  // Initialize data structure
  const labels = [];
  const incomeData = [];
  const expenseData = [];

  // Fill months array
  for (let i = 0; i < months; i++) {
    const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    labels.push(monthDate.toLocaleString('default', { month: 'short' }));
    incomeData.push(0);
    expenseData.push(0);
  }

  // Fill data with actual transactions
  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    
    // Skip if transaction is before our start date
    if (transactionDate < startDate) return;
    
    // Calculate which month this transaction belongs to
    const monthIndex = (transactionDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       transactionDate.getMonth() - startDate.getMonth();
    
    if (monthIndex >= 0 && monthIndex < months) {
      if (transaction.type === 'expense') {
        expenseData[monthIndex] += Math.abs(transaction.amount);
      } else {
        incomeData[monthIndex] += transaction.amount;
      }
    }
  });

  return {
    labels,
    datasets: [
      {
        data: incomeData,
        color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
        barPercentage: 0.5,
      },
      {
        data: expenseData,
        color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
        barPercentage: 0.5,
      }
    ],
    legend: ['Income', 'Expenses'],
  };
};

/**
 * Creates configuration for a horizontal bar chart showing top spending categories
 * @param {Array} transactions - Transactions array
 * @param {number} limit - Number of categories to include
 * @param {string} currency - Currency code
 * @returns {Object} Bar chart configuration
 */
export const createTopCategoriesBarChartConfig = (transactions, limit = 5, currency) => {
  // Group expenses by category
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, transaction) => {
      const { category, amount } = transaction;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Math.abs(amount);
      return acc;
    }, {});

  // Convert to array and sort by amount (descending)
  const categoriesArray = Object.entries(expensesByCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);

  const colors = generateChartColors(categoriesArray.length, 0.8);

  return {
    labels: categoriesArray.map(c => c.name),
    datasets: [
      {
        data: categoriesArray.map(c => c.amount),
        colors: colors,
      }
    ],
  };
};

/**
 * Creates configuration for a breakdown of daily spending within a month
 * @param {Array} transactions - Transactions array
 * @param {Date} month - The month to analyze (defaults to current month)
 * @param {string} currency - Currency code
 * @returns {Object} Daily spending chart configuration
 */
export const createDailySpendingChartConfig = (transactions, month = new Date(), currency) => {
  // Get the first and last day of the specified month
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Initialize data array with zeros for each day
  const dailyData = Array(daysInMonth).fill(0);
  const labels = Array(daysInMonth).fill().map((_, i) => i + 1);
  
  // Fill with actual transaction data
  transactions
    .filter(t => t.type === 'expense')
    .forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      
      // Only include transactions from the specified month
      if (transactionDate.getMonth() === month.getMonth() && 
          transactionDate.getFullYear() === month.getFullYear()) {
        const day = transactionDate.getDate() - 1; // Adjust for 0-indexed array
        dailyData[day] += Math.abs(transaction.amount);
      }
    });
  
  return {
    labels,
    datasets: [
      {
        data: dailyData,
        color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
        strokeWidth: 2,
      }
    ],
  };
};

/**
 * Creates a savings progress chart configuration
 * @param {number} savedAmount - Current saved amount
 * @param {number} targetAmount - Savings goal amount
 * @param {string} currency - Currency code
 * @returns {Object} Progress chart configuration
 */
export const createSavingsProgressConfig = (savedAmount, targetAmount, currency) => {
  const percentage = Math.min(100, (savedAmount / targetAmount) * 100);
  
  return {
    data: [percentage],
    color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    labels: [`${percentage.toFixed(1)}%`],
    formatters: {
      progress: (value) => formatCurrency(savedAmount, currency),
      target: () => formatCurrency(targetAmount, currency)
    }
  };
};

/**
 * Creates a budget vs actual spending chart configuration
 * @param {number} budget - Monthly budget amount
 * @param {number} spent - Actual amount spent
 * @param {string} currency - Currency code
 * @returns {Object} Budget comparison chart configuration
 */
export const createBudgetComparisonConfig = (budget, spent, currency) => {
  const remaining = Math.max(0, budget - spent);
  const overspent = spent > budget ? spent - budget : 0;
  
  return {
    data: [
      {
        name: 'Spent',
        amount: spent,
        color: '#FF6384',
      },
      {
        name: 'Remaining',
        amount: remaining,
        color: overspent ? '#E0E0E0' : '#36A2EB',
      },
      {
        name: 'Overspent',
        amount: overspent,
        color: '#FF9F40',
      }
    ],
    formatters: {
      amount: (value) => formatCurrency(value, currency),
    },
    budget: formatCurrency(budget, currency)
  };
}; 