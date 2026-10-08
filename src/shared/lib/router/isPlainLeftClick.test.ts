// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isPlainLeftClick } from "./isPlainLeftClick";

function click(init: Partial<Parameters<typeof isPlainLeftClick>[0]> = {}) {
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...init,
  };
}

describe("isPlainLeftClick", () => {
  it("returns true for an unmodified primary-button click", () => {
    expect(isPlainLeftClick(click())).toBe(true);
  });

  it.each([
    { label: "Ctrl", init: { ctrlKey: true } },
    { label: "Cmd", init: { metaKey: true } },
    { label: "Shift", init: { shiftKey: true } },
    { label: "Alt", init: { altKey: true } },
    { label: "middle button", init: { button: 1 } },
    { label: "secondary button", init: { button: 2 } },
  ])("returns false for a $label click", ({ init }) => {
    expect(isPlainLeftClick(click(init))).toBe(false);
  });
});
