import globals from "globals";
import pluginJs from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import pluginVuetify from "eslint-plugin-vuetify";
import vueParser from "vue-eslint-parser";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,vue}"],
    languageOptions: {
      parser: vueParser,
      parserOptions: { ecmaVersion: 2020, sourceType: "module" },
      globals: globals.browser,
    },
    plugins: {
      vue: pluginVue,
      vuetify: pluginVuetify,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginVue.configs["flat/essential"].find((c) => c.rules)?.rules,
      ...pluginVuetify.configs["flat/base"][0].rules,
    },
  },
  {
    files: ["**/*.vue"],
    processor: pluginVue.processors[".vue"],
  },
];
