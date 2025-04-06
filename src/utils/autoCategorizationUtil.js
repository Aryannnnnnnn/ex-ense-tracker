/**
 * Automatic Transaction Categorization Utility
 * 
 * This utility helps automatically categorize transactions based on keywords
 * in the transaction description. It uses a predefined set of rules and keywords
 * associated with common expense categories.
 */

// Category definitions with keywords
const CATEGORY_DEFINITIONS = {
  food: {
    name: 'Food & Dining',
    keywords: [
      'restaurant', 'cafe', 'coffee', 'diner', 'bistro', 'food', 'meal',
      'grocery', 'supermarket', 'market', 'bakery', 'pizzeria', 'burger',
      'mcdonald', 'starbuck', 'subway', 'donut', 'pizza', 'taco',
      'wendy', 'chipotle', 'kfc', 'buffet', 'deli', 'steakhouse',
    ],
  },
  transport: {
    name: 'Transportation',
    keywords: [
      'gas', 'fuel', 'petrol', 'uber', 'lyft', 'taxi', 'cab', 'bus',
      'train', 'subway', 'metro', 'transport', 'transit', 'airline',
      'flight', 'car rental', 'parking', 'toll', 'mechanic', 'oil change',
      'bike', 'scooter', 'ebike', 'escooter',
    ],
  },
  shopping: {
    name: 'Shopping',
    keywords: [
      'amazon', 'walmart', 'target', 'bestbuy', 'store', 'mall', 'shop',
      'clothing', 'apparel', 'fashion', 'dress', 'shoe', 'accessory',
      'jewelry', 'electronic', 'computer', 'phone', 'appliance', 'ebay',
      'etsy', 'retail', 'outlet', 'ecommerce', 'online store',
    ],
  },
  entertainment: {
    name: 'Entertainment',
    keywords: [
      'movie', 'theater', 'cinema', 'concert', 'festival', 'show',
      'ticket', 'netflix', 'spotify', 'disney+', 'hulu', 'hbo',
      'apple tv', 'game', 'playstation', 'xbox', 'nintendo',
      'event', 'tour', 'amusement', 'park', 'streaming',
    ],
  },
  housing: {
    name: 'Housing',
    keywords: [
      'rent', 'mortgage', 'lease', 'apartment', 'condo', 'house',
      'property', 'real estate', 'home', 'maintenance', 'repair',
      'improvement', 'furniture', 'decor', 'appliance', 'security',
      'landscaping', 'lawn', 'garden', 'cleaning', 'homeowner',
    ],
  },
  utilities: {
    name: 'Utilities',
    keywords: [
      'electric', 'water', 'gas', 'power', 'utility', 'bill', 'energy',
      'internet', 'wifi', 'broadband', 'cable', 'phone', 'mobile',
      'cellular', 'service', 'provider', 'waste', 'garbage', 'sewage', 
      'subscription', 'internet service',
    ],
  },
  healthcare: {
    name: 'Healthcare',
    keywords: [
      'doctor', 'medical', 'health', 'hospital', 'clinic', 'pharmacy',
      'prescription', 'medicine', 'dental', 'dentist', 'vision', 'optometrist',
      'therapy', 'healthcare', 'insurance', 'emergency', 'ambulance',
      'vitamin', 'supplement', 'wellness', 'fitness',
    ],
  },
  education: {
    name: 'Education',
    keywords: [
      'tuition', 'school', 'college', 'university', 'education', 'course',
      'class', 'workshop', 'textbook', 'book', 'tutorial', 'training',
      'seminar', 'degree', 'certification', 'student', 'learning', 'study',
      'scholarship', 'loan', 'academic', 'educational',
    ],
  },
  personal: {
    name: 'Personal Care',
    keywords: [
      'salon', 'spa', 'haircut', 'barber', 'beauty', 'cosmetic', 'makeup',
      'skincare', 'nail', 'grooming', 'massage', 'personal care', 'hygiene',
      'gym', 'fitness', 'wellness', 'trainer', 'workout', 'exercise',
    ],
  },
  income: {
    name: 'Income',
    keywords: [
      'salary', 'paycheck', 'deposit', 'wage', 'payment', 'revenue',
      'direct deposit', 'income', 'commission', 'bonus', 'refund',
      'return', 'reimbursement', 'dividend', 'interest', 'cashback',
    ],
  },
  transfer: {
    name: 'Transfer',
    keywords: [
      'transfer', 'wire', 'withdrawal', 'atm', 'zelle', 'venmo',
      'paypal', 'cash app', 'deposit', 'withdraw', 'move money',
      'bank transfer', 'funds', 'cashout', 'ach', 'direct deposit',
    ],
  },
  savings: {
    name: 'Savings',
    keywords: [
      'savings', 'investment', 'ira', '401k', 'retirement', 'stock',
      'bond', 'fund', 'etf', 'mutual fund', 'brokerage', 'portfolio',
      'deposit', 'save', 'emergency fund', 'reserve', 'financial goal', 
    ],
  },
  other: {
    name: 'Other',
    keywords: [
      'other', 'miscellaneous', 'misc', 'unknown', 'general',
    ],
  },
};

