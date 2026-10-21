import type { Page, Route } from "@playwright/test";
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

function jsonResponse(route: Route, body: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function matchPath(pattern: RegExp): (url: URL) => boolean {
  return (url) => pattern.test(url.pathname);
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
    await jsonResponse(route, { success: true, gameId: DEFAULT_LOBBY_GAME_ID });
  });

  await page.route(matchPath(/^\/api\/invite\/create\/\d+$/), async (route) => {
    const gameId = lastPathSegmentAsId(route);
    tabletGameId = gameId;
    await jsonResponse(route, {
      success: true,
      gameId,
      invitationLink: `/invite/${gameId}`,
    });
  });

  await page.route(matchPath(/^\/api\/tablet\/game$/), async (route) => {
    await jsonResponse(route, {
      game: tabletGameId === null ? null : { id: tabletGameId, status },
      lastFinishedGameId: null,
    });
  });

  await page.route(matchPath(/^\/api\/game\/\d+$/), async (route) => {
    const gameId = lastPathSegmentAsId(route);
    await jsonResponse(route, gameState(gameId));
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
      position: players.length + 1,
      throwsInCurrentRound: 0,
      currentRoundThrows: [],
      roundHistory: [],
    };
    players.push(player);
    await jsonResponse(route, { success: true, player: { id: player.id, name: player.name } });
  });

  await page.route(matchPath(/^\/api\/room\/\d+\/positions$/), async (route) => {
    await jsonResponse(route, { success: true });
  });

  await page.route(matchPath(/^\/api\/game\/\d+\/settings$/), async (route) => {
    const payload: unknown = route.request().postDataJSON();
    if (route.request().method() === "PATCH" && typeof payload === "object" && payload !== null) {
      settings = { ...settings, ...payload };
    }
    const gameId = Number(new URL(route.request().url()).pathname.split("/").at(-2));
    await jsonResponse(route, { gameId, ...settings, status });
  });

  await page.route(matchPath(/^\/api\/game\/\d+\/start$/), async (route) => {
    status = "started";
    await jsonResponse(route, { success: true });
  });
}
