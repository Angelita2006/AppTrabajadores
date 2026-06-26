const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Busca la raíz del monorrepositorio (la carpeta principal AppTrabajadores)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Vigilar todos los archivos del monorrepositorio
config.watchFolders = [workspaceRoot];

// 2. Forzar a Metro a buscar primero en los node_modules locales y luego en la raíz global
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
