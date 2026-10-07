import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { isRecord } from "@/lib/guards/guards";

// npm runs scripts through sh, which has no globstar: an unquoted `**/*.css` is
// expanded by the shell like `*/*.css`. With generated CSS in coverage/ that can hand
// stylelint only ignored files (AllFilesIgnoredError). Double-quoted, the glob reaches
// stylelint verbatim and stylelint resolves it itself.
const QUOTED_SOURCE_CSS_GLOB = /^stylelint "src\/\*\*\/\*\.css"(\s|$)/;

describe("stylelint npm scripts", () => {
  let scripts: Record<string, unknown> = {};

  beforeAll(() => {
    const packageJson: unknown = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    );

    if (!isRecord(packageJson) || !isRecord(packageJson["scripts"])) {
      throw new Error("package.json has no scripts object");
    }

    scripts = packageJson["scripts"];
  });

  it.each(["stylelint", "stylelint:fix"])(
    "%s passes the double-quoted src/**/*.css glob to stylelint",
    (scriptName) => {
      expect(scripts[scriptName]).toEqual(expect.stringMatching(QUOTED_SOURCE_CSS_GLOB));
    },
  );
});