/**
 * Automatically categorizes a transaction based on its description
 * @param {string} description - The transaction description/memo
 * @param {number} amount - The transaction amount
 * @param {boolean} isIncome - Whether the transaction is income or expense
 * @returns {string} The category ID for the transaction
 */
export const categorizeTransaction = (description, amount, isIncome = false) => {
  if (!description) return 'other';
  
  // Default to income category for income transactions
  if (isIncome) return 'income';
  
  const normalizedDescription = description.toLowerCase();
  
  // Skip categorization for transfers
  for (const keyword of CATEGORY_DEFINITIONS.transfer.keywords) {
    if (normalizedDescription.includes(keyword.toLowerCase())) {
      return 'transfer';
    }
  }
  
  // Search through all categories (except income and transfer) for matching keywords
  let bestMatch = null;
  let bestMatchScore = 0;
  
  for (const [categoryId, categoryData] of Object.entries(CATEGORY_DEFINITIONS)) {
    // Skip income and transfer for expense categorization
    if (categoryId === 'income' || categoryId === 'transfer') continue;
    
    let score = 0;
    
    // Check each keyword in the category
    for (const keyword of categoryData.keywords) {
      if (normalizedDescription.includes(keyword.toLowerCase())) {
        // Increase score based on the specificity of the match
        // Longer keywords are usually more specific
        score += keyword.length;
      }
    }
    
    // Update best match if this category has a higher score
    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestMatch = categoryId;
    }
  }
  
  // If no match found, default to 'other'
  return bestMatch || 'other';
};

/**
 * Suggests categories based on a partial description
 * Useful for autocomplete or suggestions when user is typing
 * @param {string} partialDescription - The partial transaction description
 * @returns {Array} Array of suggested categories with scores
 */
export const suggestCategories = (partialDescription) => {
  if (!partialDescription) return [];
  
  const normalizedDescription = partialDescription.toLowerCase();
  const suggestions = [];
  
  for (const [categoryId, categoryData] of Object.entries(CATEGORY_DEFINITIONS)) {
    let score = 0;
    let matchingKeywords = [];
    
    // Check each keyword in the category
    for (const keyword of categoryData.keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (normalizedDescription.includes(normalizedKeyword) || 
          normalizedKeyword.includes(normalizedDescription)) {
        score += keyword.length;
        matchingKeywords.push(keyword);
      }
    }
    
    if (score > 0) {
      suggestions.push({
        categoryId,
        name: categoryData.name,
        score,
        matchingKeywords,
      });
    }
  }
  
  // Sort by score (descending)
  return suggestions.sort((a, b) => b.score - a.score);
};

/**
 * Get category info by ID
 * @param {string} categoryId - The category ID
 * @returns {Object} Category information (name, keywords)
 */
export const getCategoryInfo = (categoryId) => {
  return CATEGORY_DEFINITIONS[categoryId] || CATEGORY_DEFINITIONS.other;
};

/**
 * Get all available categories
 * @returns {Array} Array of category objects with id and name
 */
export const getAllCategories = () => {
  return Object.entries(CATEGORY_DEFINITIONS).map(([id, data]) => ({
    id,
    name: data.name,
  }));
};

export default {
  categorizeTransaction,
  suggestCategories,
  getCategoryInfo,
  getAllCategories,
}; 