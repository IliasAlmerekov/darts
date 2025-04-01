import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default defineConfig([
  { files: ["**/*.{js, mjs,cjs,ts,jsx,tsx}"] },
  { ignores: ["build/**"] },
  {
    files: ["**/*.{js, mjs,cjs,ts,jsx,tsx}"],
    languageOptions: { globals: globals.browser, parser: tseslint.parser },
  },
  {
    files: ["**/*.{js, mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      js,
      react: pluginReact,
      "typescript-eslint": tseslint,
    },
    extends: ["js/recommended"],
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
]);
