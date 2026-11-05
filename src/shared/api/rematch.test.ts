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
import { createRematchGame } from "./game";
import { RematchNotStartedError, startRematch } from "@/lib/game/startLobbyGame";

import { apiClient, ApiValidationError } from "./client";
import { ApiError } from "./errors";
import { respondWith } from "./test-utils";

const rematchExample = {
  success: true,
  gameId: 777,
  invitationLink: "/api/invite/join/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
};

describe("game/rematch api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the contract RematchResponseDto from a single request", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith(rematchExample));

    const response = await createRematchGame(520);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/room/520/rematch",
      undefined,
      expect.objectContaining({ validate: expect.any(Object) }),
    );
    expect(response).toEqual(rematchExample);
  });

  it.each([
    ["a null game id", { ...rematchExample, gameId: null }],
    ["no invitation link", { success: true, gameId: 777 }],
  ])("rejects with ApiValidationError when the rematch response has %s", async (_, body) => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith(body));

    await expect(createRematchGame(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError when the rematch response has no success flag", async () => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith({ gameId: 777 }));

    await expect(createRematchGame(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("starts rematch with canonical settings and returns the new game id", async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith({
        gameId: 520,
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
        status: "finished",
      }),
    );
    vi.mocked(apiClient.post)
      .mockImplementationOnce(respondWith(rematchExample))
      .mockImplementationOnce(
        respondWith({
          id: 777,
          status: "started",
          currentRound: 1,
          currentThrowCount: 0,
          players: [],
          settings: { startScore: 501, doubleOut: true, tripleOut: false },
        }),
      );

    const response = await startRematch(520);

    expect(vi.mocked(apiClient.get).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(apiClient.post).mock.invocationCallOrder[0] ?? 0,
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      "/game/520/settings",
      expect.objectContaining({ validate: expect.any(Object) }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/room/520/rematch",
      undefined,
      expect.objectContaining({ validate: expect.any(Object) }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/game/777/start",
      {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
      expect.objectContaining({ validate: expect.any(Object) }),
    );
    expect(response).toEqual({
      success: true,
      gameId: 777,
      invitationLink: rematchExample.invitationLink,
      settings: {
        gameId: 520,
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
        status: "finished",
      },
    });
  });

  describe("when a step of the rematch fails", () => {
    const settingsExample = {
      gameId: 520,
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
      status: "finished",
    };
    const serverError = (): ApiError => new ApiError("Server error", { status: 500 });

    it("should reject with the settings error and request no lobby when the settings read fails", async () => {
      const settingsError = serverError();
      vi.mocked(apiClient.get).mockRejectedValueOnce(settingsError);

      await expect(startRematch(520)).rejects.toBe(settingsError);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("should reject with ApiValidationError and request no lobby when the settings are invalid", async () => {
      vi.mocked(apiClient.get).mockImplementationOnce(
        respondWith({ ...settingsExample, startScore: "501" }),
      );

      await expect(startRematch(520)).rejects.toBeInstanceOf(ApiValidationError);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("should reject with the rematch error and start nothing when the lobby request fails", async () => {
      const rematchError = serverError();
      vi.mocked(apiClient.get).mockImplementationOnce(respondWith(settingsExample));
      vi.mocked(apiClient.post).mockRejectedValueOnce(rematchError);

      await expect(startRematch(520)).rejects.toBe(rematchError);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).not.toHaveBeenCalledWith(
        "/game/777/start",
        expect.anything(),
        expect.anything(),
      );
    });

    it("should reject with RematchNotStartedError for the new lobby when the start fails", async () => {
      const startError = serverError();
      vi.mocked(apiClient.get).mockImplementationOnce(respondWith(settingsExample));
      vi.mocked(apiClient.post)
        .mockImplementationOnce(respondWith(rematchExample))
        .mockRejectedValueOnce(startError);

      const error: unknown = await startRematch(520).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(RematchNotStartedError);
      expect(error).toMatchObject({ gameId: 777, cause: startError });
    });
  });
});
