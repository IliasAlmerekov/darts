// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const GAME_ID_STORAGE_KEY = "darts_current_game_id";
const INVITATION_STORAGE_KEY = "darts_current_invitation";

describe("room store", () => {
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

    const roomStore = await import("./room");

    expect(roomStore.$invitation.get()).toEqual({
      gameId: 77,
      invitationLink: "/invite/77",
    });
    expect(roomStore.$currentGameId.get()).toBe(77);
  });

  it("persists invitation and clears it on reset", async () => {
    const roomStore = await import("./room");

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
});
