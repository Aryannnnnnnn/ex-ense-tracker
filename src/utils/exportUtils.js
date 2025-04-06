/**
 * Export Utilities for Expense Tracker
 * 
 * This utility helps with exporting transaction data to various formats 
 * such as CSV, PDF, and JSON for backup purposes.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { formatCurrency, formatLongDate } from './formatters';

/**
 * Convert transactions to CSV format
 * @param {Array} transactions - The transactions to convert
 * @param {string} currency - Currency code for formatting
 * @returns {string} CSV string
 */
export const transactionsToCSV = (transactions, currency = 'USD') => {
  if (!transactions || transactions.length === 0) {
    return 'No transactions found';
  }

  // Define headers
  const headers = [
    'Date',
    'Description',
    'Category',
    'Type',
    'Amount',
    'Notes'
  ];

  // Create CSV header row
  let csv = headers.join(',') + '\n';

  // Add transaction rows
  transactions.forEach(transaction => {
    const row = [
      formatDate(transaction.date),
      escapeCsvField(transaction.description || ''),
      escapeCsvField(transaction.category || ''),
      transaction.type || 'expense',
      transaction.amount,
      escapeCsvField(transaction.notes || '')
    ];
    
    csv += row.join(',') + '\n';
  });

  return csv;
};

/**
 * Format a date for CSV export (YYYY-MM-DD)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Escape special characters in a CSV field
 * @param {string} field - The field value
 * @returns {string} Escaped field value
 */
const escapeCsvField = (field) => {
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  if (/[",\n\r]/.test(field)) {
    // Replace any double quotes with two double quotes
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

/**
 * Generate a filename for export with date
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension (without dot)
 * @returns {string} Generated filename
 */
export const generateExportFilename = (prefix, extension) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = `${year}${month}${day}_${date.getHours()}${date.getMinutes()}`;
  
  return `${prefix}_${timestamp}.${extension}`;
};

/**
 * Export transactions to a CSV file and share it
 * @param {Array} transactions - The transactions to export
 * @param {string} currency - Currency code
 * @returns {Promise} Promise that resolves when the export is complete
 */
export const exportTransactionsToCSV = async (transactions, currency = 'USD') => {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    // Convert to CSV
    const csv = transactionsToCSV(transactions, currency);
    
    // Generate filename
    const filename = generateExportFilename('expenses', 'csv');
    
    // Write to temporary file
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, csv);
    
    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Transactions',
      UTI: 'public.comma-separated-values-text'
    });
    
    return true;
  } catch (error) {
    console.error('Export to CSV failed:', error);
    throw error;
  }
};

/**
 * Convert transactions to JSON format
 * @param {Array} transactions - The transactions to convert
 * @returns {string} JSON string
 */
export const transactionsToJSON = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return JSON.stringify({ transactions: [] });
  }
  
  return JSON.stringify({ transactions }, null, 2);
};

/**
 * Export transactions to a JSON file and share it
 * @param {Array} transactions - The transactions to export
 * @returns {Promise} Promise that resolves when the export is complete
 */
export const exportTransactionsToJSON = async (transactions) => {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    // Convert to JSON
    const json = transactionsToJSON(transactions);
    
    // Generate filename
    const filename = generateExportFilename('expenses', 'json');
    
    // Write to temporary file
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, json);
    
    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Transactions',
      UTI: 'public.json'
    });
    
    return true;
  } catch (error) {
    console.error('Export to JSON failed:', error);
    throw error;
  }
};

/**
 * Generate HTML for a transactions report
 * @param {Array} transactions - The transactions to include
 * @param {string} currency - Currency code
 * @param {Object} options - Report options
 * @returns {string} HTML content
 */
