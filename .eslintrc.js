module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  settings: {
    'import/resolver': { parcel: { rootDir: 'src' } }
  },
  extends: [
    'eslint:recommended',
    'plugin:cypress/recommended',
    'plugin:import/errors',
    'plugin:import/warnings'
  ],
  globals: {},
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: [],
  rules: {
    'import/no-unresolved': ['error', { ignore: ['^http'] }],
    'import/order': 'error'
  }
}
