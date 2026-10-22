// @vitest-environment node

// ── API mocks (the only external boundary) ───────────────────────────────────
vi.mock("@/shared/api/game", () => ({
  getTabletGame: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTabletGame } from "@/shared/api/game";
import { queryClient } from "@/shared/query/queryClient";
import { fetchTabletGame } from "./tabletGameLoader";

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
