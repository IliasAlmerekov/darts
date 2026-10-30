import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const GLOBAL_IGNORES = ["commitlint.config.mjs", "dist/**"];
const TS_FILES = ["**/*.ts", "**/*.tsx"];
const SHARED_FILES = ["src/shared/**/*.{ts,tsx}"];

type FlatConfigItem = {
  files?: string[];
  ignores?: string[];
  languageOptions?: {
    parserOptions?: {
      project?: string | string[];
    };
  };
};

let flatConfig: FlatConfigItem[] = [];

const hasFiles = (
  value: FlatConfigItem | undefined,
  files: string[],
): value is FlatConfigItem & { files: string[] } => {
  if (!value || !Array.isArray(value.files)) {
    return false;
  }

  const valueFiles = value.files;

  return valueFiles.length === files.length && files.every((file) => valueFiles.includes(file));
};

describe("eslint flat config global ignores", () => {
  beforeAll(async () => {
    const configModule = await import("../../../eslint.config.mjs");
    flatConfig = configModule.default as FlatConfigItem[];
  }, 30_000);

  it("keeps global ignores in the first standalone config item", () => {
    const firstConfig = flatConfig[0];

    expect(firstConfig).toBeDefined();
    if (!firstConfig) {
      throw new Error("Expected first config item to be defined.");
    }

    expect(firstConfig.ignores).toHaveLength(GLOBAL_IGNORES.length);
    expect(firstConfig.ignores).toEqual(expect.arrayContaining(GLOBAL_IGNORES));
  });

  it("does not define global ignore patterns in the TypeScript config block", () => {
    const tsConfig = flatConfig.find((item) => hasFiles(item, TS_FILES));

    expect(tsConfig).toBeDefined();
    expect(tsConfig?.ignores?.some((ignore) => GLOBAL_IGNORES.includes(ignore)) ?? false).toBe(
      false,
    );
  });

  it("uses the eslint tsconfig so staged test files can be linted", () => {
    const tsConfig = flatConfig.find((item) => hasFiles(item, TS_FILES));

    expect(tsConfig).toBeDefined();
    expect(tsConfig?.languageOptions?.parserOptions?.project).toBe("./tsconfig.eslint.json");
  });

  it("keeps the shared override at full scope, with no ignores", () => {
    const sharedOverride = flatConfig.find((item) => hasFiles(item, SHARED_FILES));

    expect(sharedOverride).toBeDefined();
    if (!sharedOverride) {
      throw new Error("Expected shared override config item to be defined.");
    }

    expect(sharedOverride.ignores).toBeUndefined();
  });
});

describe("shared lib import aliases", () => {
  const eslint = new ESLint({
    overrideConfig: { languageOptions: { parserOptions: { project: null } } },
  });

  it.each([
    "src/index.tsx",
    "src/app/App.tsx",
    "src/shared/lib/guards/guards.ts",
    "src/pages/StartPage/startPageLoader.ts",
    "src/pages/StartPage/useIsCurrentGame.ts",
    "src/pages/StatisticsPage/StatisticsPage.tsx",
  ])(
    "rejects the long alias in production file %s",
    async (filePath) => {
      const [result] = await eslint.lintText('import "@/shared/lib/guards/guards";', { filePath });
      expect(result?.messages.some((message) => message.ruleId === "no-restricted-imports")).toBe(
        true,
      );
    },
    120_000,
  );

  it.each([
    "src/app/App.test.tsx",
    "src/shared/ui/navigation-bar/NavigationBar.test.tsx",
    "src/pages/GamePage/components/SettingsOverlay.test.tsx",
  ])("allows the long alias in test file %s", async (filePath) => {
    const [result] = await eslint.lintText('import "@/shared/lib/guards/guards";', { filePath });
    expect(result?.messages.some((message) => message.ruleId === "no-restricted-imports")).toBe(
      false,
    );
  });
});

describe("dynamic shared lib imports", () => {
  const eslint = new ESLint({
    overrideConfig: { languageOptions: { parserOptions: { project: null } } },
  });

  it.each([
    "src/index.tsx",
    "src/app/App.tsx",
    "src/shared/lib/guards/guards.ts",
    "src/pages/StartPage/startPageLoader.ts",
    "src/pages/StartPage/useIsCurrentGame.ts",
    "src/pages/StatisticsPage/StatisticsPage.tsx",
  ])(
    "rejects dynamic imports in %s",
    async (filePath) => {
      for (const code of [
        'import("@/shared/lib/guards/guards");',
        "import(`@/shared/lib/guards/guards`);",
        "import(`@/shared/lib/${name}`);",
      ]) {
        const [result] = await eslint.lintText(code, { filePath });
        expect(result?.messages.some((message) => message.ruleId === "no-restricted-syntax")).toBe(
          true,
        );
      }
    },
    120_000,
  );

  it.each([
    "src/app/App.test.tsx",
    "src/shared/ui/navigation-bar/NavigationBar.test.tsx",
    "src/pages/GamePage/components/SettingsOverlay.test.tsx",
  ])("allows dynamic imports in %s", async (filePath) => {
    const [result] = await eslint.lintText('import("@/shared/lib/guards/guards");', { filePath });
    expect(result?.messages.some((message) => message.ruleId === "no-restricted-syntax")).toBe(
      false,
    );
  });

  it("allows dynamic imports through the short alias", async () => {
    const [result] = await eslint.lintText('import("@/lib/guards/guards");', {
      filePath: "src/app/App.tsx",
    });
    expect(result?.messages.some((message) => message.ruleId === "no-restricted-syntax")).toBe(
      false,
    );
  });
});

describe("Playwright URL restrictions", () => {
  it("still rejects absolute URLs in mocked specs", async () => {
    const eslint = new ESLint({
      overrideConfig: { languageOptions: { parserOptions: { project: null } } },
    });
    const [result] = await eslint.lintText('const url = "https://example.com";', {
      filePath: "tests/routing/invalid-game-id.spec.ts",
    });
    expect(result?.messages.some((message) => message.ruleId === "no-restricted-syntax")).toBe(
      true,
    );
  });
});
