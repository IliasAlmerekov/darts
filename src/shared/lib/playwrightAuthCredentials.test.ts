// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolvePlaywrightAuthTestCredentials } from "./playwrightAuthCredentials";

describe("resolvePlaywrightAuthTestCredentials", () => {
  it("returns trimmed credentials when both auth env variables are configured", () => {
    const result = resolvePlaywrightAuthTestCredentials({
      PLAYWRIGHT_TEST_EMAIL: "  tester@example.com  ",
      PLAYWRIGHT_TEST_PASSWORD: "  change-me  ",
    });

    expect(result).toEqual({
      isConfigured: true,
      credentials: {
        email: "tester@example.com",
        password: "change-me",
      },
      missingVariableNames: [],
      skipReason: null,
    });
  });

  it("reports missing auth env variables with a skip reason", () => {
    const result = resolvePlaywrightAuthTestCredentials({});

    expect(result.isConfigured).toBe(false);

    if (result.isConfigured) {
      throw new Error("Expected auth test credentials to be reported as missing.");
    }

    expect(result.missingVariableNames).toEqual([
      "PLAYWRIGHT_TEST_EMAIL",
      "PLAYWRIGHT_TEST_PASSWORD",
    ]);
    expect(result.skipReason).toContain("Missing PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD.");
    expect(result.skipReason).toContain(".env/.env.local");
    expect(result.skipReason).toContain("CI secrets");
  });
});
