// @vitest-environment node
vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { addGuestPlayer, createRoom, getInvitation, leaveRoom, updatePlayerOrder } from "./room";
import { apiClient, ApiValidationError } from "./client";
import { ApiError } from "./errors";
import { respondWith } from "./test-utils";

// Contract example: POST /api/invite/create/{id}. An unknown id is a 404 in the shared error
// body, which apiClient throws before the schema runs.
const invitationExample = {
  success: true,
  gameId: 123,
  invitationLink: "/api/invite/join/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  users: [{ id: 1, username: "alice" }],
  message: null,
};

// Contract example: POST /api/room/create
const createRoomExample = { success: true, gameId: 123 };

describe("getInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the game id and link from the contract example", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith(invitationExample));

    await expect(getInvitation(123)).resolves.toEqual({
      gameId: 123,
      invitationLink: "/api/invite/join/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/invite/create/123",
      undefined,
      expect.objectContaining({ validate: expect.any(Object) }),
    );
  });

  it("forwards AbortSignal for invitation requests", async () => {
    const controller = new AbortController();
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith(invitationExample));

    await getInvitation(123, controller.signal);

    expect(apiClient.post).toHaveBeenCalledWith("/invite/create/123", undefined, {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("rejects with ApiValidationError when success is missing", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(
      respondWith({ gameId: 123, invitationLink: "/api/invite/join/x" }),
    );

    await expect(getInvitation(123)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiError when the contract-valid payload has no invitation link", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(
      respondWith({ success: false, gameId: null, invitationLink: null }),
    );

    await expect(getInvitation(123)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("createRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a room and then requests its invitation via POST", async () => {
    vi.mocked(apiClient.post)
      .mockImplementationOnce(respondWith(createRoomExample))
      .mockImplementationOnce(respondWith(invitationExample));

    const response = await createRoom();

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/room/create",
      {},
      expect.objectContaining({ validate: expect.any(Object) }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/invite/create/123",
      undefined,
      expect.objectContaining({ validate: expect.any(Object) }),
    );
    expect(response).toEqual({
      gameId: 123,
      invitationLink: "/api/invite/join/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    });
  });

  it("forwards pre-create settings when creating a room", async () => {
    vi.mocked(apiClient.post)
      .mockImplementationOnce(respondWith(createRoomExample))
      .mockImplementationOnce(respondWith(invitationExample));

    await createRoom({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/room/create",
      {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
      expect.objectContaining({ validate: expect.any(Object) }),
    );
  });

  it("rejects with ApiValidationError when gameId is not an integer", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith({ success: true, gameId: "123" }));

    await expect(createRoom()).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError and skips the invitation when the room has a null game id", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith({ success: true, gameId: null }));

    await expect(createRoom()).rejects.toBeInstanceOf(ApiValidationError);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
});

describe("leaveRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves for the contract SuccessMessageDto", async () => {
    vi.mocked(apiClient.delete).mockImplementationOnce(
      respondWith({ message: "Player removed", success: true }),
    );

    await expect(leaveRoom(123, 7)).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledWith("/room/123", {
      query: { playerId: 7 },
      validate: expect.any(Object),
    });
  });

  it("rejects with ApiValidationError when message is missing", async () => {
    vi.mocked(apiClient.delete).mockImplementationOnce(respondWith({ success: true }));

    await expect(leaveRoom(123, 7)).rejects.toBeInstanceOf(ApiValidationError);
  });
});

describe("updatePlayerOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves for the contract example", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith({ success: true }));

    await expect(updatePlayerOrder(123, [{ playerId: 7, position: 1 }])).resolves.toBeUndefined();
  });

  it("rejects with ApiValidationError when success is missing", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith({}));

    await expect(updatePlayerOrder(123, [])).rejects.toBeInstanceOf(ApiValidationError);
  });
});

describe("addGuestPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the guest player from the contract example", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(
      respondWith({
        success: true,
        player: { id: 123, name: "Alex", position: 2, isGuest: true },
      }),
    );

    await expect(addGuestPlayer(123, { username: "Alex" })).resolves.toEqual({
      id: 123,
      name: "Alex",
      position: 2,
      isGuest: true,
    });
  });

  it("rejects with ApiValidationError when the player has no name", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(
      respondWith({ success: true, player: { id: 123 } }),
    );

    await expect(addGuestPlayer(123, { username: "Alex" })).rejects.toBeInstanceOf(
      ApiValidationError,
    );
  });
});
