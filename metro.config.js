const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle the pre-built bible.db, and expo-sqlite's web wasm
// worker, as binary assets.
config.resolver.assetExts.push('db', 'wasm');

module.exports = config;
