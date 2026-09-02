const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    blockList: /.*[/\\]mobile[/\\]node_modules[/\\](react|react-native)[/\\].*/,
    nodeModulesPaths: [
      path.resolve(root, 'node_modules'),
      path.resolve(__dirname, 'node_modules'),
    ],
    extraNodeModules: {
      'react': path.resolve(root, 'node_modules/react'),
      'react-native': path.resolve(root, 'node_modules/react-native'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
