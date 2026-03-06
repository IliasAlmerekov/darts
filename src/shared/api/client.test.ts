// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
