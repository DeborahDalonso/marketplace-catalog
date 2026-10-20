export default {
    testEnvironment: 'node',
    transform: {},
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.js'],
    // os testes de integração dividem o schema marketplace_catalog_test; em paralelo eles se atropelam
    maxWorkers: 1,
    testTimeout: 15000,
};
