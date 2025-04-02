import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json", // Ensure ESLint uses the correct TypeScript config
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      js,
      react: pluginReact,
      "@typescript-eslint": tseslint.plugin, // Correct plugin reference
    },
    extends: [
      "eslint:recommended", // Corrected reference
      "plugin:react/recommended",
      "plugin:@typescript-eslint/recommended",
    ],
    rules: {
      "react/react-in-jsx-scope": "off", // Example: Disable rule for Next.js
      "@typescript-eslint/no-unused-vars": ["warn"], // Customize rules
    },
  },
]);
