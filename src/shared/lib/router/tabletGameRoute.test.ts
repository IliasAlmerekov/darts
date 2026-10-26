// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseRouteGameId, resolveTabletGameRoute, routeGameIdOrNotFound } from "./tabletGameRoute";

const LOBBY = { id: 7, status: "lobby" } as const;
const STARTED = { id: 7, status: "started" } as const;

describe("parseRouteGameId", () => {
  it("should accept a positive integer", () => {
    expect(parseRouteGameId("7")).toBe(7);
    expect(parseRouteGameId("9007199254740991")).toBe(9007199254740991);
  });

  it.each(["-5", "0", "abc", "1e3", "07", "7.0", " 7", "", "9007199254740993"])(
    "should reject %j",
    (param) => {
      expect(parseRouteGameId(param)).toBeNull();
    },
  );

  it("should return null without a param", () => {
    expect(parseRouteGameId(undefined)).toBeNull();
  });
});

describe("routeGameIdOrNotFound", () => {
  it("should return the id of a valid param and null without a param", () => {
    expect(routeGameIdOrNotFound("7")).toBe(7);
    expect(routeGameIdOrNotFound(undefined)).toBeNull();
  });

  it.each(["-5", "0", "abc", "1e3", "1.5", ""])("should throw a 404 response for %j", (param) => {
    let thrown: unknown;
    try {
      routeGameIdOrNotFound(param);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });
});

describe("resolveTabletGameRoute", () => {
  describe("start route", () => {
    it("should send a foreign id to the lobby of the tablet game", () => {
      expect(resolveTabletGameRoute("start", 3, LOBBY)).toBe("/start/7");
      expect(resolveTabletGameRoute("start", null, LOBBY)).toBe("/start/7");
    });

    it("should send any id to the started tablet game", () => {
      expect(resolveTabletGameRoute("start", 3, STARTED)).toBe("/game/7");
      expect(resolveTabletGameRoute("start", 7, STARTED)).toBe("/game/7");
      expect(resolveTabletGameRoute("start", null, STARTED)).toBe("/game/7");
    });

    it("should send an id to the bare start page when there is no tablet game", () => {
      expect(resolveTabletGameRoute("start", 3, null)).toBe("/start");
    });

    it("should stay when the route already shows the tablet game", () => {
      expect(resolveTabletGameRoute("start", 7, LOBBY)).toBeNull();
      expect(resolveTabletGameRoute("start", null, null)).toBeNull();
    });
  });

  describe("game route", () => {
    it("should send any id to the lobby of the tablet game", () => {
      expect(resolveTabletGameRoute("game", 3, LOBBY)).toBe("/start/7");
      expect(resolveTabletGameRoute("game", 7, LOBBY)).toBe("/start/7");
    });

    it("should send a foreign id to the started tablet game", () => {
      expect(resolveTabletGameRoute("game", 3, STARTED)).toBe("/game/7");
    });

    it("should send any id to the bare start page when there is no tablet game", () => {
      expect(resolveTabletGameRoute("game", 3, null)).toBe("/start");
    });

    it("should stay when the route already shows the started tablet game", () => {
      expect(resolveTabletGameRoute("game", 7, STARTED)).toBeNull();
    });
  });

  describe("settings route", () => {
    it("should send a foreign or missing id to the settings of the tablet game", () => {
      expect(resolveTabletGameRoute("settings", 3, LOBBY)).toBe("/settings/7");
      expect(resolveTabletGameRoute("settings", 3, STARTED)).toBe("/settings/7");
      expect(resolveTabletGameRoute("settings", null, STARTED)).toBe("/settings/7");
    });

    it("should send an id to the bare settings page when there is no tablet game", () => {
      expect(resolveTabletGameRoute("settings", 3, null)).toBe("/settings");
    });

    it("should stay when the route already shows the tablet game", () => {
      expect(resolveTabletGameRoute("settings", 7, LOBBY)).toBeNull();
      expect(resolveTabletGameRoute("settings", 7, STARTED)).toBeNull();
      expect(resolveTabletGameRoute("settings", null, null)).toBeNull();
    });
  });
});
