// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/game/**/*.tsx', 'src/components/game/DiceMenu.tsx'],
    rules: {
      // React Three Fiber uses Three.js-specific JSX props (args, position, etc.).
      // They are valid at runtime but look unknown to the standard React DOM lint rule.
      'react/no-unknown-property': 'off',
    },
  },
  {
    // eslint-plugin-import can't resolve TypeScript path aliases, causing false positives — tsc handles this already
    rules: {
      'import/namespace': 'off',
    },
  },
]);
