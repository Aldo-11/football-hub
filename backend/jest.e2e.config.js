// Pruebas e2e: requieren una MongoDB real en MONGO_URI (en CI, contenedor "mongo").
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/e2e/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setupEnv.js']
};
