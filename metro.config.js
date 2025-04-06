const { getDefaultConfig } = require('expo/metro-config');
const nodeLibs = require('node-libs-react-native');
const path = require('path');
const defaultConfig = getDefaultConfig(__dirname);

// Add Node.js polyfills
defaultConfig.resolver.extraNodeModules = {
  ...nodeLibs,
  // Optional overrides for specific modules if needed
  assert: require.resolve('assert'),
  buffer: require.resolve('buffer'),
  events: require.resolve('events'),
  process: require.resolve('process'),
  stream: require.resolve('stream-browserify'),
  path: require.resolve('path-browserify'),
  // Add our custom polyfill for internal/util/comparisons
  './internal/util/comparisons': path.resolve(__dirname, 'src/polyfills/comparisons.js'),
  'internal/util/comparisons': path.resolve(__dirname, 'src/polyfills/comparisons.js'),
};

// Add resolver for assert's internal dependencies
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle the problematic assert internal path
  if (moduleName === './internal/util/comparisons' || 
      moduleName === 'internal/util/comparisons') {
    return {
      filePath: path.resolve(__dirname, 'src/polyfills/comparisons.js'),
      type: 'sourceFile',
    };
  }
  
  // Let the default resolver handle everything else
  return context.resolveRequest(context, moduleName, platform);
};

// Ensure the Metro bundler can handle these modules
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = defaultConfig; 