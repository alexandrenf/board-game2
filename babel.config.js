module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // ⚠️ react-native-reanimated/plugin must remain the last entry in this array.
    plugins: ['react-native-reanimated/plugin'],
  };
};
