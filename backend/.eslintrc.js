module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    '@typescript-eslint/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/prefer-namespace-keyword': 'off',
    
    // NestJS specific rules
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        accessibility: 'explicit',
        overrides: {
          accessors: 'explicit',
          constructors: 'no-public',
          methods: 'explicit',
          properties: 'off',
          parameterProperties: 'explicit',
        },
      },
    ],
    
    // General rules
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-constructor': 'error',
    
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Performance rules
    'no-await-in-loop': 'warn',
    'require-atomic-updates': 'error',
    
    // Code quality rules
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', 300],
    'max-lines-per-function': ['warn', 50],
    'max-params': ['warn', 4],
    
    // Import rules
    'sort-imports': [
      'error',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true,
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
        'max-lines-per-function': 'off',
        'complexity': 'off',
      },
    },
    {
      files: ['prisma/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-lines': 'off',
      },
    },
  ],
};
