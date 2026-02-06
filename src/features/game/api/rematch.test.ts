import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRematch } from "./rematch";

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api";

describe("game/rematch api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests invitation via POST when rematch response has no invitationLink", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ gameId: 777, success: true })
      .mockResolvedValueOnce({ gameId: 777, invitationLink: "/invite/777" });

    const response = await createRematch(520);

    expect(apiClient.post).toHaveBeenNthCalledWith(1, "/room/520/rematch");
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "/invite/create/777");
    expect(response).toEqual({
      success: true,
      gameId: 777,
      invitationLink: "/invite/777",
    });
  });
});
