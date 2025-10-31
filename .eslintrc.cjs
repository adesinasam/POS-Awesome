module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-essential',
    'plugin:vuetify/base'
  ],
  plugins: ['vue', 'vuetify'],
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
};
