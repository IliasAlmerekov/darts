// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/*.config.ts", "**/*.config.js", "**/*.config.mjs"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase", "PascalCase", "UPPER_CASE", "snake_case"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
          filter: {
            regex: "^(Content-Type|[a-z]+(-[a-z]+)+)$",
            match: false,
          },
        },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE", "snake_case"],
        },
        {
          selector: "property",
          format: null,
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: {
            regex: "^I[A-Z]",
            match: false,
          },
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],
      "react/react-in-jsx-scope": "off",
    },
    settings: {
      react: {
        version: "detect",
        runtime: "automatic",
      },
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    ignores: ["src/shared/types/game.ts", "src/shared/types/player.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/entities/*", "@/features/*", "@/app/*"],
        },
      ],
    },
  },
  {
    files: ["src/entities/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/features/*", "@/app/*"],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/features/*/*"],
        },
      ],
    },
  },
];
