// @vitest-environment jsdom
/**
 * TDD — Ticket 4: Single source of truth for gameId
 *
 * Rule: the route param /:id is the ONLY authoritative source.
 * The store ($currentGameId, $invitation) is cache/preload only.
 *
 * Red phase: these tests FAIL against the current implementation and will
 * turn green once useStartPage is refactored per the ticket.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveGameId } from "./useStartPage";
import { useStartPage } from "./useStartPage";

// ─── shared mocks ────────────────────────────────────────────────────────────

const navigateMock = vi.fn();
const useParamsMock = vi.fn(() => ({}));
const setCurrentGameIdMock = vi.fn();
const setInvitationMock = vi.fn();

const storeValues = new Map<string, unknown>();

const gameFlowMock = {
  getGameThrows: vi.fn(),
  getInvitation: vi.fn(),
  startGame: vi.fn(),
  createRoom: vi.fn(),
  updatePlayerOrder: vi.fn(),
  leaveRoom: vi.fn(),
  addGuestPlayer: vi.fn(),
};

const emptyPlayersResult = { players: [] as never[], count: 0 };

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useParams: () => useParamsMock(),
}));

vi.mock("./useGamePlayers", () => ({
  useGamePlayers: () => emptyPlayersResult,
}));

vi.mock("@nanostores/react", () => ({
  useStore: (store: { key?: string }) => storeValues.get(store.key ?? ""),
}));

vi.mock("@/store", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    $gameSettings: { key: "gameSettings" },
    $lastFinishedGameId: { key: "lastFinishedGameId" },
    $invitation: { key: "invitation" },
    $currentGameId: { key: "currentGameId" },
    // Mocks propagate changes into storeValues so the restore-effect
    // dependency on invitation?.gameId stabilises and avoids an infinite loop.
    setCurrentGameId: (id: number | null) => {
      setCurrentGameIdMock(id);
      storeValues.set("currentGameId", id);
    },
    setInvitation: (inv: { gameId: number; invitationLink: string } | null) => {
      setInvitationMock(inv);
      storeValues.set("invitation", inv);
    },
    setGameData: vi.fn(),
  };
});

vi.mock("@/shared/api/game", () => ({
  getGameThrows: (...args: unknown[]) => gameFlowMock.getGameThrows(...args),
  startGame: (...args: unknown[]) => gameFlowMock.startGame(...args),
}));

vi.mock("@/shared/api/room", () => ({
  createRoom: (...args: unknown[]) => gameFlowMock.createRoom(...args),
  getInvitation: (...args: unknown[]) => gameFlowMock.getInvitation(...args),
  updatePlayerOrder: (...args: unknown[]) => gameFlowMock.updatePlayerOrder(...args),
  leaveRoom: (...args: unknown[]) => gameFlowMock.leaveRoom(...args),
  addGuestPlayer: (...args: unknown[]) => gameFlowMock.addGuestPlayer(...args),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function defaultStoreState() {
  storeValues.set("gameSettings", null);
  storeValues.set("lastFinishedGameId", null);
  storeValues.set("currentGameId", null);
  storeValues.set("invitation", null);
}

/** Stable lobby response to prevent restore-effect re-runs during tests. */
function mockLobbyGame(gameId: number) {
  gameFlowMock.getGameThrows.mockResolvedValue({
    status: "lobby",
    id: gameId,
    players: [],
    settings: null,
  });
  gameFlowMock.getInvitation.mockResolvedValue({
    gameId,
    invitationLink: `/invite/${gameId}`,
  });
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createAbortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function resetGameFlowMocks(): void {
  Object.values(gameFlowMock).forEach((mockFn) => {
    mockFn.mockReset();
  });
}

// ─── resolveGameId (pure function) ───────────────────────────────────────────

describe("resolveGameId", () => {
  it("should parse valid numeric URL param as gameId", () => {
    expect(resolveGameId("42")).toBe(42);
  });

  it("should return null for non-numeric URL param", () => {
    expect(resolveGameId("abc")).toBeNull();
  });

  it("should return null when URL param is undefined", () => {
    expect(resolveGameId(undefined)).toBeNull();
  });

  it("should return null for empty string URL param", () => {
    expect(resolveGameId("")).toBeNull();
  });

  it("should return null for floating-point string that could be confused as valid", () => {
    expect(resolveGameId("3.7")).toBeNull();
  });

  it("should return null for negative number string", () => {
    expect(resolveGameId("-1")).toBeNull();
  });

  it("should return null for zero", () => {
    // 0 is not a valid game ID
    expect(resolveGameId("0")).toBeNull();
  });

  it("should treat scientific-notation string as numeric when it resolves to a positive integer", () => {
    // Number("1e2") === 100 — isInteger passes, so this is accepted.
    // React Router won't produce such params in practice; documenting the behaviour.
    expect(resolveGameId("1e2")).toBe(100);
  });

  it("should return null for 'NaN' string", () => {
    expect(resolveGameId("NaN")).toBeNull();
  });

  it("should return null for 'Infinity' string", () => {
    expect(resolveGameId("Infinity")).toBeNull();
  });
});

// ─── useStartPage — gameId derivation ────────────────────────────────────────

describe("useStartPage — gameId is derived exclusively from URL param", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGameFlowMocks();
    defaultStoreState();
    useParamsMock.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return gameId from URL param when route contains a valid id", () => {
    useParamsMock.mockReturnValue({ id: "42" });

    const { result } = renderHook(() => useStartPage());

    expect(result.current.gameId).toBe(42);
  });

  it("should return null gameId when URL param is absent, even if invitation has a gameId", () => {
    // URL has no id — invitation gameId must NOT be used as authoritative gameId
    useParamsMock.mockReturnValue({});
    storeValues.set("invitation", { gameId: 99, invitationLink: "/invite/99" });
    storeValues.set("currentGameId", 99);

    const { result } = renderHook(() => useStartPage());

    expect(result.current.gameId).toBeNull();
  });

  it("should use URL param gameId even when invitation holds a different gameId", () => {
    // URL param is authoritative — invitation value must be ignored for gameId
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("invitation", { gameId: 99, invitationLink: "/invite/99" });
    storeValues.set("currentGameId", 99);

    const { result } = renderHook(() => useStartPage());

    expect(result.current.gameId).toBe(42);
  });

  it("should return null gameId when URL param is invalid (non-numeric)", () => {
    useParamsMock.mockReturnValue({ id: "not-a-number" });

    const { result } = renderHook(() => useStartPage());

    expect(result.current.gameId).toBeNull();
  });
});

