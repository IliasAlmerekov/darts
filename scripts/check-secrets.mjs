import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const forbiddenPatterns = [
  {
    name: "default weak password",
    regex: /\bpass123\b/i,
  },
  {
    name: "hardcoded markdown test credentials",
    regex: /-\s*Email:\s*`[^`]+`\s*\r?\n-\s*Password:\s*`[^`]+`/i,
  },
];

const textFileExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".env",
  ".css",
  ".html",
]);

const ignoredFiles = new Set(["scripts/check-secrets.mjs"]);

function getTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf-8" });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function hasAllowedExtension(filePath) {
  for (const extension of textFileExtensions) {
    if (filePath.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

function main() {
  const violations = [];
  const files = getTrackedFiles().filter(hasAllowedExtension);

  for (const file of files) {
    if (ignoredFiles.has(file)) {
      continue;
    }

    let content = "";

    try {
      content = readFileSync(resolve(process.cwd(), file), "utf-8");
    } catch {
      continue;
    }

    for (const pattern of forbiddenPatterns) {
      if (pattern.regex.test(content)) {
        violations.push(`${file}: ${pattern.name}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("Secret check failed. Potential hardcoded credentials found:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Secret check passed.");
}

main();
