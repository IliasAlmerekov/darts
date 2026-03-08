// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    url: options.url ?? "http://localhost/api/protected",
    json: vi.fn(async () => options.body),
    text: vi.fn(async () =>
      typeof options.body === "string" ? options.body : JSON.stringify(options.body ?? {}),
    ),
  } as unknown as Response;
}

describe("apiClient unauthorized handling", () => {
  beforeEach(() => {
    clearUnauthorizedHandler();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearUnauthorizedHandler();
  });

  it("calls the unauthorized handler on 401 responses", async () => {
    const unauthorizedHandler = vi.fn();
    setUnauthorizedHandler(unauthorizedHandler);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        status: 401,
        body: { message: "Unauthorized" },
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(apiClient.get("/protected")).rejects.toMatchObject({
      name: "UnauthorizedError",
      status: 401,
    });
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it("skips unauthorized handler when skipAuthRedirect is enabled", async () => {
    const unauthorizedHandler = vi.fn();
    setUnauthorizedHandler(unauthorizedHandler);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        status: 401,
        body: { message: "Unauthorized" },
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(apiClient.get("/csrf", { skipAuthRedirect: true })).rejects.toMatchObject({
      name: "UnauthorizedError",
      status: 401,
    });
    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });
});

describe("apiClient request timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should throw TimeoutError when request exceeds timeoutMs", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new DOMException("The operation was aborted.", "AbortError")));
          });
        }),
    );

    const requestPromise = apiClient.get("/slow", { timeoutMs: 5000 });
    vi.advanceTimersByTime(5000);

    await expect(requestPromise).rejects.toThrow(TimeoutError);
    await expect(requestPromise).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });

  it("should not throw TimeoutError when request completes in time", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        status: 200,
        body: { ok: true },
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await apiClient.get("/fast", { timeoutMs: 5000 });
    expect(result).toEqual({ ok: true });
  });

  it("should use default 30s timeout when timeoutMs is not specified", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new DOMException("The operation was aborted.", "AbortError")));
          });
        }),
    );

    const requestPromise = apiClient.get("/slow");

    vi.advanceTimersByTime(29_999);
    // Should still be pending
    let resolved = false;
    requestPromise.then(() => (resolved = true)).catch(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(1);
    await expect(requestPromise).rejects.toThrow(TimeoutError);
  });

  it("should propagate external AbortSignal abort", async () => {
    const externalController = new AbortController();

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new DOMException("The operation was aborted.", "AbortError")));
          });
        }),
    );

    const requestPromise = apiClient.get("/slow", {
      timeoutMs: 30_000,
      signal: externalController.signal,
    });

    externalController.abort();

    await expect(requestPromise).rejects.toThrow(DOMException);
  });
});

describe("apiClient response passthrough", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed data together with the Response when returnResponse is enabled", async () => {
    const response = createMockResponse({
      status: 200,
      body: { ok: true },
      headers: { "content-type": "application/json" },
      url: "http://localhost/api/game/520",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);

    const result = await apiClient.request<{ ok: boolean }>("/game/520", {
      method: "GET",
      returnResponse: true,
    });

    expect(result).toEqual({
      data: { ok: true },
      response,
    });
  });

  it("returns null for accepted 304 responses instead of throwing ApiError", async () => {
    const response = createMockResponse({
      status: 304,
      headers: { ETag: "etag-v1" },
      url: "http://localhost/api/game/520?since=etag-v1",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);

    const result = await apiClient.request<null>("/game/520", {
      method: "GET",
      acceptedStatuses: [304],
      returnResponse: true,
    });

    expect(result).toEqual({
      data: null,
      response,
    });
  });
});
