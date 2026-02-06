import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGameThrowsIfChanged, resetGameStateVersion } from "./get-game";

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
    vi.restoreAllMocks();
  });

  it("returns data on 200 and stores game state version", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        status: 200,
        body: { id: 520, players: [] },
        headers: { "content-type": "application/json", "X-Game-State-Version": "v1" },
      }),
    );

    const data = await getGameThrowsIfChanged(520);

    expect(data).toEqual({ id: 520, players: [] });
    expect(fetchMock).toHaveBeenCalledWith("/api/game/520", expect.any(Object));
  });

  it("uses since + If-None-Match on subsequent requests and returns null on 304", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          body: { id: 520, players: [] },
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
});
