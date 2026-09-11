const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle the pre-built bible.db, and expo-sqlite's web wasm
// worker, as binary assets.
config.resolver.assetExts.push('db', 'wasm');

// 영적기록ON(Next.js)은 이 번들에 들어갈 것이 아니다. 메트로가 그 안의
// node_modules 까지 훑으면 느려지고, 같은 이름의 react 가 둘이 되면 꼬인다.
config.resolver.blockList = [/spiritual-log-on\/.*/];

module.exports = config;
