const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.sourceExts.push('mjs');

config.resolver.assetExts.push('glb', 'gltf', 'ogg', 'mp3', 'wav', 'm4a');

// Force all 'three' imports to resolve to the same package
// This prevents "Multiple instances of Three.js being imported" error
const threePackagePath = path.resolve(__dirname, 'node_modules/three');
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'three': threePackagePath,
};

const zustandPackagePath = path.resolve(__dirname, 'node_modules/zustand');

// expo-router's nested node_modules contains its own copy of
// @react-navigation/native (7.2.2) while the root has 7.2.3. Each copy
// has its own LinkingContext React Context instance — expo-router wires
// up the provider on its nested copy, but the root copy (used by
// app/_layout.tsx and re-exported through @react-navigation/native-stack
// at the top level) sees no provider and throws
// "Couldn't find a LinkingContext context". Force every consumer to the
// root copy so all providers and consumers share one Context identity.
const reactNavNativePath = path.resolve(__dirname, 'node_modules/@react-navigation/native');

// Also ensure nested node_modules resolve to root three
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three' || moduleName.startsWith('three/')) {
    if (moduleName === 'three') {
      return {
        filePath: path.resolve(threePackagePath, 'build/three.module.js'),
        type: 'sourceFile',
      };
    }
    const subPath = moduleName.replace('three/', '');
    // Don't append .js if the import already has an extension
    const hasExt = /\.\w+$/.test(subPath);
    return {
      filePath: path.resolve(threePackagePath, subPath + (hasExt ? '' : '.js')),
      type: 'sourceFile',
    };
  }

  // For web, force zustand to resolve to its CJS build. Zustand 5 ships an
  // exports map that picks up the `react-native` condition on iOS/Android
  // (which points at CJS), but on web Metro resolves through the `import`
  // condition and pulls in `./esm/*.mjs`. Those ESM files contain
  // `import.meta.env.MODE` (Vite-style env detection), which Metro emits
  // verbatim into the chunk and then loads as a non-module <script>,
  // crashing with `Cannot use 'import.meta' outside a module`.
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const subPath = moduleName === 'zustand' ? 'index' : moduleName.replace('zustand/', '');
    const hasExt = /\.\w+$/.test(subPath);
    return {
      filePath: path.resolve(zustandPackagePath, subPath + (hasExt ? '' : '.js')),
      type: 'sourceFile',
    };
  }

  // Force every @react-navigation/native import (root or nested) to the
  // root copy, so the LinkingContext / NavigationContainer React Context
  // identities are shared between the provider (set up by expo-router) and
  // the consumers (NativeStackView et al). The exports map only declares
  // the "." entry pointing at lib/module/index.js, so we resolve that
  // directly; sub-path imports map onto lib/module/<sub>.js.
  if (moduleName === '@react-navigation/native' || moduleName.startsWith('@react-navigation/native/')) {
    if (moduleName === '@react-navigation/native') {
      return {
        filePath: path.resolve(reactNavNativePath, 'lib/module/index.js'),
        type: 'sourceFile',
      };
    }
    const subPath = moduleName.replace('@react-navigation/native/', '');
    const hasExt = /\.\w+$/.test(subPath);
    return {
      filePath: path.resolve(reactNavNativePath, 'lib/module', subPath + (hasExt ? '' : '.js')),
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