// ─── useStartPage — redirect behaviour ───────────────────────────────────────

describe("useStartPage — redirect when URL has no gameId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGameFlowMocks();
    defaultStoreState();
    useParamsMock.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should redirect to active game route when no URL param but store has currentGameId", async () => {
    storeValues.set("currentGameId", 55);

    await act(async () => {
      renderHook(() => useStartPage());
    });

    expect(navigateMock).toHaveBeenCalledWith("/start/55", { replace: true });
  });

  it("should NOT redirect when URL param already contains the currentGameId", async () => {
    useParamsMock.mockReturnValue({ id: "55" });
    storeValues.set("currentGameId", 55);
    // Provide mocks so the restore-effect completes cleanly without looping
    mockLobbyGame(55);

    await act(async () => {
      renderHook(() => useStartPage());
    });

    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/start/55"),
      expect.objectContaining({ replace: true }),
    );
  });

  it("should NOT redirect when there is neither URL param nor stored gameId", async () => {
    storeValues.set("currentGameId", null);

    await act(async () => {
      renderHook(() => useStartPage());
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });
});

// ─── useStartPage — restore effect uses URL param, not invitation ─────────────

describe("useStartPage — restore effect is triggered only by URL param", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGameFlowMocks();
    defaultStoreState();
    useParamsMock.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should NOT call getGameThrows when URL has no gameId (no restore needed)", async () => {
    // Even if invitation exists — restore must not trigger without a URL param
    storeValues.set("invitation", { gameId: 99, invitationLink: "/invite/99" });
    storeValues.set("currentGameId", 99);

    await act(async () => {
      renderHook(() => useStartPage());
    });

    expect(gameFlowMock.getGameThrows).not.toHaveBeenCalled();
  });

  it("should call getGameThrows with URL param gameId when route has an id and no invitation", async () => {
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("currentGameId", 42);
    mockLobbyGame(42);

    await act(async () => {
      renderHook(() => useStartPage());
    });

    // restore fires because gameIdParam is present and invitation is absent
    await waitFor(() => {
      expect(gameFlowMock.getGameThrows).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    });
  });

  it("should redirect away when URL gameId does not match currentGameId in store", async () => {
    // URL says game 42, but store says active game is 77 — stale deep-link scenario
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("currentGameId", 77);
    // Restore effect will detect the mismatch and redirect before calling getGameThrows
    // No lobby mock needed — redirect fires synchronously in the restore logic

    await act(async () => {
      renderHook(() => useStartPage());
    });

    expect(navigateMock).toHaveBeenCalledWith("/start/77", { replace: true });
  });

  it("should redirect to bare /start when URL gameId is present but store has no currentGameId", async () => {
    // Deep-link to /start/42 with no session state → user has no active game
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("currentGameId", null);

    await act(async () => {
      renderHook(() => useStartPage());
    });

    expect(navigateMock).toHaveBeenCalledWith("/start", { replace: true });
  });

  it("should redirect away when game status is not lobby after restore", async () => {
    // Game 42 is already started — user shouldn't land in its lobby view.
    // Use mockResolvedValueOnce so that after the first successful redirect the
    // restore-effect re-run (triggered by isRestoring → false) gets a
    // never-resolving promise, keeping isRestoring=true and breaking the loop.
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("currentGameId", 42);
    gameFlowMock.getGameThrows
      .mockResolvedValueOnce({ status: "started", id: 42, players: [], settings: null })
      .mockReturnValue(new Promise(() => {})); // never resolves — stops the cycle

    await act(async () => {
      renderHook(() => useStartPage());
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/start/42", { replace: true });
    });
  });

  it("should redirect to currentGameId route when getGameThrows throws a network error", async () => {
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("currentGameId", 42);
    gameFlowMock.getGameThrows
      .mockRejectedValueOnce(new Error("Network error"))
      .mockReturnValue(new Promise(() => {})); // stops the re-run cycle

    await act(async () => {
      renderHook(() => useStartPage());
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/start/42", { replace: true });
    });
  });

  it("should redirect to bare /start when getGameThrows throws and store has no currentGameId", async () => {
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("currentGameId", null);
    // Network error — but currentGameId is null, so no ID in the redirect
    gameFlowMock.getGameThrows
      .mockRejectedValueOnce(new Error("Network error"))
      .mockReturnValue(new Promise(() => {})); // stops the re-run cycle

    await act(async () => {
      renderHook(() => useStartPage());
    });

    expect(navigateMock).toHaveBeenCalledWith("/start", { replace: true });
  });

  it("should update currentGameId from invitation API response after successful restore", async () => {
    // The invitation endpoint returns the canonical gameId — that must win over the URL param
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("currentGameId", 42);
    gameFlowMock.getGameThrows.mockResolvedValue({
      status: "lobby",
      id: 42,
      players: [],
      settings: null,
    });
    gameFlowMock.getInvitation.mockResolvedValue({
      gameId: 42,
      invitationLink: "/invite/42",
    });

    await act(async () => {
      renderHook(() => useStartPage());
    });

    await waitFor(() => {
      expect(setCurrentGameIdMock).toHaveBeenCalledWith(42);
    });
  });
});

