// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    ignores: ["commitlint.config.mjs", "dist/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
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
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
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
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/pages/*", "@/app/*", "../pages/*", "../app/*"],
        },
      ],
    },
  },
  {
    files: ["src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/pages/*", "../pages/*"],
              message: "Pages must not import from other pages. Use shared/ for cross-page code.",
            },
            {
              group: ["@/app/*", "../app/*"],
              message: "Pages must not import from app/. Move shared logic to shared/.",
            },
          ],
        },
      ],
    },
  },
  {
    // A later block replaces the rule options of the pages block above, so it repeats them.
    files: ["src/pages/**/*.tsx", "src/pages/**/use*.ts"],
    ignores: [
      // Tests run mappers as the real store does, so their expectations follow the mapper.
      "src/pages/**/*.test.{ts,tsx}",
      // Existing debt: this hook calls a mapper inside a useMemo.
      "src/pages/GameSummaryPage/useGameSummaryPage.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/pages/*", "../pages/*"],
              message: "Pages must not import from other pages. Use shared/ for cross-page code.",
            },
            {
              group: ["@/app/*", "../app/*"],
              message: "Pages must not import from app/. Move shared logic to shared/.",
            },
            {
              allowTypeImports: true,
              regex:
                "^@/(shared/lib|lib)/(game/(finishedGameStandings|gameStateNormalizer|mergeGameSettings|parseThrowValue|roundAverage)|player/(currentGame|profile))(\\.ts)?$",
              message:
                "Render-flow files must not call DTO mappers. Call them from an API function, queryFn, store action, route loader or page lib/ file (docs/convention/api.md, Mappers).",
            },
            {
              // These modules also hold UI-to-UI helpers (sortLobbyPlayers, getFinishedPlayers), so only
              // their DTO mappers are banned.
              regex: "^@/(shared/lib|lib)/game/(lobbyPlayers|player-mappers)(\\.ts)?$",
              importNames: ["toLobbyPlayers", "mapPlayersToUI"],
              message:
                "Render-flow files must not call DTO mappers. Call them from an API function, queryFn, store action, route loader or page lib/ file (docs/convention/api.md, Mappers).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/**/*.spec.ts"],
    ignores: ["tests/live/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@playwright/test",
              importNames: ["test", "expect"],
              message:
                "Mocked specs import { test, expect } from tests/shared/test.ts, which fails on unmocked /api requests.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^https?:\\/\\//]",
          message: "Navigate with paths relative to baseURL so PLAYWRIGHT_BASE_URL applies.",
        },
        {
          selector: "TemplateElement[value.raw=/^https?:\\/\\//]",
          message: "Navigate with paths relative to baseURL so PLAYWRIGHT_BASE_URL applies.",
        },
      ],
    },
  },
];
