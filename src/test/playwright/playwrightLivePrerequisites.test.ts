// @vitest-environment node
import { describe, expect, it } from "vitest";
import { findMissingLivePrerequisites } from "./playwrightLivePrerequisites";

const CONFIGURED_ENV = {
  PLAYWRIGHT_TEST_EMAIL: "tester@example.com",
  PLAYWRIGHT_TEST_PASSWORD: "change-me",
};

describe("findMissingLivePrerequisites", () => {
  it("reports nothing when credentials are set and the backend is healthy", () => {
    expect(findMissingLivePrerequisites(CONFIGURED_ENV, { ok: true })).toEqual([]);
  });

  it("names every missing credential variable", () => {
    const problems = findMissingLivePrerequisites(
      { PLAYWRIGHT_TEST_EMAIL: "tester@example.com", PLAYWRIGHT_TEST_PASSWORD: "  " },
      { ok: true },
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Missing PLAYWRIGHT_TEST_PASSWORD.");
    expect(problems[0]).not.toContain("PLAYWRIGHT_TEST_EMAIL");
  });

  it("names the failed healthcheck and the variable that points at the backend", () => {
    const problems = findMissingLivePrerequisites(CONFIGURED_ENV, {
      ok: false,
      reason: "HTTP 502",
    });

    expect(problems).toEqual([
      "Backend healthcheck GET /api/health failed (HTTP 502). Start the backend or set VITE_API_TARGET to a running one.",
    ]);
  });

  it("reports missing credentials and an unhealthy backend together", () => {
    const problems = findMissingLivePrerequisites({}, { ok: false, reason: "connection refused" });

    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("Missing PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD.");
    expect(problems[1]).toContain("(connection refused)");
  });
});
