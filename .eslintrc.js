module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'no-throw-literal': 'error'
  },
  overrides: [
    // Server-specific rules
    {
      files: ['server/**/*.js'],
      env: {
        node: true,
        browser: false
      }
    },
    // Client-specific rules
    {
      files: ['client/**/*.{js,jsx}'],
      env: {
        browser: true,
        node: false
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      rules: {
        'react/prop-types': 'off'
      }
    },
    // Test files
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/*.test.jsx'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
