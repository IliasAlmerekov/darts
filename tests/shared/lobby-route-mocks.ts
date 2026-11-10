import type { Page, Route } from "@playwright/test";
import { fulfillJson } from "./json-response";
import { fulfillRoomStream, isRoomStreamUrl } from "./room-stream-mocks";

interface LobbyPlayer {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  isGuest: boolean;
  position: number | null;
  throwsInCurrentRound: number;
  currentRoundThrows: [];
  roundHistory: [];
}

interface LobbySettings {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
}

const DEFAULT_LOBBY_GAME_ID = 101;
const FIRST_GUEST_PLAYER_ID = 1001;

function matchPath(pattern: RegExp): (url: URL) => boolean {
  return (url) => pattern.test(url.pathname);
}

/**
 * Mirrors the backend's `nextPosition`: one past the highest seat position, or the seat
 * count plus one when no seat has a position. A reorder stores the positions the client
 * sends, so after one the next guest follows the client's 0-based order.
 */
function nextPosition(players: LobbyPlayer[]): number {
  const positions = players.flatMap(({ position }) => (position === null ? [] : [position]));
  return positions.length > 0 ? Math.max(...positions) + 1 : players.length + 1;
}

function lastPathSegmentAsId(route: Route): number {
  return Number(new URL(route.request().url()).pathname.split("/").pop());
}

/**
 * In-memory backend for the start page: create a room, add guests, start the game.
 * Every room id is served, so specs that mock `/api/room/create` with their own id still work.
 * The tablet game is the room whose invitation the start page loaded last.
 */
export async function mockLobbyApi(page: Page): Promise<void> {
  const players: LobbyPlayer[] = [];
  let settings: LobbySettings = { startScore: 301, doubleOut: false, tripleOut: false };
  let status: "lobby" | "started" = "lobby";
  let tabletGameId: number | null = null;

  const gameState = (gameId: number) => ({
    id: gameId,
    status,
    currentRound: 1,
    activePlayerId: status === "started" ? (players[0]?.id ?? null) : null,
    currentThrowCount: 0,
    players: players.map((player, index) => ({
      ...player,
      isActive: status === "started" && index === 0,
    })),
    winnerId: null,
    settings,
  });

  await page.route(matchPath(/^\/api\/room\/create$/), async (route) => {
    const payload: unknown = route.request().postDataJSON();
    if (typeof payload === "object" && payload !== null) {
      settings = { ...settings, ...payload };
    }
    await fulfillJson(route, { success: true, gameId: DEFAULT_LOBBY_GAME_ID });
  });

  await page.route(matchPath(/^\/api\/invite\/create\/\d+$/), async (route) => {
    const gameId = lastPathSegmentAsId(route);
    tabletGameId = gameId;
    await fulfillJson(route, {
      success: true,
      gameId,
      invitationLink: `/invite/${gameId}`,
    });
  });

  await page.route(matchPath(/^\/api\/tablet\/game$/), async (route) => {
    await fulfillJson(route, {
      game: tabletGameId === null ? null : { id: tabletGameId, status },
      lastFinishedGameId: null,
    });
  });

  await page.route(matchPath(/^\/api\/game\/\d+$/), async (route) => {
    const gameId = lastPathSegmentAsId(route);
    await fulfillJson(route, gameState(gameId));
  });

  await page.route(isRoomStreamUrl, (route) =>
    fulfillRoomStream(
      route,
      `event: players
data: ${JSON.stringify({ players })}

`,
    ),
  );

  await page.route(matchPath(/^\/api\/room\/\d+\/guest$/), async (route) => {
    const payload: unknown = route.request().postDataJSON();
    const name =
      typeof payload === "object" && payload !== null && "username" in payload
        ? String(payload.username)
        : "Guest";
    const player: LobbyPlayer = {
      id: FIRST_GUEST_PLAYER_ID + players.length,
      name,
      score: settings.startScore,
      isActive: false,
      isBust: false,
      isGuest: true,
      position: nextPosition(players),
      throwsInCurrentRound: 0,
      currentRoundThrows: [],
      roundHistory: [],
    };
    players.push(player);
    await fulfillJson(route, {
      success: true,
      player: { id: player.id, name: player.name, isGuest: true },
    });
  });

  await page.route(matchPath(/^\/api\/room\/\d+\/positions$/), async (route) => {
    const payload: unknown = route.request().postDataJSON();
    const positions =
      typeof payload === "object" && payload !== null && "positions" in payload
        ? payload.positions
        : [];
    if (Array.isArray(positions)) {
      // Keep the new order, so a later game read or stream event does not undo the reorder.
      for (const entry of positions) {
        if (typeof entry !== "object" || entry === null) continue;
        const player = players.find(
          (candidate) => "playerId" in entry && candidate.id === entry.playerId,
        );
        if (player && "position" in entry && typeof entry.position === "number") {
          player.position = entry.position;
        }
      }
      players.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    await fulfillJson(route, { success: true });
  });

  await page.route(matchPath(/^\/api\/game\/\d+\/settings$/), async (route) => {
    const payload: unknown = route.request().postDataJSON();
    if (route.request().method() === "PATCH" && typeof payload === "object" && payload !== null) {
      settings = { ...settings, ...payload };
    }
    const gameId = Number(new URL(route.request().url()).pathname.split("/").at(-2));
    await fulfillJson(route, { gameId, ...settings, status });
  });

  await page.route(matchPath(/^\/api\/game\/\d+\/start$/), async (route) => {
    status = "started";
    const gameId = Number(new URL(route.request().url()).pathname.split("/").at(-2));
    await fulfillJson(route, gameState(gameId));
  });
}
