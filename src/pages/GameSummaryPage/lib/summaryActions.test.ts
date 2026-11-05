// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
import { apiClient } from "@/shared/api/client";
import { respondWith } from "@/shared/api/test-utils";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { $currentGameId, $invitation, setInvitation } from "@/shared/store";
import { enterRematchLobby, runSummaryAction, type SummaryAction } from "./summaryActions";

vi.mock("@/shared/api/client", async (original) => ({
  ...(await original<typeof import("@/shared/api/client")>()),
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/shared/services/browser/soundPlayer", () => ({ playSound: vi.fn() }));
const settings = {
  gameId: 42,
  startScore: 501,
  doubleOut: false,
  tripleOut: false,
  status: "finished",
};
const rematch = { success: true, gameId: 77, invitationLink: "/invite/77" };
const started = {
  id: 77,
  status: "started",
  currentRound: 1,
  currentThrowCount: 0,
  players: [],
  settings: { startScore: 501, doubleOut: false, tripleOut: false },
};
const undo = {
  success: true,
  gameId: 42,
  stateVersion: "1",
  scoreboardDelta: { changedPlayers: [], status: "started", currentRound: 1 },
  serverTs: "now",
};
const originalInvitation = { gameId: 42, invitationLink: "/invite/42" };
const tablet = { game: { id: 50, status: "started" as const }, lastFinishedGameId: 42 };
const rows: {
  action: SummaryAction;
  result: "success" | "conflict" | "error" | "start-failure";
}[] = [
  ...(["undo", "rematch-start", "rematch"] as const).flatMap((action) =>
    (["success", "conflict", "error"] as const).map((result) => ({ action, result })),
  ),
  { action: "rematch-start", result: "start-failure" },
];

describe("summary actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
    setInvitation(originalInvitation);
    queryClient.setQueryData(gameQueries.finished(42).queryKey, []);
    queryClient.setQueryData(gameQueries.tablet().queryKey, tablet);
  });
  it.each(rows)("$action with $result", async ({ action, result }) => {
    const error =
      result === "conflict"
        ? new ApiError("Conflict", { status: 409, data: { error: "GAME_NOT_NEWEST" } })
        : new ApiError("Server error", { status: 500 });
    vi.mocked(apiClient.get).mockImplementation(respondWith(settings));
    if (action === "undo") {
      if (result === "success")
        vi.mocked(apiClient.delete).mockImplementationOnce(respondWith(undo));
      else vi.mocked(apiClient.delete).mockRejectedValueOnce(error);
    } else if (result === "conflict" || result === "error") {
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);
    } else {
      vi.mocked(apiClient.post).mockImplementationOnce(respondWith(rematch));
      if (result === "start-failure") vi.mocked(apiClient.post).mockRejectedValueOnce(error);
      else vi.mocked(apiClient.post).mockImplementationOnce(respondWith(started));
    }
    const outcome = await runSummaryAction(action, 42);
    if (result === "success")
      expect(outcome).toEqual({
        kind: "navigate",
        path: action === "undo" ? "/game/42" : action === "rematch" ? "/start/77" : "/game/77",
      });
    else if (result === "conflict")
      expect(outcome).toEqual({
        kind: "leave",
        path: "/game/50",
        lobbyGameId: null,
        message: "This game can no longer be changed.",
      });
    else if (result === "start-failure")
      expect(outcome).toEqual({
        kind: "leave",
        path: "/start/77",
        lobbyGameId: 77,
        message: "Server error. Please try again later.",
      });
    else
      expect(outcome).toEqual({ kind: "failed", message: "Server error. Please try again later." });
    expect(queryClient.getQueryData(gameQueries.finished(42).queryKey)).toEqual(
      result === "success" ? undefined : [],
    );
    expect(queryClient.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(
      result === "success",
    );
    expect(queryClient.getQueryData(gameQueries.tablet().queryKey)).toEqual(tablet);
    expect($currentGameId.get()).toBe(result === "success" && action !== "undo" ? 77 : 42);
    expect($invitation.get()).toEqual(
      result === "success" && action === "rematch"
        ? null
        : result === "success" && action === "rematch-start"
          ? { gameId: 77, invitationLink: "/invite/77" }
          : originalInvitation,
    );
  });
  it("releases the finished game and room only when entering the lobby", () => {
    enterRematchLobby(42, 77);
    expect($currentGameId.get()).toBe(77);
    expect($invitation.get()).toBeNull();
    expect(queryClient.getQueryData(gameQueries.finished(42).queryKey)).toBeUndefined();
    expect(queryClient.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(true);
  });
});
