/**
 * @returns {Promise<import('jest').Config>}
 */
const path = require('path');

module.exports = {
  collectCoverageFrom: [
    '**/src/**/*.component.tsx',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/src/**/*.test.*',
    '!**/src/declarations.d.ts',
    '!**/e2e/**',
  ],
  transform: {
    '^.+\\.[jt]sx?$': ['@swc/jest'],
  },
  transformIgnorePatterns: ['/node_modules/(?!@openmrs|.+\\.pnp\\.[^\\/]+$)'],
  moduleNameMapper: {
    '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
    '\\.(s?css)$': 'identity-obj-proxy',
    '^lodash-es/(.*)$': 'lodash/$1',
    'lodash-es': 'lodash',
    '^dexie$': require.resolve('dexie'),
    '^dayjs$': require.resolve('dayjs'),
    // `temporal-polyfill/global` (pulled in by @carbon/react's date picker) has
    // no `require` condition in its exports map, so jest resolves the ESM build
    // and dies on the `export` statement. Map the CJS build directly.
    '^temporal-polyfill/global$': path.join(path.dirname(require.resolve('temporal-polyfill')), 'global.js'),
  },
  setupFilesAfterEnv: [path.resolve(__dirname, 'tools', 'setup-tests.ts')],
  testPathIgnorePatterns: [path.resolve(__dirname, 'e2e')],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
};
