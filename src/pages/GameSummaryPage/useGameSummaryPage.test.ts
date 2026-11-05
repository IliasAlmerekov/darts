// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/shared/query/queryClient";
import { useGameSummaryPage } from "./useGameSummaryPage";
import { enterRematchLobby, runSummaryAction } from "./lib/summaryActions";

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ id: "42" }),
}));
vi.mock("./lib/summaryActions", () => ({ runSummaryAction: vi.fn(), enterRematchLobby: vi.fn() }));
const navigate = vi.fn();
const client = createQueryClient();
function wrapper({ children }: { children: ReactNode }): ReactNode {
  return createElement(QueryClientProvider, { client }, children);
}

describe("useGameSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
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
});
