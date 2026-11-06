import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { collectApplicationSourceFiles, SOURCE_ROOT } from "./applicationSourceFiles";

describe("client logger adoption", () => {
  it("does not use raw console.error in application source files", () => {
    const filesWithRawConsoleError = collectApplicationSourceFiles(SOURCE_ROOT).filter((filePath) =>
      /console\.error\s*\(/.test(readFileSync(filePath, "utf8")),
    );

    expect(filesWithRawConsoleError.map((filePath) => relative(SOURCE_ROOT, filePath))).toEqual([]);
  });
});
