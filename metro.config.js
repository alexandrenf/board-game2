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

  // Force zustand to resolve to CJS builds to avoid import.meta.env
  // errors in Metro web bundles (ESM builds use Vite-specific import.meta.env)
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    const subPath = moduleName === 'zustand' ? '' : moduleName.replace('zustand/', '');
    const hasExt = /\.\w+$/.test(subPath);
    const resolved = hasExt ? subPath : (subPath ? subPath + '.js' : 'index.js');
    return {
      filePath: path.resolve(zustandPackagePath, resolved),
      type: 'sourceFile',
    };
  }

  // Fallback to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
