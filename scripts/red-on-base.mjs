// Runs the unit tests this branch changed against the production code of a base ref, so a
// PR can show which tests fail before the fix. Usage: npm run test:red-on-base [-- <base>]
// The base defaults to origin/main. The script builds a temporary git worktree at the merge
// base, copies in the branch's test files, runs Vitest there, and removes the worktree; the
// working tree is never touched.
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const base = process.argv[2] ?? "origin/main";

const git = (...args) => execFileSync("git", args, { encoding: "utf-8" }).trim();

// Test files, plus the test helpers and shared fixtures they may depend on.
const isTestSupport = (path) =>
  /\.test\.tsx?$/.test(path) ||
  /\.test-support\.tsx?$/.test(path) ||
  /(^|\/)test-utils\.tsx?$/.test(path) ||
  path.startsWith("src/test/");
const isTestFile = (path) => /\.test\.tsx?$/.test(path);

const repoRoot = git("rev-parse", "--show-toplevel");
const mergeBase = git("merge-base", base, "HEAD");
// Committed and uncommitted changes since the merge base, plus new files not yet added.
const changedFiles = [
  ...git("diff", "--name-only", mergeBase).split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").split("\n"),
].filter((path) => path !== "" && existsSync(join(repoRoot, path)));
const testSupport = changedFiles.filter(isTestSupport);
const testFiles = testSupport.filter(isTestFile);

if (testFiles.length === 0) {
  console.log(`No test files changed since ${base}.`);
  process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), "red-on-base-"));
const worktree = join(tempDir, "repo");
const reportPath = join(tempDir, "report.json");

try {
  git("worktree", "add", "--detach", worktree, mergeBase);
  symlinkSync(join(repoRoot, "node_modules"), join(worktree, "node_modules"), "dir");
  for (const path of testSupport) {
    mkdirSync(dirname(join(worktree, path)), { recursive: true });
    copyFileSync(join(repoRoot, path), join(worktree, path));
  }

  spawnSync(
    "npx",
    ["vitest", "run", "--reporter=json", `--outputFile=${reportPath}`, ...testFiles],
    { cwd: worktree, stdio: ["ignore", "ignore", "inherit"] },
  );

  if (!existsSync(reportPath)) {
    console.error("Vitest wrote no report; see its output above.");
    process.exitCode = 2;
  } else {
    const report = JSON.parse(readFileSync(reportPath, "utf-8"));
    const failed = report.testResults.flatMap((file) => {
      const relativePath = file.name.slice(resolve(worktree).length + 1);
      const failures = file.assertionResults.filter((test) => test.status === "failed");
      // A file that fails to load (for example, it imports a module the base lacks) has no
      // assertion results, so report the file itself.
      return failures.length === 0 && file.status === "failed"
        ? [`${relativePath} (file failed to run)`]
        : failures.map((test) => `${relativePath} > ${test.fullName}`);
    });

    console.log(
      `Against ${base} (${mergeBase.slice(0, 7)}): ${failed.length} failed, ` +
        `${report.numPassedTests} passed.`,
    );
    for (const line of failed) {
      console.log(`  red: ${line}`);
    }
  }
} finally {
  if (existsSync(worktree)) {
    git("worktree", "remove", "--force", worktree);
  }
  rmSync(tempDir, { recursive: true, force: true });
}
