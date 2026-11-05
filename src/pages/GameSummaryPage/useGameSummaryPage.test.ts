// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as gameApi from "@/shared/api/game";
import { gameQueries } from "@/shared/query/game.queries";
import { createQueryClient } from "@/shared/query/queryClient";
import { useGameSummaryPage } from "./useGameSummaryPage";
import { enterRematchLobby, runSummaryAction } from "./lib/summaryActions";

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ id: routeId }),
}));
vi.mock("./lib/summaryActions", () => ({ runSummaryAction: vi.fn(), enterRematchLobby: vi.fn() }));
let routeId = "42";
const navigate = vi.fn();
const client = createQueryClient();
function wrapper({ children }: { children: ReactNode }): ReactNode {
  return createElement(QueryClientProvider, { client }, children);
}

describe("useGameSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.clear();
    routeId = "42";
    client.setQueryData(gameQueries.finished(42).queryKey, []);
    client.setQueryData(gameQueries.finished(43).queryKey, []);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the lock while an action runs and after navigation", async () => {
    let finish: (value: { kind: "navigate"; path: string }) => void = () => {};
    vi.mocked(runSummaryAction).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(() => useGameSummaryPage(), { wrapper });
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.handleUndo();
      void result.current.handlePlayAgain();
    });
    expect(result.current.isActionPending).toBe(true);
    expect(runSummaryAction).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ kind: "navigate", path: "/game/42" });
      await pending;
    });
    expect(navigate).toHaveBeenCalledWith("/game/42");
    expect(result.current.isActionPending).toBe(true);
  });

  it("shows a failure and unlocks for a retry", async () => {
    vi.mocked(runSummaryAction).mockResolvedValue({ kind: "failed", message: "Failed" });
    const { result } = renderHook(() => useGameSummaryPage(), { wrapper });
    await act(async () => {
      await result.current.handleBackToStart();
    });
    expect(result.current.error).toBe("Failed");
    expect(result.current.isActionPending).toBe(false);
    await act(async () => {
      await result.current.handleBackToStart();
    });
    expect(runSummaryAction).toHaveBeenCalledTimes(2);
  });

  it("keeps the lock and enters a created lobby only after the delay", async () => {
    vi.useFakeTimers();
    vi.mocked(runSummaryAction).mockResolvedValue({
      kind: "leave",
      path: "/start/77",
      lobbyGameId: 77,
      message: "Failed",
    });
    const { result } = renderHook(() => useGameSummaryPage(), { wrapper });
    await act(async () => {
      await result.current.handlePlayAgain();
    });
    expect(result.current.error).toBe("Failed");
    expect(result.current.leaving).toBe(true);
    expect(result.current.isActionPending).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(enterRematchLobby).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(enterRematchLobby).toHaveBeenCalledWith(42, 77);
    expect(navigate).toHaveBeenCalledWith("/start/77", { replace: true });
  });

  it.each([
    { kind: "failed" as const, message: "Failed" },
    { kind: "leave" as const, path: "/start/77", lobbyGameId: 77, message: "Failed" },
  ])("clears the old game's $kind state when the route changes", async (outcome) => {
    vi.useFakeTimers();
    vi.mocked(runSummaryAction).mockResolvedValue(outcome);
    const { result, rerender } = renderHook(() => useGameSummaryPage(), { wrapper });

    await act(async () => {
      await result.current.handlePlayAgain();
    });
    expect(result.current.error).toBe("Failed");
    expect(result.current.leaving).toBe(outcome.kind === "leave");

    routeId = "43";
    rerender();
    expect(result.current.error).toBeNull();
    expect(result.current.leaving).toBe(false);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(enterRematchLobby).not.toHaveBeenCalled();
  });

  it("ignores a leave result that arrives after the route changes", async () => {
    vi.useFakeTimers();
    let finish: (value: {
      kind: "leave";
      path: string;
      lobbyGameId: number;
      message: string;
    }) => void = () => {};
    vi.mocked(runSummaryAction).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result, rerender } = renderHook(() => useGameSummaryPage(), { wrapper });
    let pending = Promise.resolve();
    act(() => {
      pending = result.current.handlePlayAgain();
    });
    routeId = "43";
    rerender();
    await act(async () => {
      finish({ kind: "leave", path: "/start/77", lobbyGameId: 77, message: "Failed" });
      await pending;
    });
    expect(result.current.error).toBeNull();
    expect(result.current.leaving).toBe(false);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(enterRematchLobby).not.toHaveBeenCalled();
  });

  it("does not refetch the released finished game after navigation", async () => {
    const fetchFinished = vi.spyOn(gameApi, "getFinishedGame").mockResolvedValue([]);
    vi.mocked(runSummaryAction).mockResolvedValue({ kind: "navigate", path: "/game/42" });
    const { result } = renderHook(() => useGameSummaryPage(), { wrapper });
    await act(async () => {
      await result.current.handleUndo();
    });
    await act(async () => {
      await client.invalidateQueries({ queryKey: gameQueries.finished(42).queryKey });
    });
    expect(fetchFinished).not.toHaveBeenCalled();
  });
});
