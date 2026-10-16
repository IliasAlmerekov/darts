// @vitest-environment jsdom
import {
  GAME_ID_STORAGE_KEY,
  INVITATION_STORAGE_KEY,
  PRE_CREATE_SETTINGS_STORAGE_KEY,
  type Invitation,
} from "./game-session";
import { beforeEach, describe, expect, it, vi } from "vitest";

function buildInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    gameId: 12,
    invitationLink: "/invite/12",
    ...overrides,
  };
}

function createSecurityError(): DOMException {
  return new DOMException("Access is denied for this document.", "SecurityError");
}

describe("game-session store", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetModules();
  });

  it("should hydrate invitation from sessionStorage when the module initializes", async () => {
    const invitation = buildInvitation({ gameId: 77, invitationLink: "/invite/77" });

    window.sessionStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify(invitation));
    window.sessionStorage.setItem(GAME_ID_STORAGE_KEY, "77");

    const roomStore = await import("./game-session");

    expect(roomStore.$invitation.get()).toEqual(invitation);
    expect(roomStore.$currentGameId.get()).toBe(77);
  });

  it("should persist invitation and clear it when the room store resets", async () => {
    const roomStore = await import("./game-session");
    const invitation = buildInvitation();

    roomStore.setInvitation(invitation);

    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBe(JSON.stringify(invitation));
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBe("12");

    roomStore.resetRoomStore();

    expect(roomStore.$invitation.get()).toBeNull();
    expect(roomStore.$currentGameId.get()).toBeNull();
    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBeNull();
  });

  it("should hydrate pre-create settings from sessionStorage when the module initializes", async () => {
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

  it("should persist pre-create settings when they are updated", async () => {
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

// ─── Finished game summary lives in the query cache, not the store ───────────

describe("game-session store: finished game summary", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetModules();
  });

  it.each(["$lastFinishedGameSummary", "setLastFinishedGameSummary"])(
    "should not export %s when the public store API is loaded",
    async (name) => {
      const roomStore = await import("./game-session");

      expect(name in roomStore).toBe(false);
    },
  );
});

// ─── Last finished game: the rematch source for the next room ───────────────

describe("game-session store: last finished game", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetModules();
  });

  it("should start with no last finished game", async () => {
    const roomStore = await import("./game-session");

    expect(roomStore.$lastFinishedGameId.get()).toBeNull();
  });

  it("should keep the game set last", async () => {
    const roomStore = await import("./game-session");

    roomStore.setLastFinishedGameId(9);
    roomStore.setLastFinishedGameId(5);

    expect(roomStore.$lastFinishedGameId.get()).toBe(5);
  });

  it("should clear the last finished game only for the same game id", async () => {
    const roomStore = await import("./game-session");
    roomStore.setLastFinishedGameId(9);

    roomStore.clearLastFinishedGameId(5);
    expect(roomStore.$lastFinishedGameId.get()).toBe(9);

    roomStore.clearLastFinishedGameId(9);
    expect(roomStore.$lastFinishedGameId.get()).toBeNull();
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

  it("should initialise $currentGameId from sessionStorage when preload data exists for navigation", async () => {
    // The store acts as a preload hint — URL param overrides it once the page mounts
    window.sessionStorage.setItem(GAME_ID_STORAGE_KEY, "55");
    const roomStore = await import("./game-session");
    expect(roomStore.$currentGameId.get()).toBe(55);
  });

  it("should NOT mutate the store when setCurrentGameId is called with the same value", async () => {
    const roomStore = await import("./game-session");
    roomStore.setCurrentGameId(42);

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    roomStore.setCurrentGameId(42);

    expect(roomStore.$currentGameId.get()).toBe(42);
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBe("42");
    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
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

  it("should return the stored gameId from getActiveGameId when a game is cached", async () => {
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

  it("should treat sessionStorage SecurityError as unavailable storage when storage access throws", async () => {
    const originalSessionStorageDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "sessionStorage",
    );

    if (originalSessionStorageDescriptor === undefined) {
      throw new Error("Expected window.sessionStorage descriptor to exist");
    }

    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw createSecurityError();
      },
    });

    try {
      const roomStore = await import("./game-session");

      expect(roomStore.$currentGameId.get()).toBeNull();
      expect(roomStore.$invitation.get()).toBeNull();
      expect(roomStore.$preCreateGameSettings.get()).toEqual({
        startScore: 301,
        doubleOut: false,
        tripleOut: false,
      });

      expect(() => {
        roomStore.setCurrentGameId(123);
        roomStore.setInvitation(buildInvitation({ gameId: 123, invitationLink: "/invite/123" }));
      }).not.toThrow();
    } finally {
      Object.defineProperty(window, "sessionStorage", originalSessionStorageDescriptor);
    }
  });

  it("should set invitation and update currentGameId atomically when setInvitation receives a value", async () => {
    const roomStore = await import("./game-session");
    const invitation = buildInvitation({ gameId: 8, invitationLink: "/invite/8" });

    roomStore.setInvitation(invitation);

    expect(roomStore.$invitation.get()).toEqual(invitation);
    expect(roomStore.$currentGameId.get()).toBe(8);
  });

  it("should persist invitation when gameId is 0", async () => {
    const roomStore = await import("./game-session");
    const invitation = buildInvitation({ gameId: 0, invitationLink: "/invite/0" });

    roomStore.setInvitation(invitation);

    expect(roomStore.$invitation.get()).toEqual(invitation);
    expect(roomStore.$currentGameId.get()).toBe(0);
    expect(window.sessionStorage.getItem(GAME_ID_STORAGE_KEY)).toBe("0");
  });

  it("should keep the invitation when the server reports the same current game", async () => {
    const roomStore = await import("./game-session");
    const invitation = buildInvitation({ gameId: 8, invitationLink: "/invite/8" });
    roomStore.setInvitation(invitation);

    roomStore.setServerCurrentGameId(8);

    expect(roomStore.$invitation.get()).toEqual(invitation);
    expect(roomStore.$currentGameId.get()).toBe(8);
  });

  it("should drop the invitation when the server reports another current game", async () => {
    const roomStore = await import("./game-session");
    roomStore.setInvitation(buildInvitation({ gameId: 8, invitationLink: "/invite/8" }));

    roomStore.setServerCurrentGameId(9);

    expect(roomStore.$invitation.get()).toBeNull();
    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull();
    expect(roomStore.$currentGameId.get()).toBe(9);
  });

  it("should drop the invitation when the server reports no current game", async () => {
    const roomStore = await import("./game-session");
    roomStore.setInvitation(buildInvitation({ gameId: 8, invitationLink: "/invite/8" }));

    roomStore.setServerCurrentGameId(null);

    expect(roomStore.$invitation.get()).toBeNull();
    expect(roomStore.$currentGameId.get()).toBeNull();
  });

  it("should clear invitation store and sessionStorage when setInvitation receives null", async () => {
    const roomStore = await import("./game-session");
    roomStore.setInvitation(buildInvitation({ gameId: 8, invitationLink: "/invite/8" }));
    roomStore.setInvitation(null);

    expect(roomStore.$invitation.get()).toBeNull();
    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull();
  });

  it("should not leak invitationLink when sessionStorage persistence fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const roomStore = await import("./game-session");
    const invitationLink = "https://example.com/invite/8?token=secret";
    const invitation = buildInvitation({
      gameId: 8,
      invitationLink,
    });

    expect(() => {
      roomStore.setInvitation(invitation);
    }).not.toThrow();

    expect(roomStore.$invitation.get()).toEqual(invitation);
    expect(roomStore.$currentGameId.get()).toBe(8);

    const serializedConsoleErrors = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(serializedConsoleErrors).not.toContain(invitationLink);
    expect(serializedConsoleErrors).not.toContain("token=secret");

    setItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});

// ─── TICKET-11 — resetPreCreateGameSettings ───────────────────────────────────

describe("game-session store — resetPreCreateGameSettings", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetModules();
  });

  it("should reset $preCreateGameSettings to default values when resetPreCreateGameSettings is called", async () => {
    const roomStore = await import("./game-session");
    roomStore.setPreCreateGameSettings({
      startScore: 501,
      doubleOut: true,
      tripleOut: true,
    });

    roomStore.resetPreCreateGameSettings();

    expect(roomStore.$preCreateGameSettings.get()).toEqual({
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    });
  });

  it("should update sessionStorage when resetPreCreateGameSettings is called", async () => {
    const roomStore = await import("./game-session");
    roomStore.setPreCreateGameSettings({
      startScore: 501,
      doubleOut: true,
      tripleOut: true,
    });

    roomStore.resetPreCreateGameSettings();

    expect(window.sessionStorage.getItem(PRE_CREATE_SETTINGS_STORAGE_KEY)).toBe(
      JSON.stringify({ startScore: 301, doubleOut: false, tripleOut: false }),
    );
  });
});
