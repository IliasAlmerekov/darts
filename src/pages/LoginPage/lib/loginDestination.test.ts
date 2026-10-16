// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { resolveLoginDestination } from "./loginDestination";
import type { AuthenticatedUser } from "@/shared/api/auth";

const admin: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_ADMIN", "ROLE_PLAYER"],
  id: 1,
  redirect: "/start",
};

const player: AuthenticatedUser = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  redirect: "http://localhost:3000/joined",
  gameId: 42,
};

const noContext = { currentGameId: null, from: "/start" };

describe("resolveLoginDestination", () => {
  it("sends a player to the in-app form of a same-origin redirect", () => {
    expect(resolveLoginDestination(player, noContext)).toBe("/joined");
  });

  it("ignores a stale stored game for a player", () => {
    expect(resolveLoginDestination(player, { currentGameId: 99, from: "/start" })).toBe("/joined");
  });

  it("sends an admin with a stored game back to that game's start page", () => {
    expect(resolveLoginDestination(admin, { currentGameId: 99, from: "/start" })).toBe("/start/99");
  });

  it("sends an admin to the protected source route instead of the generic start page", () => {
    expect(resolveLoginDestination(admin, { currentGameId: null, from: "/statistics" })).toBe(
      "/statistics",
    );
  });

  it("turns a game-specific start redirect into the generic start route", () => {
    expect(resolveLoginDestination({ ...admin, redirect: "/start/42" }, noContext)).toBe("/start");
  });

  it("falls back to the source route when the redirect leaves the app", () => {
    expect(
      resolveLoginDestination({ ...admin, redirect: "https://evil.example/phishing" }, noContext),
    ).toBe("/start");
  });
});
