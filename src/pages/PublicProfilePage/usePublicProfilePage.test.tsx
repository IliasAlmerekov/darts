// @vitest-environment jsdom

const routeParams = vi.hoisted<{ id?: string }>(() => ({}));

vi.mock("react-router-dom", () => ({
  useParams: () => routeParams,
}));

vi.mock("@/shared/api/player", () => ({
  getPlayerPublicProfile: vi.fn(),
}));

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlayerPublicProfile } from "@/shared/api/player";
import { buildPlayerPublicProfile } from "@/shared/types/player.test-support";
import { QueryClientWrapper } from "@/test/QueryClientWrapper";
import { usePublicProfilePage } from "./usePublicProfilePage";

describe("usePublicProfilePage", () => {
  beforeEach(() => {
    vi.mocked(getPlayerPublicProfile).mockReset();
    vi.mocked(getPlayerPublicProfile).mockResolvedValue(buildPlayerPublicProfile());
  });

  it("reads the Public profile of the route's player id", async () => {
    routeParams.id = "7";

    const { result } = renderHook(() => usePublicProfilePage(), { wrapper: QueryClientWrapper });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(getPlayerPublicProfile).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  });

  it("stays pending and reads nothing without a valid player id", () => {
    routeParams.id = "abc";

    const { result } = renderHook(() => usePublicProfilePage(), { wrapper: QueryClientWrapper });

    expect(result.current).toEqual({ status: "pending" });
    expect(getPlayerPublicProfile).not.toHaveBeenCalled();
  });
});
