// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser } from "./auth";

type AuthResponseBody = {
  success: boolean;
  user?: {
    success: boolean;
    roles: string[];
    id: number;
    redirect: string;
    gameId?: number | null;
  };
};

function createMockResponse(body: AuthResponseBody): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    url: "/api/login/success",
    json: vi.fn(async () => body),
  } as unknown as Response;
}

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns authenticated user for successful response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        success: true,
        user: {
          success: true,
          roles: ["ROLE_USER"],
          id: 7,
          redirect: "/start",
          gameId: 42,
        },
      }),
    );

    await expect(getAuthenticatedUser()).resolves.toMatchObject({
      id: 7,
      gameId: 42,
    });
  });

  it("aborts request after timeout", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal;

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          },
          { once: true },
        );
      });
    });

    const requestPromise = getAuthenticatedUser({ timeoutMs: 50 });
    const assertion = expect(requestPromise).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(51);

    await assertion;
  });
});
