const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @synthpass/core is installed from ../shared so metro has to watch it
config.watchFolders = [path.resolve(__dirname, '..', 'shared')];

module.exports = config;