describe("useStartPage — restore effect abort handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGameFlowMocks();
    defaultStoreState();
    useParamsMock.mockReturnValue({ id: "42" });
    storeValues.set("currentGameId", 42);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes one AbortSignal through restore requests and aborts it on unmount", async () => {
    gameFlowMock.getGameThrows.mockResolvedValue({
      status: "lobby",
      id: 42,
      players: [],
      settings: null,
    });
    gameFlowMock.getInvitation.mockImplementation(() => new Promise(() => {}));

    const { unmount } = renderHook(() => useStartPage());

    await waitFor(() => {
      expect(gameFlowMock.getInvitation).toHaveBeenCalledTimes(1);
    });

    const restoreSignal = gameFlowMock.getGameThrows.mock.calls[0]?.[1] as AbortSignal | undefined;
    const invitationSignal = gameFlowMock.getInvitation.mock.calls[0]?.[1] as
      | AbortSignal
      | undefined;

    expect(restoreSignal).toBeInstanceOf(AbortSignal);
    expect(invitationSignal).toBe(restoreSignal);

    unmount();

    expect(restoreSignal?.aborted).toBe(true);
    expect(invitationSignal?.aborted).toBe(true);
  });

  it("ignores AbortError from restore requests after cleanup", async () => {
    const pendingRestore = deferred<{
      status: "lobby";
      id: number;
      players: [];
      settings: null;
    }>();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    gameFlowMock.getGameThrows.mockReturnValue(pendingRestore.promise);

    const { unmount } = renderHook(() => useStartPage());

    await waitFor(() => {
      expect(gameFlowMock.getGameThrows).toHaveBeenCalledTimes(1);
    });

    unmount();
    pendingRestore.reject(createAbortError());

    await act(async () => {
      await pendingRestore.promise.catch(() => undefined);
    });

    expect(navigateMock).not.toHaveBeenCalled();
    expect(setInvitationMock).not.toHaveBeenCalled();
    expect(setCurrentGameIdMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
