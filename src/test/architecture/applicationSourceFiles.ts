import { readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

/** The `src` folder of the checkout the tests run in. */
export const SOURCE_ROOT = resolve(process.cwd(), "src");

const SOURCE_FILE_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Every `.ts` and `.tsx` file below `directoryPath`, without test and spec files. */
export function collectApplicationSourceFiles(directoryPath: string): string[] {
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
