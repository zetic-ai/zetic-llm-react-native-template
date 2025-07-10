const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
    resolver: {
        alias: {
            'react-native-zetic-mlange': require.resolve('react-native-zetic-mlange'),
        }
    }
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
