// @vitest-environment node
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

    if (!SOURCE_FILE_EXTENSIONS.has(extname(entry.name)) || entry.name.includes(".test.")) {
      return [];
    }

    return [entryPath];
  });
}

function filesMatching(pattern: RegExp): string[] {
  return collectApplicationSourceFiles(SOURCE_ROOT)
    .filter((filePath) => pattern.test(readFileSync(filePath, "utf8")))
    .map((filePath) => relative(SOURCE_ROOT, filePath))
    .sort();
}

describe("auth writes of the current game", () => {
  it("calls setCurrentGameId only in the store, the non-auth flows and the post-auth module", () => {
    expect(filesMatching(/\bsetCurrentGameId\s*\(/)).toEqual([
      // Rematch.
      "pages/GameSummaryPage/lib/summaryActions.ts",
      // Room create.
      "pages/StartPage/create/useCreateStartFlow.ts",
      // The current game rule of the post-auth module.
      "shared/query/postAuthCurrentGame.ts",
      // The store itself, including setServerCurrentGameId and the invitation.
      "shared/store/game-session.ts",
    ]);
  });

  it("keeps no trace of the replaced login and registration helpers", () => {
    expect(
      filesMatching(/\b(resolveLoginDestination|acceptLoggedInUser|markInvitationErrorHandled)\b/),
    ).toEqual([]);
  });
});
