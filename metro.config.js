// Configuración de Metro (el empaquetador de Expo).
// Metro no debe mirar dentro de .claude/: ahí hay copias de trabajo de otras sesiones
// con su node_modules enlazado, y recorrerlas lo deja sin memoria.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const carpetaClaude = path.join(__dirname, '.claude').replace(/[\\/]/g, '[\\\\/]');
const anterior = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(anterior) ? anterior : anterior ? [anterior] : []),
  new RegExp(`^${carpetaClaude.replace(/[.*+?^${}()|]/g, '\\$&')}[\\\\/].*`),
];

module.exports = config;
