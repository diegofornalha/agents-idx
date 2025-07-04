const tseslint = require('typescript-eslint');
const tsParser = require('@typescript-eslint/parser');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
    },
  },
);
