// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as v from "valibot";
import {
  ApiValidationError,
  apiClient,
  clearUnauthorizedHandler,
  setUnauthorizedHandler,
} from "./client";
import { NetworkError, TimeoutError } from "./errors";
import { createMockResponse } from "./test-utils";

const acceptUnknown = v.unknown();

const okResponseSchema = v.object({ ok: v.boolean() });

const nullResponseSchema = v.null();

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

  it("should throw when registering the unauthorized handler twice without clearing", () => {
    setUnauthorizedHandler(vi.fn());

    expect(() => setUnauthorizedHandler(vi.fn())).toThrowError(
      "Unauthorized handler is already registered",
    );
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
      validate: okResponseSchema,
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

  it("should keep the caller's reason when the external signal aborts with 'timeout'", async () => {
    const externalController = new AbortController();

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        }),
    );

    const requestPromise = apiClient.get("/slow", {
      signal: externalController.signal,
      validate: acceptUnknown,
    });

    externalController.abort("timeout");

    await expect(requestPromise).rejects.toBe("timeout");
  });

  it("should throw NetworkError when fetch fails with a network error after an external abort", async () => {
    const externalController = new AbortController();

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new TypeError("Failed to fetch"));
          });
        }),
    );

    const requestPromise = apiClient.get("/slow", {
      signal: externalController.signal,
      validate: acceptUnknown,
    });

    externalController.abort();

    await expect(requestPromise).rejects.toBeInstanceOf(NetworkError);
  });
});

function createStalledJsonResponse(): Response {
  // Headers arrive at once; the body stream never enqueues or closes.
  return createMockResponse({
    body: new ReadableStream<Uint8Array>(),
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
  });
}

describe("apiClient response body deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should throw TimeoutError when the body stalls after headers arrive", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(createStalledJsonResponse());

    const requestPromise = apiClient.get("/stalled", { timeoutMs: 10, validate: acceptUnknown });
    const assertion = expect(requestPromise).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(10);

    await assertion;
  });

  it("should throw AbortError when the external signal aborts while the body is read", async () => {
    const externalController = new AbortController();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(createStalledJsonResponse());

    const requestPromise = apiClient.get("/stalled", {
      timeoutMs: 5000,
      signal: externalController.signal,
      validate: acceptUnknown,
    });
    const assertion = expect(requestPromise).rejects.toMatchObject({ name: "AbortError" });

    await vi.advanceTimersByTimeAsync(0);
    externalController.abort();

    await assertion;
  });
});

describe("apiClient error body parsing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw ApiError with the fallback message when an error body is not valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: "<html>Bad Gateway</html>",
        status: 502,
        headers: new Headers({ "content-type": "application/json" }),
      }),
    );

    await expect(apiClient.get("/broken", { validate: acceptUnknown })).rejects.toMatchObject({
      name: "ApiError",
      message: "Request failed",
      status: 502,
      data: null,
    });
  });
});

describe("apiClient external signal cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function captureRequestSignal(response: () => Promise<Response>): () => AbortSignal | undefined {
    let requestSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementationOnce((_url, init) => {
      requestSignal = init?.signal ?? undefined;
      return response();
    });
    return () => requestSignal;
  }

  it("should detach from the external signal after a successful request", async () => {
    const externalController = new AbortController();
    const getRequestSignal = captureRequestSignal(() =>
      Promise.resolve(
        createMockResponse({
          body: { ok: true },
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
        }),
      ),
    );

    await apiClient.get("/fast", { signal: externalController.signal, validate: okResponseSchema });
    externalController.abort();

    expect(getRequestSignal()?.aborted).toBe(false);
  });

  it("should detach from the external signal after an HTTP error", async () => {
    const externalController = new AbortController();
    const getRequestSignal = captureRequestSignal(() =>
      Promise.resolve(
        createMockResponse({
          body: { message: "Server error" },
          status: 500,
          headers: new Headers({ "content-type": "application/json" }),
        }),
      ),
    );

    await expect(
      apiClient.get("/broken", { signal: externalController.signal, validate: acceptUnknown }),
    ).rejects.toMatchObject({ name: "ApiError", status: 500 });
    externalController.abort();

    expect(getRequestSignal()?.aborted).toBe(false);
  });

  it("should detach from the external signal after a timeout", async () => {
    const externalController = new AbortController();
    const addListener = vi.spyOn(externalController.signal, "addEventListener");
    const removeListener = vi.spyOn(externalController.signal, "removeEventListener");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(createStalledJsonResponse());

    const requestPromise = apiClient.get("/stalled", {
      timeoutMs: 10,
      signal: externalController.signal,
      validate: acceptUnknown,
    });
    const assertion = expect(requestPromise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;

    const abortListener = addListener.mock.calls.find(([type]) => type === "abort")?.[1];
    expect(abortListener).toBeDefined();
    expect(removeListener).toHaveBeenCalledWith("abort", abortListener);
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

    const result = await apiClient.request("/game/520", {
      method: "GET",
      returnResponse: true,
      validate: okResponseSchema,
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

    const result = await apiClient.request("/game/520", {
      method: "GET",
      acceptedStatuses: [304],
      returnResponse: true,
      validate: nullResponseSchema,
    });

    expect(result).toEqual({
      data: null,
      response,
    });
  });

  it("returns the schema output, with defaults filled in and unknown keys dropped", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { ok: true, extra: "ignored" },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "http://localhost/api/fast",
      }),
    );

    const result = await apiClient.get("/fast", {
      validate: v.object({ ok: v.boolean(), retries: v.optional(v.number(), 0) }),
    });

    expect(result).toEqual({ ok: true, retries: 0 });
  });

  it("keeps the raw payload on ApiValidationError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        body: { ok: "yes" },
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        url: "http://localhost/api/protected",
      }),
    );

    await expect(apiClient.get("/fast", { validate: okResponseSchema })).rejects.toMatchObject({
      message: "API response failed validation",
      raw: { ok: "yes" },
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
      apiClient.get("/fast", {
        timeoutMs: 5000,
        validate: okResponseSchema,
      }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });
});

describe("apiClient manual redirects", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves an opaque redirect when the caller asked for manual redirects", async () => {
    // A browser answers a 3xx under `redirect: "manual"` with this shape; jsdom cannot build it.
    const opaqueRedirect = createMockResponse({ body: "" });
    Object.defineProperties(opaqueRedirect, {
      type: { value: "opaqueredirect" },
      status: { value: 0 },
      ok: { value: false },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(opaqueRedirect);

    await expect(
      apiClient.post("/logout", undefined, { redirect: "manual", validate: v.string() }),
    ).resolves.toBe("");
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirect: "manual" }),
    );
  });
});
