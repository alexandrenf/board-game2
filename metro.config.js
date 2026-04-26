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

// Also ensure nested node_modules resolve to root three
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three' || moduleName.startsWith('three/')) {
    const threeSubpath = moduleName.replace(/^three\/?/, '');

    return {
      filePath: moduleName === 'three'
        ? path.resolve(threePackagePath, 'build/three.module.js')
        : path.resolve(
            threePackagePath,
            path.extname(threeSubpath) ? threeSubpath : `${threeSubpath}.js`
          ),
      type: 'sourceFile',
    };
  }
  // Fallback to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
