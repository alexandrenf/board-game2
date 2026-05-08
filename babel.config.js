module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // To re-enable the React Compiler experiment:
    //   1. bun add -d babel-plugin-react-compiler
    //   2. Add 'babel-plugin-react-compiler' to the plugins array BEFORE
    //      'react-native-reanimated/plugin' (reanimated must stay last).
    //   3. Restore "reactCompiler": true under experiments in app.json.
    // The experiment was previously enabled in app.json without this plugin,
    // which made the flag a no-op; removed for now (D2 audit fix).
    //
    // react-native-reanimated/plugin must remain the last entry in this array.
    plugins: ['react-native-reanimated/plugin'],
  };
};
