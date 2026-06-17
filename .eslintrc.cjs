const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-plugin-prettier');
const react = require('eslint-plugin-react');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/',
      '**/dist/',
      '**/*.config.js',
      '**/*.config.ts',
      '.husky/',
      '**/examples/*/dist/',
      '**/scripts/',
      '.agent/',
      '.claude/',
      '.codex/',
      '.cursor/',
      '.gemini/',
      '.kilocode/',
      '.opencode/',
      '.trae/',
      '.kilo/',
      'dev-notes/',
      'docs/',
      'e2e/',
      'openspec/',
      'current-working-project-with-features/',
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