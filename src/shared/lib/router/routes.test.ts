// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ROUTES } from "./routes";

describe("ROUTES", () => {
  it("should return login path", () => {
    expect(ROUTES.login).toBe("/");
  });

  it("should return register path", () => {
    expect(ROUTES.register).toBe("/register");
  });

  it("should return base start path when no id given", () => {
    expect(ROUTES.start()).toBe("/start");
  });

  it("should return start path with id", () => {
    expect(ROUTES.start(42)).toBe("/start/42");
  });

  it("should return start path with zero id", () => {
    expect(ROUTES.start(0)).toBe("/start/0");
  });

  it("should return game path with id", () => {
    expect(ROUTES.game(10)).toBe("/game/10");
  });

  it("should return summary path with id", () => {
    expect(ROUTES.summary(7)).toBe("/summary/7");
  });

  it("should return details path with id", () => {
    expect(ROUTES.details(99)).toBe("/details/99");
  });

  it("should return gamesOverview path", () => {
    expect(ROUTES.gamesOverview).toBe("/gamesoverview");
  });

  it("should return base settings path when no id given", () => {
    expect(ROUTES.settings()).toBe("/settings");
  });

  it("should return settings path with id", () => {
    expect(ROUTES.settings(5)).toBe("/settings/5");
  });

  it("should return settings path with zero id", () => {
    expect(ROUTES.settings(0)).toBe("/settings/0");
  });

  it("should return statistics path", () => {
    expect(ROUTES.statistics).toBe("/statistics");
  });

  it("should return joined path", () => {
    expect(ROUTES.joined).toBe("/joined");
  });

  it("should return playerProfile path", () => {
    expect(ROUTES.playerProfile).toBe("/playerprofile");
  });
});
