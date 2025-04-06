// Simple implementation of the Node.js internal/util/comparisons module
// This is used by the assert module

'use strict';

// Basic deep equality implementation
function isDeepEqual(val1, val2) {
  if (val1 === val2) return true;
  if (val1 == null || val2 == null) return false;
  if (typeof val1 !== 'object' && typeof val2 !== 'object') return val1 === val2;

  // Handle arrays
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false;
    for (let i = 0; i < val1.length; i++) {
      if (!isDeepEqual(val1[i], val2[i])) return false;
    }
    return true;
  }

  // Handle objects
  if (typeof val1 === 'object' && typeof val2 === 'object') {
    const keys1 = Object.keys(val1);
    const keys2 = Object.keys(val2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!isDeepEqual(val1[key], val2[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

// Re-export the functions that assert uses
module.exports = {
  isDeepEqual,
  isDeepStrictEqual: isDeepEqual, // For simplicity, use the same implementation
}; 