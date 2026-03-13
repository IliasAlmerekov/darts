import { beforeAll, describe, expect, it } from "vitest";

const GLOBAL_IGNORES = ["commitlint.config.mjs", "dist/**"];
const TS_FILES = ["**/*.ts", "**/*.tsx"];
const SHARED_FILES = ["src/shared/**/*.{ts,tsx}"];
const SHARED_IGNORES = ["src/shared/types/game.ts", "src/shared/types/player.ts"];

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

  it("preserves src/shared scoped ignores in the shared override", () => {
    const sharedOverride = flatConfig.find((item) => hasFiles(item, SHARED_FILES));

    expect(sharedOverride).toBeDefined();
    if (!sharedOverride) {
      throw new Error("Expected shared override config item to be defined.");
    }

    expect(sharedOverride.ignores).toHaveLength(SHARED_IGNORES.length);
    expect(sharedOverride.ignores).toEqual(expect.arrayContaining(SHARED_IGNORES));
  });
});
