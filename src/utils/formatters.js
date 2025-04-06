/**
 * Utility functions for formatting data
 */

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: INR)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format a date as a short date string
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string (e.g., "Jan 15, 2023")
 */
export const formatShortDate = (dateInput) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format a date as a long date string with time
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string (e.g., "January 15, 2023, 3:30 PM")
 */
export const formatLongDate = (dateInput) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a percentage value
 * @param {number} value - The percentage value (0-100)
 * @param {number} fractionDigits - Number of fraction digits to show
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, fractionDigits = 1) => {
  return `${value.toFixed(fractionDigits)}%`;
}; 