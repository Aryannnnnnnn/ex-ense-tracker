// Import node-libs-react-native first
import nodeLibs from 'node-libs-react-native/globals';

// Fix missing internal/util/comparisons for assert
if (typeof global._compareHelper === 'undefined') {
  global._compareHelper = {
    // Basic implementation of comparison functions needed by assert
    isDeepEqual: function(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    },
    isDeepStrictEqual: function(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
  };
}

// Override any specific polyfills as needed
global.Buffer = require('buffer').Buffer;
global.process = require('process');

// Patch assert to avoid internal/util/comparisons dependency
const originalRequire = global.require;
if (originalRequire) {
  global.require = function(id) {
    if (id === './internal/util/comparisons' || id === 'internal/util/comparisons') {
      return global._compareHelper;
    }
    return originalRequire(id);
  };
}

// Make sure the 'process' polyfill has a 'nextTick' method
if (typeof process.nextTick !== 'function') {
  process.nextTick = function(callback) {
    setTimeout(callback, 0);
  };
}

// Add any missing polyfills
if (!global.setImmediate) {
  global.setImmediate = setTimeout;
}
if (!global.clearImmediate) {
  global.clearImmediate = clearTimeout;
}

// Fix URL if needed
if (typeof global.URL !== 'function') {
  global.URL = require('url-parse');
} 