import { defineConfig } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'

export default defineConfig([
  { ignores: ['dist'] },
  { files: ['**/*.{js,mjs,cjs}'] },
  { files: ['**/*.{js,mjs,cjs}'], languageOptions: { globals: globals.browser } },
  { files: ['**/*.{js,mjs,cjs}'], plugins: { js }, extends: ['js/recommended'] },
  { rules: { 'no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^_' }] } }
])
