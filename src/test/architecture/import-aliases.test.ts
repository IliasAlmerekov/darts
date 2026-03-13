import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// --- TICKET-10 ---

const ROOT = process.cwd();

function walkSrc(dir: string, result: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSrc(fullPath, result);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

describe("import aliases — TICKET-10: удаление alias @/store", () => {
  describe("vite.config.ts", () => {
    let viteConfig: string;

    beforeAll(() => {
      viteConfig = fs.readFileSync(path.join(ROOT, "vite.config.ts"), "utf-8");
    });

    it("should not contain @/store alias key", () => {
      expect(viteConfig).not.toMatch(/['"]@\/store['"]\s*:/);
    });

    it("should still contain @/shared alias", () => {
      expect(viteConfig).toMatch(/['"]@\/shared['"]\s*:/);
    });
  });

  describe("tsconfig.json", () => {
    let paths: Record<string, unknown>;

    beforeAll(() => {
      const raw = fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8");
      // Strip single-line (// ...) and block (/* ... */) comments before parsing
      const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
      const tsconfig = JSON.parse(stripped) as {
        compilerOptions?: { paths?: Record<string, unknown> };
      };
      paths = tsconfig.compilerOptions?.paths ?? {};
    });

    it("should not contain @/store/* in paths", () => {
      expect(Object.keys(paths)).not.toContain("@/store/*");
    });

    it("should not contain bare @/store in paths", () => {
      expect(Object.keys(paths)).not.toContain("@/store");
    });

    it("should still contain @/shared/* in paths", () => {
      expect(Object.keys(paths)).toContain("@/shared/*");
    });
  });

  describe("src/ — нет импортов из @/store", () => {
    it("should not have any @/store imports in .ts/.tsx files", () => {
      const srcDir = path.join(ROOT, "src");
      const files = walkSrc(srcDir);

      // Ищем только в строках-импортах/экспортах, а не в комментариях
      const staticImportRe = /^[ \t]*(?:import|export)\b[^;'"]*['"]@\/store(?:\/[^'"]*)?['"]/m;
      const dynamicImportRe = /\bimport\s*\(\s*['"]@\/store/;

      const violators = files.filter((file) => {
        const content = fs.readFileSync(file, "utf-8");
        return staticImportRe.test(content) || dynamicImportRe.test(content);
      });

      if (violators.length > 0) {
        const list = violators.map((f) => `  - ${path.relative(ROOT, f)}`).join("\n");
        expect.fail(`Файлы, всё ещё импортирующие из @/store:\n${list}`);
      }

      expect(violators).toHaveLength(0);
    });

    it("should exclude node_modules and dist from the scan", () => {
      const srcDir = path.join(ROOT, "src");
      const files = walkSrc(srcDir);
      const forbidden = ["node_modules", "dist"];

      const leaked = files.filter((f) =>
        forbidden.some((dir) => f.includes(`${path.sep}${dir}${path.sep}`)),
      );

      expect(leaked).toHaveLength(0);
    });
  });
});
