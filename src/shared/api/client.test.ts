// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiValidationError,
  apiClient,
  clearUnauthorizedHandler,
  setUnauthorizedHandler,
} from "./client";
import { TimeoutError } from "./errors";
import { createMockResponse } from "./test-utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function acceptUnknown(_data: unknown): _data is unknown {
  return true;
}

function isOkResponse(data: unknown): data is { ok: boolean } {
  return isRecord(data) && typeof data.ok === "boolean";
}

function isNullResponse(data: unknown): data is null {
  return data === null;
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
        body: { message: "Unauthorized" },
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        url: "http://localhost/api/protected",
      }),
    );

    await expect(apiClient.get("/protected", { validate: acceptUnknown })).rejects.toMatchObject({
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
        body: { message: "Unauthorized" },
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        url: "http://localhost/api/protected",
      }),
    );

    await expect(
      apiClient.get("/csrf", { skipAuthRedirect: true, validate: acceptUnknown }),
    ).rejects.toMatchObject({
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

    const requestPromise = apiClient.get("/slow", { timeoutMs: 5000, validate: acceptUnknown });
    vi.advanceTimersByTime(5000);

    await expect(requestPromise).rejects.toThrow(TimeoutError);
    await expect(requestPromise).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });

  it("should not throw TimeoutError when request completes in time", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { ok: true },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "http://localhost/api/protected",
      }),
    );

    const result = await apiClient.get("/fast", {
      timeoutMs: 5000,
      validate: isOkResponse,
    });
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

    const requestPromise = apiClient.get("/slow", { validate: acceptUnknown });

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
      validate: acceptUnknown,
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
      body: { ok: true },
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      url: "http://localhost/api/game/520",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);

    const result = await apiClient.request<{ ok: boolean }>("/game/520", {
      method: "GET",
      returnResponse: true,
      validate: isOkResponse,
    });

    expect(result).toEqual({
      data: { ok: true },
      response,
    });
  });

  it("returns null for accepted 304 responses instead of throwing ApiError", async () => {
    const response = createMockResponse({
      status: 304,
      headers: new Headers({ ETag: "etag-v1" }),
      url: "http://localhost/api/game/520?since=etag-v1",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);

    const result = await apiClient.request<null>("/game/520", {
      method: "GET",
      acceptedStatuses: [304],
      returnResponse: true,
      validate: isNullResponse,
    });

    expect(result).toEqual({
      data: null,
      response,
    });
  });

  it("throws ApiValidationError when a successful response fails validation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { ok: "yes" },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "http://localhost/api/protected",
      }),
    );

    await expect(
      apiClient.get<{ ok: boolean }>("/fast", {
        timeoutMs: 5000,
        validate: isOkResponse,
      }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });
});
