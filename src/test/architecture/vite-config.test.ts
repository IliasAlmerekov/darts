// @vitest-environment node
import { describe, expect, it } from "vitest";
import path from "node:path";
import { loadConfigFromFile } from "vite";

describe("Vite config", () => {
  it("loads with the native config loader", async () => {
    const result = await loadConfigFromFile(
      { command: "build", mode: "production" },
      undefined,
      process.cwd(),
      "error",
      undefined,
      "native",
    );

    expect(result?.path).toBe(path.join(process.cwd(), "vite.config.mts"));
    expect(result?.config.resolve?.alias).toMatchObject({
      "@": path.join(process.cwd(), "src"),
    });
  });
});
