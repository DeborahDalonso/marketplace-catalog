import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
    { ignores: ['node_modules/', 'coverage/'] },
    js.configs.recommended,
    prettier,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            'no-console': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
        },
    },
    {
        files: ['tests/**/*.js', 'jest.config.js'],
        languageOptions: { globals: { ...globals.node, ...globals.jest } },
        // o aviso de "MySQL fora, testes pulados" precisa aparecer no terminal do Jest
        rules: { 'no-console': 'off' },
    },
];
