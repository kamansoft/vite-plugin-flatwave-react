import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      '**/dist/',
      '**/dist-ssr/',
      '**/coverage/',
      '**/test-build-output/',
      '**/test-e2e-output/',
      '**/*.config.js',
      '**/*.config.ts',
      '.husky/',
      '**/examples/*/dist/',
      '**/scripts/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json', './packages/*/tsconfig.json', './examples/*/tsconfig.json'],
      },
    },
    plugins: {
      prettier,
      react,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  }
);
