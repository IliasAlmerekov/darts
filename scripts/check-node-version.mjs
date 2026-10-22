// Fails unless every Node.js pin in the repo is an exact version at or above the one that
// fixes the October 2026 Node.js security release (CVE-2026-111497, CVE-2026-106069 and others).
// Raise MIN_NODE_VERSION with each Node.js security release (#271).
import { readFileSync, readdirSync } from "node:fs";

const MIN_NODE_VERSION = "24.22.1";

const imageFiles = [
  "Dockerfile",
  "deploy/frontend.Dockerfile",
  "compose.dev.yaml",
  ".gitlab-ci.yml",
];
const workflowDir = ".github/workflows";

const parseVersion = (version) => version.split(".").map(Number);

const isAtLeast = (version, minimum) => {
  const actual = parseVersion(version);
  const wanted = parseVersion(minimum);
  for (let i = 0; i < wanted.length; i += 1) {
    if (actual[i] !== wanted[i]) {
      return actual[i] > wanted[i];
    }
  }
  return true;
};

const failures = [];

const checkVersion = (where, version) => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    failures.push(`${where}: Node ${version} is not an exact x.y.z version.`);
  } else if (!isAtLeast(version, MIN_NODE_VERSION)) {
    failures.push(`${where}: Node ${version} is older than ${MIN_NODE_VERSION}.`);
  }
};

checkVersion(".nvmrc", readFileSync(".nvmrc", "utf-8").trim());

for (const file of imageFiles) {
  const lines = readFileSync(file, "utf-8").split(/\r?\n/);
  const pins = lines.flatMap((line, index) => {
    const match = line.match(/\bnode:([^\s-]+)/);
    return match ? [{ line: index + 1, version: match[1] }] : [];
  });
  if (pins.length === 0) {
    failures.push(`${file}: no node image found.`);
  }
  for (const pin of pins) {
    checkVersion(`${file}:${pin.line}`, pin.version);
  }
}

const indentOf = (line) => line.length - line.trimStart().length;

// Groups workflow lines into list items. A deeper "- " line, such as a list under
// `with:`, stays in the item that holds it.
const listItems = (lines) => {
  const items = [];
  let current;
  lines.forEach((line, index) => {
    const isItemStart = /^\s*- /.test(line);
    if (isItemStart && (!current || indentOf(line) <= current.indent)) {
      current = { indent: indentOf(line), line: index + 1, lines: [line] };
      items.push(current);
    } else if (current && (line.trim() === "" || indentOf(line) > current.indent)) {
      current.lines.push(line);
    } else {
      current = undefined;
    }
  });
  return items;
};

// Workflows read .nvmrc, so the version lives in one file. Without a version input
// actions/setup-node falls back to the runner's Node.js.
for (const name of readdirSync(workflowDir)) {
  const file = `${workflowDir}/${name}`;
  const lines = readFileSync(file, "utf-8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/^\s*node-version:/.test(line)) {
      failures.push(`${file}:${index + 1}: use node-version-file: .nvmrc instead of node-version.`);
    }
  });
  for (const step of listItems(lines)) {
    const usesSetupNode = step.lines.some((line) => /\buses:\s*actions\/setup-node@/.test(line));
    const readsNvmrc = step.lines.some((line) =>
      /^\s*node-version-file:\s*["']?\.nvmrc["']?\s*(#.*)?$/.test(line),
    );
    if (usesSetupNode && !readsNvmrc) {
      failures.push(
        `${file}:${step.line}: the actions/setup-node step lacks node-version-file: .nvmrc.`,
      );
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL: ${failure}`);
  }
  process.exit(1);
}

console.log(`ok: every Node.js pin is ${MIN_NODE_VERSION} or later`);
