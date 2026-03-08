// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGameThrows, getGameThrowsIfChanged, resetGameStateVersion } from "./game";
import { apiClient, clearUnauthorizedHandler, setUnauthorizedHandler } from "./client";
import { TimeoutError } from "./errors";

type MockResponseOptions = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  url?: string;
};

function createMockResponse(options: MockResponseOptions): Response {
  const headers = new Headers(options.headers ?? {});

  return {
    status: options.status,
    ok: options.status >= 200 && options.status < 300,
    headers,
    url: options.url ?? "/api/game/1",
    json: vi.fn(async () => options.body),
    text: vi.fn(async () =>
      typeof options.body === "string" ? options.body : JSON.stringify(options.body ?? {}),
    ),
  } as unknown as Response;
}

describe("getGameThrowsIfChanged", () => {
  beforeEach(() => {
    resetGameStateVersion();
    clearUnauthorizedHandler();
    vi.restoreAllMocks();
  });

  it("returns data for valid getGameThrows response", async () => {
    const response = { id: 520, players: [], status: "started" };
    vi.spyOn(apiClient, "get").mockResolvedValueOnce(response);

    const data = await getGameThrows(520);

    expect(data).toEqual(response);
    expect(apiClient.get).toHaveBeenCalledWith("/game/520");
  });

  it("throws ApiError when getGameThrows receives invalid response shape", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ id: 520, players: [] });

    await expect(getGameThrows(520)).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape",
      status: 200,
    });
  });

  it("throws ApiError when getGameThrows receives an unknown game status", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ id: 520, players: [], status: "active" });

    await expect(getGameThrows(520)).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape",
      status: 200,
    });
  });

  it("routes conditional game fetches through apiClient.request and forwards AbortSignal", async () => {
    const controller = new AbortController();
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: { id: 520, players: [], status: "started" },
      response: createMockResponse({
        status: 200,
        body: { id: 520, players: [], status: "started" },
        headers: { "content-type": "application/json", "X-Game-State-Version": "v1" },
        url: "http://localhost/api/game/520",
      }),
    });
    const fetchTrap = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("raw fetch should not be used by getGameThrowsIfChanged"));

    const data = await getGameThrowsIfChanged(520, controller.signal);

    expect(data).toEqual({ id: 520, players: [], status: "started" });
    expect(requestSpy).toHaveBeenCalledWith(
      "/game/520",
      expect.objectContaining({
        method: "GET",
        signal: controller.signal,
      }),
    );
    expect(fetchTrap).not.toHaveBeenCalled();
  });

  it("sends cached state version through apiClient.request and returns null for 304", async () => {
    const controller = new AbortController();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockResolvedValueOnce({
        data: { id: 520, players: [], status: "started" },
        response: createMockResponse({
          status: 200,
          body: { id: 520, players: [], status: "started" },
          headers: { "content-type": "application/json", ETag: "etag-v1" },
          url: "http://localhost/api/game/520",
        }),
      })
      .mockResolvedValueOnce({
        data: null,
        response: createMockResponse({
          status: 304,
          headers: { ETag: "etag-v1" },
          url: "http://localhost/api/game/520?since=etag-v1",
        }),
      });
    const fetchTrap = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("raw fetch should not be used by getGameThrowsIfChanged"));

    await getGameThrowsIfChanged(520);
    const result = await getGameThrowsIfChanged(520, controller.signal);

    expect(result).toBeNull();
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "/game/520",
      expect.objectContaining({
        method: "GET",
        signal: controller.signal,
        query: { since: "etag-v1" },
        headers: expect.objectContaining({
          "If-None-Match": "etag-v1",
        }),
      }),
    );
    expect(fetchTrap).not.toHaveBeenCalled();
  });

  it("surfaces TimeoutError from apiClient.request for conditional game fetches", async () => {
    const timeoutError = new TimeoutError(
      "Request timed out after 30000ms",
      "http://localhost/api/game/520",
    );

    vi.spyOn(apiClient, "request").mockRejectedValueOnce(timeoutError);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("raw fetch should not be used by getGameThrowsIfChanged"),
    );

    await expect(getGameThrowsIfChanged(520)).rejects.toBe(timeoutError);
  });

  it("throws ApiError when conditional fetch returns invalid response shape", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: { id: 520, players: [] },
      response: createMockResponse({
        status: 200,
        body: { id: 520, players: [] },
        headers: { "content-type": "application/json", ETag: "etag-v1" },
        url: "http://localhost/api/game/520",
      }),
    });

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape",
      status: 200,
    });
  });

  it("rethrows AbortError without converting it to NetworkError", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.spyOn(apiClient, "request").mockRejectedValueOnce(abortError);

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("propagates UnauthorizedError from apiClient.request", async () => {
    const unauthorizedHandler = vi.fn();
    setUnauthorizedHandler(unauthorizedHandler);

    vi.spyOn(apiClient, "request").mockRejectedValueOnce(
      Object.assign(new Error("Unauthorized"), {
        name: "UnauthorizedError",
        status: 401,
      }),
    );

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "UnauthorizedError",
      status: 401,
    });
    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });
});
