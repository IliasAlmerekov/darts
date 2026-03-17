// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { startPageLoader } from "./useRoomRestore";

// ── store mocks ───────────────────────────────────────────────────────────────

const setCurrentGameIdMock = vi.fn();
const setGameDataMock = vi.fn();
const setInvitationMock = vi.fn();

const $currentGameIdGet = vi.fn(() => null as number | null);
const $invitationGet = vi.fn(() => null as { gameId: number; invitationLink: string } | null);

vi.mock("@/shared/store", () => ({
  $currentGameId: { get: () => $currentGameIdGet() },
  $invitation: { get: () => $invitationGet() },
  setCurrentGameId: (...args: unknown[]) => setCurrentGameIdMock(...args),
  setGameData: (...args: unknown[]) => setGameDataMock(...args),
  setInvitation: (...args: unknown[]) => setInvitationMock(...args),
}));

// ── API mocks ─────────────────────────────────────────────────────────────────

const getGameThrowsMock = vi.fn();
const getInvitationMock = vi.fn();

vi.mock("@/shared/api/game", () => ({
  getGameThrows: (...args: unknown[]) => getGameThrowsMock(...args),
}));

vi.mock("@/shared/api/room", () => ({
  getInvitation: (...args: unknown[]) => getInvitationMock(...args),
}));

// ── logger mock ───────────────────────────────────────────────────────────────

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { warn: vi.fn(), error: vi.fn() },
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeArgs(
  id?: string,
  signal?: AbortSignal,
): { params: Record<string, string | undefined>; request: Request } {
  return {
    params: { id },
    request: new Request(`http://localhost/start${id ? `/${id}` : ""}`, signal ? { signal } : {}),
  };
}

function lobbyGame(gameId: number) {
  return { status: "lobby" as const, id: gameId, players: [], settings: null };
}

function redirectLocation(result: unknown): string | null {
  if (!(result instanceof Response)) return null;
  return result.headers.get("Location");
}

// ── global reset — runs before every test ────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  $currentGameIdGet.mockReturnValue(null);
  $invitationGet.mockReturnValue(null);
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("startPageLoader — no gameId in URL", () => {
  it("returns null when URL has no id param", async () => {
    const result = await startPageLoader(makeArgs());
    expect(result).toBeNull();
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it("returns null when URL id param is invalid", async () => {
    const result = await startPageLoader(makeArgs("abc"));
    expect(result).toBeNull();
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });
});

describe("startPageLoader — invitation already loaded", () => {
  it("returns null without fetching when invitation.gameId matches URL gameId", async () => {
    $invitationGet.mockReturnValue({ gameId: 42, invitationLink: "/invite/42" });

    const result = await startPageLoader(makeArgs("42"));

    expect(result).toBeNull();
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });
});

describe("startPageLoader — redirect cases (before fetch)", () => {
  it("redirects to active game when URL gameId does not match currentGameId", async () => {
    $currentGameIdGet.mockReturnValue(77);

    const result = await startPageLoader(makeArgs("42"));

    expect(redirectLocation(result)).toBe("/start/77");
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });

  it("redirects to /start when URL has gameId but store has no currentGameId", async () => {
    $currentGameIdGet.mockReturnValue(null);

    const result = await startPageLoader(makeArgs("42"));

    expect(redirectLocation(result)).toBe("/start");
    expect(getGameThrowsMock).not.toHaveBeenCalled();
  });
});

describe("startPageLoader — fetch and store update", () => {
  beforeEach(() => {
    $currentGameIdGet.mockReturnValue(42);
    getGameThrowsMock.mockResolvedValue(lobbyGame(42));
    getInvitationMock.mockResolvedValue({ gameId: 42, invitationLink: "/invite/42" });
  });

  it("calls getGameThrows with gameId and an AbortSignal", async () => {
    await startPageLoader(makeArgs("42"));

    expect(getGameThrowsMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
  });

  it("passes the same AbortSignal to both getGameThrows and getInvitation", async () => {
    await startPageLoader(makeArgs("42"));

    const throwsSignal = getGameThrowsMock.mock.calls[0]?.[1] as AbortSignal | undefined;
    const invitationSignal = getInvitationMock.mock.calls[0]?.[1] as AbortSignal | undefined;

    expect(throwsSignal).toBeInstanceOf(AbortSignal);
    expect(invitationSignal).toBe(throwsSignal);
  });

  it("calls setGameData with fetched game data", async () => {
    await startPageLoader(makeArgs("42"));

    expect(setGameDataMock).toHaveBeenCalledWith(lobbyGame(42));
  });

  it("calls setInvitation and setCurrentGameId after successful fetch", async () => {
    await startPageLoader(makeArgs("42"));

    expect(setInvitationMock).toHaveBeenCalledWith({ gameId: 42, invitationLink: "/invite/42" });
    expect(setCurrentGameIdMock).toHaveBeenCalledWith(42);
  });

  it("returns null on full success", async () => {
    const result = await startPageLoader(makeArgs("42"));
    expect(result).toBeNull();
  });
});

describe("startPageLoader — redirect when game not in lobby", () => {
  it("redirects to active game route when game status is not lobby", async () => {
    $currentGameIdGet.mockReturnValue(42);
    getGameThrowsMock.mockResolvedValue({ status: "started", id: 42, players: [], settings: null });

    const result = await startPageLoader(makeArgs("42"));

    expect(redirectLocation(result)).toBe("/start/42");
    expect(setGameDataMock).not.toHaveBeenCalled();
  });
});

describe("startPageLoader — getGameThrows error handling", () => {
  beforeEach(() => {
    $currentGameIdGet.mockReturnValue(42);
  });

  it("redirects to active game route on network error", async () => {
    getGameThrowsMock.mockRejectedValue(new Error("Network error"));

    const result = await startPageLoader(makeArgs("42"));

    expect(redirectLocation(result)).toBe("/start/42");
  });

  it("re-throws AbortError so React Router can handle navigation cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    getGameThrowsMock.mockRejectedValue(controller.signal.reason as unknown);

    await expect(startPageLoader(makeArgs("42", controller.signal))).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

describe("startPageLoader — getInvitation error handling", () => {
  beforeEach(() => {
    $currentGameIdGet.mockReturnValue(42);
    getGameThrowsMock.mockResolvedValue(lobbyGame(42));
  });

  it("falls back to setCurrentGameId(gameId) when getInvitation fails", async () => {
    getInvitationMock.mockRejectedValue(new Error("Network error"));

    const result = await startPageLoader(makeArgs("42"));

    expect(result).toBeNull();
    expect(setGameDataMock).toHaveBeenCalled();
    expect(setCurrentGameIdMock).toHaveBeenCalledWith(42);
    expect(setInvitationMock).not.toHaveBeenCalled();
  });

  it("re-throws AbortError from getInvitation", async () => {
    const controller = new AbortController();
    controller.abort();
    getInvitationMock.mockRejectedValue(controller.signal.reason as unknown);

    await expect(startPageLoader(makeArgs("42", controller.signal))).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
