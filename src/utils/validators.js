/**
 * Utility functions for data validation
 */

/**
 * Check if an email is valid
 * @param {string} email - The email to validate
 * @returns {boolean} Whether the email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if a password meets minimum requirements
 * @param {string} password - The password to validate
 * @param {number} minLength - Minimum required length (default: 6)
 * @returns {boolean} Whether the password is valid
 */
export const isValidPassword = (password, minLength = 6) => {
  return typeof password === 'string' && password.length >= minLength;
};

/**
 * Check if a numeric input is valid
 * @param {string|number} value - The value to validate
 * @param {number} min - Minimum allowed value (default: 0)
 * @returns {boolean} Whether the value is a valid number above the minimum
 */
export const isValidNumber = (value, min = 0) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min;
};

/**
 * Check if a required field is filled
 * @param {string} value - The value to check
 * @returns {boolean} Whether the field has a value
 */
export const isRequiredField = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

/**
 * Validate a transaction form
 * @param {Object} transaction - The transaction object to validate
 * @returns {Object} Object with validation errors
 */
export const validateTransaction = (transaction) => {
  const errors = {};
  
  if (!isValidNumber(transaction.amount, 0.01)) {
    errors.amount = 'Please enter a valid amount greater than zero';
  }
  
  if (!isRequiredField(transaction.category)) {
    errors.category = 'Please select a category';
  }
  
  if (!transaction.type || !['income', 'expense'].includes(transaction.type)) {
    errors.type = 'Please select a valid transaction type';
  }
  
  // Add a check for description
  if (!isRequiredField(transaction.description)) {
    errors.description = 'Please enter a description';
  }
  
  return errors;
};

/**
 * Validate email with error message
 * @param {string} value - The email to validate
 * @returns {string} Empty string if valid, error message if invalid
 */
export const validateEmail = (value) => {
  if (!value) return 'Email is required';
  if (!isValidEmail(value)) return 'Please enter a valid email address';
  return '';
};

/**
 * Validate password with error message
 * @param {string} value - The password to validate
 * @returns {string} Empty string if valid, error message if invalid
 */
export const validatePassword = (value) => {
  if (!value) return 'Password is required';
  if (!isValidPassword(value)) return 'Password must be at least 6 characters';
  return '';
};

/**
 * Validate required field with custom label
 * @param {string} value - The value to validate
 * @param {string} fieldName - The name of the field for the error message
 * @returns {string} Empty string if valid, error message if invalid
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (!isRequiredField(value)) return `${fieldName} is required`;
  return '';
}; 