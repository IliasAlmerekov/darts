import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(process.cwd(), "src");
const SOURCE_FILE_EXTENSIONS = new Set([".ts", ".tsx"]);

function collectApplicationSourceFiles(directoryPath: string): string[] {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return collectApplicationSourceFiles(entryPath);
    }

    if (!SOURCE_FILE_EXTENSIONS.has(extname(entry.name))) {
      return [];
    }

    if (entry.name.includes(".test.") || entry.name.includes(".spec.")) {
      return [];
    }

    return [entryPath];
  });
}

describe("client logger adoption", () => {
  it("does not use raw console.error in application source files", () => {
    const filesWithRawConsoleError = collectApplicationSourceFiles(SOURCE_ROOT).filter((filePath) =>
      /console\.error\s*\(/.test(readFileSync(filePath, "utf8")),
    );

    expect(filesWithRawConsoleError.map((filePath) => relative(SOURCE_ROOT, filePath))).toEqual([]);
  });
});
