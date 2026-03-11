// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REDACTED_VALUE } from "@/shared/lib/clientLogger";

const GAME_ID_STORAGE_KEY = "darts_current_game_id";
const INVITATION_STORAGE_KEY = "darts_current_invitation";
const PRE_CREATE_SETTINGS_STORAGE_KEY = "darts_pre_create_game_settings";

describe("game-session store", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetModules();
  });

  it("hydrates invitation from sessionStorage on module init", async () => {
    window.sessionStorage.setItem(
      INVITATION_STORAGE_KEY,
      JSON.stringify({ gameId: 77, invitationLink: "/invite/77" }),
    );
    window.sessionStorage.setItem(GAME_ID_STORAGE_KEY, "77");

    const roomStore = await import("./game-session");

    expect(roomStore.$invitation.get()).toEqual({
      gameId: 77,
      invitationLink: "/invite/77",
    });
    expect(roomStore.$currentGameId.get()).toBe(77);
  });

  it("persists invitation and clears it on reset", async () => {
    const roomStore = await import("./game-session");

    roomStore.setInvitation({ gameId: 12, invitationLink: "/invite/12" });

    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBe(
      JSON.stringify({ gameId: 12, invitationLink: "/invite/12" }),
    );
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBe("12");

    roomStore.resetRoomStore();

    expect(roomStore.$invitation.get()).toBeNull();
    expect(roomStore.$currentGameId.get()).toBeNull();
    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBeNull();
  });

  it("preserves last finished game id when resetting room-scoped state", async () => {
    const roomStore = await import("./game-session");

    roomStore.setLastFinishedGameId(88);
    roomStore.setInvitation({ gameId: 12, invitationLink: "/invite/12" });

    roomStore.resetRoomStore();

    expect(roomStore.$lastFinishedGameId.get()).toBe(88);
    expect(roomStore.$invitation.get()).toBeNull();
    expect(roomStore.$currentGameId.get()).toBeNull();
  });

  it("stores and clears the last finished game summary snapshot", async () => {
    const roomStore = await import("./game-session");
    const snapshot = {
      gameId: 88,
      summary: [
        {
          playerId: 1,
          username: "Alice",
          position: 1,
          roundsPlayed: 5,
          roundAverage: 54.2,
        },
      ],
    };

    roomStore.setLastFinishedGameSummary(snapshot);
    expect(roomStore.$lastFinishedGameSummary.get()).toEqual(snapshot);

    roomStore.setLastFinishedGameSummary(null);
    expect(roomStore.$lastFinishedGameSummary.get()).toBeNull();
  });

  it("hydrates pre-create settings from sessionStorage on module init", async () => {
    window.sessionStorage.setItem(
      PRE_CREATE_SETTINGS_STORAGE_KEY,
      JSON.stringify({ startScore: 501, doubleOut: true, tripleOut: false }),
    );

    const roomStore = await import("./game-session");

    expect(roomStore.$preCreateGameSettings.get()).toEqual({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });
  });

  it("persists pre-create settings updates", async () => {
    const roomStore = await import("./game-session");

    roomStore.setPreCreateGameSettings({
      startScore: 401,
      doubleOut: false,
      tripleOut: true,
    });

    expect(roomStore.$preCreateGameSettings.get()).toEqual({
      startScore: 401,
      doubleOut: false,
      tripleOut: true,
    });
    expect(window.sessionStorage.getItem(PRE_CREATE_SETTINGS_STORAGE_KEY)).toBe(
      JSON.stringify({ startScore: 401, doubleOut: false, tripleOut: true }),
    );
  });
});

// ─── Ticket 4 — store-as-cache contract ──────────────────────────────────────
// $currentGameId is cache/preload only; setting the same value must be a no-op
// so that URL-derived gameId always remains the authoritative source.