export const generateTransactionsReportHTML = (
  transactions, 
  currency = 'USD',
  options = {}
) => {
  if (!transactions || transactions.length === 0) {
    return '<p>No transactions found</p>';
  }
  
  const {
    title = 'Transaction Report',
    subtitle = `Generated on ${formatLongDate(new Date())}`,
    groupByCategory = false,
    includeChart = true,
  } = options;
  
  // Calculate summary
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
  const balance = totalIncome - totalExpenses;
  
  // Helper to format money in HTML
  const formatMoney = (amount) => {
    const formatted = formatCurrency(amount, currency);
    if (amount < 0) {
      return `<span style="color: #FF3B30;">${formatted}</span>`;
    } else if (amount > 0) {
      return `<span style="color: #4CD964;">${formatted}</span>`;
    }
    return formatted;
  };
  
  // Group transactions by category if requested
  let tableContent = '';
  
  if (groupByCategory) {
    // Group by category
    const categories = {};
    
    transactions.forEach(transaction => {
      const categoryKey = transaction.category || 'Uncategorized';
      if (!categories[categoryKey]) {
        categories[categoryKey] = [];
      }
      categories[categoryKey].push(transaction);
    });
    
    // Create tables for each category
    Object.entries(categories).forEach(([category, categoryTransactions]) => {
      const categoryTotal = categoryTransactions.reduce(
        (sum, t) => sum + t.amount, 0
      );
      
      tableContent += `
        <h3>${category} (${formatCurrency(categoryTotal, currency)})</h3>
        <table class="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      categoryTransactions.forEach(transaction => {
        tableContent += `
          <tr>
            <td>${formatLongDate(transaction.date)}</td>
            <td>${transaction.description || ''}</td>
            <td>${transaction.type || 'expense'}</td>
            <td>${formatMoney(transaction.amount)}</td>
          </tr>
        `;
      });
      
      tableContent += `
          </tbody>
        </table>
        <br>
      `;
    });
  } else {
    // Simple transaction list
    tableContent = `
      <table class="transactions-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    transactions.forEach(transaction => {
      tableContent += `
        <tr>
          <td>${formatLongDate(transaction.date)}</td>
          <td>${transaction.description || ''}</td>
          <td>${transaction.category || ''}</td>
          <td>${transaction.type || 'expense'}</td>
          <td>${formatMoney(transaction.amount)}</td>
        </tr>
      `;
    });
    
    tableContent += `
        </tbody>
      </table>
    `;
  }
  
  // Generate complete HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #4A90E2;
          margin-bottom: 5px;
        }
        h2 {
          color: #666;
          font-weight: normal;
          margin-top: 0;
          margin-bottom: 30px;
        }
        .summary-box {
          background-color: #F8F9FA;
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
        }
        .summary-item {
          text-align: center;
        }
        .summary-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 18px;
          font-weight: bold;
        }
        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .transactions-table th {
          background-color: #F8F9FA;
          text-align: left;
          padding: 10px;
          border-bottom: 2px solid #E5E9F2;
        }
        .transactions-table td {
          padding: 10px;
          border-bottom: 1px solid #E5E9F2;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
      
      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-label">Income</div>
          <div class="summary-value">${formatMoney(totalIncome)}</div>
        </div>
        
        <div class="summary-item">
          <div class="summary-label">Expenses</div>
          <div class="summary-value">${formatMoney(-totalExpenses)}</div>
        </div>
        
        <div class="summary-item">
          <div class="summary-label">Balance</div>
          <div class="summary-value">${formatMoney(balance)}</div>
        </div>
      </div>
      
      ${tableContent}
      
      <div class="footer">
        Generated by Expense Tracker App | ${new Date().toISOString().split('T')[0]}
      </div>
    </body>
    </html>
  `;
};

/**
 * Export transactions as a PDF report
 * @param {Array} transactions - The transactions to export
 * @param {string} currency - Currency code
 * @param {Object} options - Report options
 * @returns {Promise} Promise that resolves when the export is complete
 */
export const exportTransactionsToPDF = async (
  transactions,
  currency = 'USD',
  options = {}
) => {
  try {
    // Generate HTML content
    const html = generateTransactionsReportHTML(transactions, currency, options);
    
    // Generate PDF file
    const { uri } = await Print.printToFileAsync({ html });
    
    // Generate filename
    const filename = generateExportFilename('expenses_report', 'pdf');
    const destinationUri = `${FileSystem.cacheDirectory}${filename}`;
    
    // Copy file to cache with proper name
    await FileSystem.copyAsync({
      from: uri,
      to: destinationUri
    });
    
    // Share the file
    await Sharing.shareAsync(destinationUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Transactions Report',
      UTI: 'com.adobe.pdf'
    });
    
    return true;
  } catch (error) {
    console.error('Export to PDF failed:', error);
    throw error;
  }
};

export default {
  transactionsToCSV,
  transactionsToJSON,
  exportTransactionsToCSV,
  exportTransactionsToJSON,
  exportTransactionsToPDF,
  generateExportFilename,
  generateTransactionsReportHTML
}; 