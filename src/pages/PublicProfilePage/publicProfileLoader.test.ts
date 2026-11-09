// @vitest-environment node

vi.mock("@/shared/api/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/shared/api/player", () => ({
  getPlayerPublicProfile: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn() },
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
import { getAuthenticatedUser, type AuthenticatedUser } from "@/shared/api/auth";
import { getPlayerPublicProfile } from "@/shared/api/player";
import { ROUTES } from "@/lib/router/routes";
import { playerQueries } from "@/shared/query/player.queries";
import { queryClient } from "@/shared/query/queryClient";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { buildPlayerPublicProfile } from "@/shared/types/player.test-support";
import { makeLoaderArgs } from "@/test/loaderArgs";
import { publicProfileLoader } from "./publicProfileLoader";

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    success: true,
    id: 42,
    roles: ["ROLE_PLAYER"],
    email: "alice@example.com",
    username: "Alice",
    redirect: ROUTES.playerProfile,
    ...overrides,
  };
}

function load(id: string): Promise<unknown> {
  return Promise.resolve(
    publicProfileLoader(
      makeLoaderArgs(new Request(`http://localhost${ROUTES.playerProfile}/${id}`), { id }),
    ),
  );
}

describe("publicProfileLoader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
    vi.mocked(getAuthenticatedUser).mockResolvedValue(createUser());
    vi.mocked(getPlayerPublicProfile).mockResolvedValue(buildPlayerPublicProfile());
  });

  it("fills the Public profile query of the route id", async () => {
    await load("7");

    expect(getPlayerPublicProfile).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    expect(queryClient.getQueryData(playerQueries.publicProfile(7).queryKey)?.displayName).toBe(
      "Anna",
    );
  });

  it("redirects the player's own id to their own Player profile without a read", async () => {
    const result = load("42");

    await expect(result).rejects.toMatchObject({ status: 302 });
    const response = await result.catch((error: unknown) => error);
    expect(response instanceof Response && response.headers.get("Location")).toBe(
      ROUTES.playerProfile,
    );
    expect(getPlayerPublicProfile).not.toHaveBeenCalled();
  });

  it("keeps a 404 in the query for the page's not-found state, without logging it", async () => {
    vi.mocked(getPlayerPublicProfile).mockRejectedValue(
      new ApiError("Player not found", { status: 404, data: { error: "PLAYER_NOT_FOUND" } }),
    );

    await expect(load("8")).resolves.toBeNull();

    expect(queryClient.getQueryState(playerQueries.publicProfile(8).queryKey)?.status).toBe(
      "error",
    );
    expect(clientLogger.error).not.toHaveBeenCalled();
  });

  it("logs any other failed read and leaves it to the page", async () => {
    vi.mocked(getPlayerPublicProfile).mockRejectedValue(new ApiError("boom", { status: 500 }));

    await expect(load("8")).resolves.toBeNull();

    expect(clientLogger.error).toHaveBeenCalledWith("player.public-profile.fetch.failed", {
      context: { playerId: 8 },
      error: expect.any(ApiError),
    });
  });

  it.each([null, createUser({ roles: ["ROLE_ADMIN"] })])(
    "sends no read when the session is not a player's (%o)",
    async (user) => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);

      await expect(load("7")).resolves.toBeNull();

      expect(getPlayerPublicProfile).not.toHaveBeenCalled();
    },
  );

  it.each(["abc", "0", "-5", "1e3", "1.5"])(
    "throws a 404 response and sends no request for the invalid id %s",
    async (id) => {
      await expect(load(id)).rejects.toMatchObject({ status: 404 });

      expect(getPlayerPublicProfile).not.toHaveBeenCalled();
    },
  );
});
