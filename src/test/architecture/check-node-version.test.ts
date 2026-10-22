// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(process.cwd(), "scripts/check-node-version.mjs");

const SETUP_NODE_STEP = `      - name: Setup Node.js
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: npm
`;

const workflow = (steps: string): string => `name: CI
on: pull_request
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
${steps}      - run: npm ci
`;

const validRepo = (): Record<string, string> => ({
  ".nvmrc": "24.22.1\n",
  Dockerfile: "FROM node:24.22.1-alpine AS builder\n",
  "deploy/frontend.Dockerfile": "FROM node:24.22.1-alpine AS build\n",
  "compose.dev.yaml": "services:\n  frontend:\n    image: node:24.22.1-alpine\n",
  ".gitlab-ci.yml": ".base_job: &base_job\n  image: node:24.22.1\n",
  ".github/workflows/ci.yml": workflow(SETUP_NODE_STEP),
});

let repoDir: string | undefined;

afterEach(() => {
  if (repoDir) {
    rmSync(repoDir, { recursive: true, force: true });
    repoDir = undefined;
  }
});

function runCheck(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "check-node-version-"));
  repoDir = dir;
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }

  const result = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("scripts/check-node-version.mjs", () => {
  it("passes when every pin is an exact 24.22.1 and workflows read .nvmrc", () => {
    const { status, output } = runCheck(validRepo());

    expect(status).toBe(0);
    expect(output).toContain("ok: every Node.js pin is 24.22.1 or later");
  });

  it.each([
    [".nvmrc", "20.19\n", "FAIL: .nvmrc: Node 20.19 is not an exact x.y.z version."],
    [".nvmrc", "24.22.0\n", "FAIL: .nvmrc: Node 24.22.0 is older than 24.22.1."],
    [
      "Dockerfile",
      "FROM node:22-alpine AS builder\n",
      "FAIL: Dockerfile:1: Node 22 is not an exact x.y.z version.",
    ],
    [
      "compose.dev.yaml",
      "services:\n  frontend:\n    image: node:24.21.9-alpine\n",
      "FAIL: compose.dev.yaml:3: Node 24.21.9 is older than 24.22.1.",
    ],
    [".gitlab-ci.yml", "image: alpine\n", "FAIL: .gitlab-ci.yml: no node image found."],
    [
      "Dockerfile",
      "FROM alpine\n# was node:24.22.1-alpine\n",
      "FAIL: Dockerfile: no node image found.",
    ],
  ])("fails when %s holds %j", (path, content, failure) => {
    const { status, output } = runCheck({ ...validRepo(), [path]: content });

    expect(status).toBe(1);
    expect(output).toContain(failure);
  });

  it.each([
    [
      "sets node-version itself",
      SETUP_NODE_STEP.replace("node-version-file: .nvmrc", "node-version: 24"),
      "FAIL: .github/workflows/ci.yml:11: use node-version-file: .nvmrc instead of node-version.",
    ],
    [
      "has no version input",
      SETUP_NODE_STEP.replace("          node-version-file: .nvmrc\n", ""),
      "FAIL: .github/workflows/ci.yml:8: the actions/setup-node step lacks node-version-file: .nvmrc.",
    ],
    [
      "reads another version file",
      SETUP_NODE_STEP.replace(".nvmrc", ".tool-versions"),
      "FAIL: .github/workflows/ci.yml:8: the actions/setup-node step lacks node-version-file: .nvmrc.",
    ],
    [
      "sets node-version-file outside with",
      SETUP_NODE_STEP.replace(
        "        with:\n          node-version-file: .nvmrc\n",
        "        env:\n          node-version-file: .nvmrc\n        with:\n",
      ),
      "FAIL: .github/workflows/ci.yml:8: the actions/setup-node step lacks node-version-file: .nvmrc.",
    ],
  ])("fails when a setup-node step %s", (_case, step, failure) => {
    const { status, output } = runCheck({
      ...validRepo(),
      ".github/workflows/ci.yml": workflow(step),
    });

    expect(status).toBe(1);
    expect(output).toContain(failure);
  });

  it("accepts a setup-node step written as a one-line list item", () => {
    const { status } = runCheck({
      ...validRepo(),
      ".github/workflows/ci.yml":
        workflow(`      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
`),
    });

    expect(status).toBe(0);
  });
});
