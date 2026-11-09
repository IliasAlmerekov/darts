// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseRouteId, routeIdOrNotFound } from "./routeId";

describe("parseRouteId", () => {
  it.each([
    ["7", 7],
    ["42", 42],
  ])("reads %s as %i", (param, id) => {
    expect(parseRouteId(param)).toBe(id);
  });

  it.each([undefined, "abc", "0", "-5", "1e3", "1.5", "9007199254740993"])(
    "rejects %s",
    (param) => {
      expect(parseRouteId(param)).toBeNull();
    },
  );
});

describe("routeIdOrNotFound", () => {
  it("returns a valid id", () => {
    expect(routeIdOrNotFound("7")).toBe(7);
  });

  it.each([undefined, "abc", "0"])("throws a 404 route error response for %s", (param) => {
    let thrown: unknown;
    try {
      routeIdOrNotFound(param);
    } catch (error: unknown) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect(thrown).toMatchObject({ status: 404 });
  });
});
