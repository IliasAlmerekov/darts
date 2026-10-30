// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { SyncStatus } from "./gameSession.logic";
import { getSyncMessage } from "./syncMessage";

const NOT_SAVED = "Your last throws were not saved.";
const LOAD_FAILED = "Could not load the game.";
const SYNCING = "Syncing throws…";

describe("getSyncMessage", () => {
  it.each<[SyncStatus, string | null]>([
    ["idle", null],
    ["syncing", null],
    ["failed", NOT_SAVED],
    ["offline", NOT_SAVED],
    ["loadFailed", LOAD_FAILED],
  ])("should return the message for %s while the queue is not full", (syncStatus, expected) => {
    expect(getSyncMessage(syncStatus, false)).toBe(expected);
  });

  it.each<SyncStatus>(["idle", "syncing"])(
    "should report syncing for %s while the queue is full",
    (syncStatus) => {
      expect(getSyncMessage(syncStatus, true)).toBe(SYNCING);
    },
  );

  it.each<[SyncStatus, string]>([
    ["failed", NOT_SAVED],
    ["offline", NOT_SAVED],
    ["loadFailed", LOAD_FAILED],
  ])("should keep the %s message while the queue is full", (syncStatus, expected) => {
    expect(getSyncMessage(syncStatus, true)).toBe(expected);
  });
});
