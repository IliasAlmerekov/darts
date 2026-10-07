import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// npm runs scripts through sh, which has no `**`. An unquoted glob is expanded by
// the shell and, with generated CSS in coverage/ or dist/, can hand stylelint only
// ignored files (AllFilesIgnoredError). Quoted, stylelint resolves the glob itself.
const SOURCE_CSS_GLOB = '"src/**/*.css"';

interface PackageJson {
  scripts: Record<string, string>;
}

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as PackageJson;

describe("stylelint npm scripts", () => {
  it("lints source CSS through a quoted glob", () => {
    expect(packageJson.scripts["stylelint"]).toBe(`stylelint ${SOURCE_CSS_GLOB}`);
  });

  it("fixes source CSS through the same quoted glob", () => {
    expect(packageJson.scripts["stylelint:fix"]).toBe(`stylelint ${SOURCE_CSS_GLOB} --fix`);
  });
});
