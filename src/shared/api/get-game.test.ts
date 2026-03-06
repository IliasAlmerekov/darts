// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGameThrows, getGameThrowsIfChanged, resetGameStateVersion } from "./game";
import { apiClient, clearUnauthorizedHandler, setUnauthorizedHandler } from "./client";

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

  it("returns data on 200 and stores game state version", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        status: 200,
        body: { id: 520, players: [], status: "started" },
        headers: { "content-type": "application/json", "X-Game-State-Version": "v1" },
      }),
    );

    const data = await getGameThrowsIfChanged(520);

    expect(data).toEqual({ id: 520, players: [], status: "started" });
    expect(fetchMock).toHaveBeenCalledWith("/api/game/520", expect.any(Object));
  });

  it("uses since + If-None-Match on subsequent requests and returns null on 304", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          body: { id: 520, players: [], status: "started" },
          headers: { "content-type": "application/json", ETag: "etag-v1" },
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse({
          status: 304,
          headers: { ETag: "etag-v1" },
        }),
      );

    await getGameThrowsIfChanged(520);
    const result = await getGameThrowsIfChanged(520);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/game/520?since=etag-v1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "If-None-Match": "etag-v1",
        }),
      }),
    );
  });

  it("throws ApiError when conditional fetch returns invalid response shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        status: 200,
        body: { id: 520, players: [] },
        headers: { "content-type": "application/json", ETag: "etag-v1" },
      }),
    );

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape",
      status: 200,
    });
  });

  it("rethrows AbortError without converting it to NetworkError", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortError);

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("calls the unauthorized handler on 401 during conditional fetch", async () => {
    const unauthorizedHandler = vi.fn();
    setUnauthorizedHandler(unauthorizedHandler);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        status: 401,
        body: { message: "Unauthorized" },
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "UnauthorizedError",
      status: 401,
    });
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });
});
