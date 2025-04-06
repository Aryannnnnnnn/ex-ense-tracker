module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          'assert': 'assert',
          'buffer': 'buffer',
          'events': 'events',
          'process': 'process',
          'stream': 'stream-browserify',
          'path': 'path-browserify',
        },
      }],
    ]
  };
}; 