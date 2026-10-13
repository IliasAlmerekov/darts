// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { resolveSafeRedirect } from "./safeRedirect";

const FALLBACK = "/start";

describe("resolveSafeRedirect", () => {
  it.each(["/\\evil.example", "/\\/evil.example", "/start/\\evil.example"])(
    "falls back when the path %s contains a backslash",
    (redirect) => {
      expect(resolveSafeRedirect(redirect, FALLBACK)).toBe(FALLBACK);
    },
  );

  it.each(["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/start\u0000"])(
    "falls back when the path %j contains a control character",
    (redirect) => {
      expect(resolveSafeRedirect(redirect, FALLBACK)).toBe(FALLBACK);
    },
  );

  it.each(["//evil.example", "https://evil.example/phishing", "javascript:alert(1)"])(
    "falls back when %s points outside the app",
    (redirect) => {
      expect(resolveSafeRedirect(redirect, FALLBACK)).toBe(FALLBACK);
    },
  );

  it("falls back when the redirect is empty", () => {
    expect(resolveSafeRedirect(undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveSafeRedirect("", FALLBACK)).toBe(FALLBACK);
  });

  it("keeps an internal path with its query and hash", () => {
    expect(resolveSafeRedirect("/start/42?invite=1#lobby", FALLBACK)).toBe(
      "/start/42?invite=1#lobby",
    );
  });

  it("reduces a same-origin absolute URL to its path", () => {
    const redirect = `${window.location.origin}/start/42?invite=1`;

    expect(resolveSafeRedirect(redirect, FALLBACK)).toBe("/start/42?invite=1");
  });
});
