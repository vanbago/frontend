import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier' // <-- L'import de Prettier

const commonRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  'no-unused-vars': 'off', 
  '@typescript-eslint/no-unused-vars': ['error', { 
    varsIgnorePattern: '^_',
    argsIgnorePattern: '^_',
    caughtErrors: 'none',
  }],
};

export default [
  js.configs.recommended,
  
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.app.json',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...commonRules,
    },
  },

  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        project: './tsconfig.app.json',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      vue: vuePlugin,
    },
    rules: {
      ...vuePlugin.configs['flat/recommended'].rules,
      ...commonRules,
    },
  },

  // --- L'ARBITRE DE LA PAIX ---
  // Doit TOUJOURS être le dernier élément du tableau
  eslintConfigPrettier,
]