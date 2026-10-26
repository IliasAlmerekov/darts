// @vitest-environment node

// ── API mocks (the only external boundary) ───────────────────────────────────
vi.mock("@/shared/api/game", () => ({
  getTabletGame: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTabletGame } from "@/shared/api/game";
import { queryClient } from "@/shared/query/queryClient";
import { makeLoaderArgs } from "@/test/loaderArgs";
import { fetchTabletGame, tabletGameLoader } from "./tabletGameLoader";

const getTabletGameMock = vi.mocked(getTabletGame);

function routeRequest(path: string, controller: AbortController): Request {
  return new Request(`http://localhost${path}`, { signal: controller.signal });
}

beforeEach(() => {
  vi.resetAllMocks();
  queryClient.clear();
});

describe("fetchTabletGame", () => {
  it("should not read the tablet game for a navigation replaced while it waits for an earlier cancel", async () => {
    getTabletGameMock.mockReturnValueOnce(new Promise(() => {}));
    getTabletGameMock.mockResolvedValue({ game: null, lastFinishedGameId: 5 });
    const first = new AbortController();
    void fetchTabletGame(routeRequest("/game/3", first));
    await vi.waitFor(() => expect(getTabletGameMock).toHaveBeenCalledTimes(1));

    first.abort();
    const second = new AbortController();
    const secondRead = fetchTabletGame(routeRequest("/game/5", second));
    second.abort();

    await expect(secondRead).resolves.toBeNull();
    expect(getTabletGameMock).toHaveBeenCalledTimes(1);
  });
});

describe("tabletGameLoader", () => {
  it.each(["abc", "0", "-5", "1e3"])(
    "should throw a 404 response and send no request for the invalid id %s",
    async (id) => {
      const loader = tabletGameLoader("settings");

      const result = Promise.resolve(
        loader(makeLoaderArgs(new Request(`http://localhost/settings/${id}`), { id })),
      );

      await expect(result).rejects.toMatchObject({ status: 404 });
      expect(getTabletGameMock).not.toHaveBeenCalled();
    },
  );

  it("should redirect a valid foreign id to the tablet game", async () => {
    getTabletGameMock.mockResolvedValue({
      game: { id: 7, status: "lobby" },
      lastFinishedGameId: null,
    });
    const loader = tabletGameLoader("settings");

    const result = await loader(
      makeLoaderArgs(new Request("http://localhost/settings/3"), { id: "3" }),
    );

    expect((result as Response).headers.get("Location")).toBe("/settings/7");
  });
});