describe("game-session store — Ticket 4: store is cache, not authority", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetModules();
  });

  it("should initialise $currentGameId to null when sessionStorage is empty", async () => {
    const roomStore = await import("./game-session");
    expect(roomStore.$currentGameId.get()).toBeNull();
  });

  it("should initialise $currentGameId from sessionStorage (preload for navigation)", async () => {
    // The store acts as a preload hint — URL param overrides it once the page mounts
    window.sessionStorage.setItem(GAME_ID_STORAGE_KEY, "55");
    const roomStore = await import("./game-session");
    expect(roomStore.$currentGameId.get()).toBe(55);
  });

  it("should NOT mutate the store when setCurrentGameId is called with the same value", async () => {
    const roomStore = await import("./game-session");
    roomStore.setCurrentGameId(42);

    const storeSpy = vi.spyOn(roomStore.$currentGameId, "set");
    roomStore.setCurrentGameId(42);

    expect(storeSpy).not.toHaveBeenCalled();
  });

  it("should persist to sessionStorage when setCurrentGameId receives a new value", async () => {
    const roomStore = await import("./game-session");
    roomStore.setCurrentGameId(99);

    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBe("99");
    expect(roomStore.$currentGameId.get()).toBe(99);
  });

  it("should remove the key from sessionStorage when setCurrentGameId receives null", async () => {
    window.sessionStorage.setItem(GAME_ID_STORAGE_KEY, "33");
    const roomStore = await import("./game-session");
    roomStore.setCurrentGameId(null);

    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBeNull();
    expect(roomStore.$currentGameId.get()).toBeNull();
  });

  it("should return null from getActiveGameId when no game is stored", async () => {
    const roomStore = await import("./game-session");
    expect(roomStore.getActiveGameId()).toBeNull();
  });

  it("should return the stored gameId from getActiveGameId", async () => {
    const roomStore = await import("./game-session");
    roomStore.setCurrentGameId(7);
    expect(roomStore.getActiveGameId()).toBe(7);
  });

  it("should gracefully fall back to null when sessionStorage contains corrupt game id", async () => {
    window.sessionStorage.setItem(GAME_ID_STORAGE_KEY, "not-a-number");
    const roomStore = await import("./game-session");
    expect(roomStore.$currentGameId.get()).toBeNull();
  });

  it("should gracefully fall back to null when sessionStorage contains corrupt invitation JSON", async () => {
    window.sessionStorage.setItem(INVITATION_STORAGE_KEY, "{broken json");
    const roomStore = await import("./game-session");
    expect(roomStore.$invitation.get()).toBeNull();
  });

  it("should gracefully fall back to null when invitation JSON is valid but fails schema check", async () => {
    // gameId is a string — not a number — so the shape guard must reject it
    window.sessionStorage.setItem(
      INVITATION_STORAGE_KEY,
      JSON.stringify({ gameId: "42", invitationLink: "/invite/42" }),
    );
    const roomStore = await import("./game-session");
    expect(roomStore.$invitation.get()).toBeNull();
  });

  it("should set invitation and update currentGameId atomically via setInvitation", async () => {
    const roomStore = await import("./game-session");
    roomStore.setInvitation({ gameId: 8, invitationLink: "/invite/8" });

    expect(roomStore.$invitation.get()).toEqual({ gameId: 8, invitationLink: "/invite/8" });
    expect(roomStore.$currentGameId.get()).toBe(8);
  });

  it("should clear invitation store and sessionStorage when setInvitation receives null", async () => {
    const roomStore = await import("./game-session");
    roomStore.setInvitation({ gameId: 8, invitationLink: "/invite/8" });
    roomStore.setInvitation(null);

    expect(roomStore.$invitation.get()).toBeNull();
    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull();
  });

  it("should redact invitationLink when sessionStorage persistence fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const roomStore = await import("./game-session");

    roomStore.setInvitation({
      gameId: 8,
      invitationLink: "https://example.com/invite/8?token=secret",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[client:error] game-session.persist-invitation.failed",
      {
        context: {
          storageKey: INVITATION_STORAGE_KEY,
          invitation: {
            gameId: 8,
            invitationLink: REDACTED_VALUE,
          },
        },
        error: expect.objectContaining({
          message: "quota exceeded",
          name: "Error",
        }),
      },
    );

    setItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
