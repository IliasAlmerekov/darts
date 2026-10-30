import * as v from "valibot";
import { apiClient } from "./client";
import { GAME_ENDPOINT } from "./endpoints";
import { ApiError } from "./errors";
import {
  gameStatusSchema,
  gameThrowsResponseSchema,
  integerSchema,
  playerThrowSchema,
  successMessageResponseSchema,
  type SuccessMessageResponse,
} from "./schemas";
import { clientLogger } from "@/shared/services/browser/clientLogger";

// Throws and rematch are internal files behind this module; consumers import them from here.
export * from "./throws";
export * from "./rematch";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const START_GAME_ENDPOINT = (id: number) => `/game/${id}/start`;
const FINISHED_GAME_ENDPOINT = (id: number) => `/game/${id}/finished`;
const REOPEN_GAME_ENDPOINT = (id: number) => `/game/${id}/reopen`;
const ABORT_GAME_ENDPOINT = (id: number) => `/game/${id}/abort`;
const GAME_SETTINGS_ENDPOINT = (id: number) => `/game/${id}/settings`;
const TABLET_GAME_ENDPOINT = "/tablet/game";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Contract `TabletGameResponseDto`: the game in the lobby or started, if any. */
const tabletGameResponseSchema = v.object({
  game: v.nullable(
    v.object({
      id: integerSchema,
      status: v.picklist(["lobby", "started"]),
    }),
  ),
  lastFinishedGameId: v.nullable(integerSchema),
});

/** Contract `GameSettingsResponseDto`. */
const gameSettingsResponseSchema = v.object({
  gameId: integerSchema,
  startScore: integerSchema,
  doubleOut: v.boolean(),
  tripleOut: v.boolean(),
  status: v.string(),
});

/** Contract `GameSummaryResponseDto`. */
const gameSummaryEnvelopeSchema = v.object({
  gameId: integerSchema,
  finishedAt: v.optional(v.nullable(v.string())),
  winner: v.optional(
    v.nullable(
      v.object({
        id: integerSchema,
        username: v.optional(v.nullable(v.string())),
      }),
    ),
  ),
  winnerRoundsPlayed: integerSchema,
  winnerRoundAverage: v.number(),
  finishedPlayers: v.array(
    v.object({
      playerId: v.optional(v.nullable(integerSchema)),
      username: v.optional(v.nullable(v.string())),
      position: v.optional(v.nullable(integerSchema)),
      placement: v.optional(v.nullable(integerSchema)),
      roundsPlayed: v.optional(v.nullable(integerSchema)),
      roundAverage: v.number(),
    }),
  ),
});

type GameStatus = v.InferOutput<typeof gameStatusSchema>;
export type PlayerThrow = v.InferOutput<typeof playerThrowSchema>;
export type GameThrowsResponse = v.InferOutput<typeof gameThrowsResponseSchema>;
export type TabletGameResponse = v.InferOutput<typeof tabletGameResponseSchema>;
export type TabletGame = NonNullable<TabletGameResponse["game"]>;
export type GameSettingsResponse = v.InferOutput<typeof gameSettingsResponseSchema>;

/** The three rules a game is played with, as the game state carries them. */
export type GameSettings = GameThrowsResponse["settings"];
export type BackendPlayer = GameThrowsResponse["players"][number];
export type BackendRoundHistory = BackendPlayer["roundHistory"][number];

export interface StartGameRequest {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
  round?: number;
  status?: GameStatus;
}

export interface CreateGameSettingsPayload {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
}

export type UpdateGameSettingsPayload = Partial<CreateGameSettingsPayload>;

export interface FinishedPlayerResponse {
  playerId: number;
  username: string;
  position: number;
  placement: number | null;
  roundsPlayed: number;
  roundAverage: number;
}

export type GameSummaryResponse = FinishedPlayerResponse[];

function toFinishedPlayer(
  item: v.InferOutput<typeof gameSummaryEnvelopeSchema>["finishedPlayers"][number],
  index: number,
  gameId: number,
): FinishedPlayerResponse {
  if (typeof item.roundsPlayed !== "number") {
    clientLogger.warn("game.finished-player.rounds-played.missing", {
      context: { gameId, playerId: item.playerId ?? null, index },
    });
  }

  return {
    playerId: item.playerId ?? index + 1,
    username:
      typeof item.username === "string" && item.username.trim().length > 0
        ? item.username
        : `Player ${index + 1}`,
    position: item.position ?? index,
    placement: item.placement ?? index + 1,
    roundsPlayed: item.roundsPlayed ?? 0,
    roundAverage: item.roundAverage,
  };
}

function toGameSummary(
  summary: v.InferOutput<typeof gameSummaryEnvelopeSchema>,
  gameId: number,
): GameSummaryResponse {
  return summary.finishedPlayers.map((item, index) => toFinishedPlayer(item, index, gameId));
}

/**
 * Fetches the current game state including throws and players.
 */
export async function getGameThrows(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameThrowsResponse> {
  return apiClient.get(GAME_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: gameThrowsResponseSchema,
  });
}

/**
 * Reads the tablet game and the last finished game. Admin only.
 */
export async function getTabletGame(signal?: AbortSignal): Promise<TabletGameResponse> {
  return apiClient.get(TABLET_GAME_ENDPOINT, {
    ...(signal ? { signal } : {}),
    validate: tabletGameResponseSchema,
  });
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

/**
 * Starts a game with the provided settings.
 */
export async function startGame(gameId: number, config: StartGameRequest): Promise<void> {
  await apiClient.post(
    START_GAME_ENDPOINT(gameId),
    {
      startScore: config.startScore,
      doubleOut: config.doubleOut,
      tripleOut: config.tripleOut,
    },
    {
      validate: gameThrowsResponseSchema,
    },
  );
}

/**
 * Fetches final standings for a finished game.
 */
export async function getFinishedGame(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameSummaryResponse> {
  const summary = await apiClient.get(FINISHED_GAME_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: gameSummaryEnvelopeSchema,
  });
  return toGameSummary(summary, gameId);
}

/**
 * Reopens a finished game and returns the updated game state.
 */
export async function reopenGame(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.patch(REOPEN_GAME_ENDPOINT(gameId), undefined, {
    validate: gameThrowsResponseSchema,
  });
}

/**
 * Aborts the specified game on the server.
 */
export async function abortGame(gameId: number): Promise<SuccessMessageResponse> {
  return apiClient.patch(ABORT_GAME_ENDPOINT(gameId), undefined, {
    validate: successMessageResponseSchema,
  });
}

// ---------------------------------------------------------------------------
// Game settings
// ---------------------------------------------------------------------------

/**
 * Fetches the canonical settings for a game by its id.
 * Used to retrieve the original rules before starting a rematch.
 */
export async function getGameSettings(
  gameId: number,
  signal?: AbortSignal,
): Promise<GameSettingsResponse> {
  return apiClient.get(GAME_SETTINGS_ENDPOINT(gameId), {
    ...(signal ? { signal } : {}),
    validate: gameSettingsResponseSchema,
  });
}

/**
 * Updates settings for an existing game.
 */
export async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameSettingsResponse> {
  return apiClient.patch(GAME_SETTINGS_ENDPOINT(gameId), payload, {
    validate: gameSettingsResponseSchema,
  });
}

/**
 * Saves settings for an existing game and rejects when game id is missing.
 */
export async function saveGameSettings(
  payload: UpdateGameSettingsPayload,
  gameId?: number | null,
): Promise<GameSettingsResponse> {
  if (typeof gameId !== "number" || !Number.isFinite(gameId)) {
    throw new ApiError("Cannot save game settings without an active gameId", {
      status: 400,
      data: payload,
    });
  }

  return updateGameSettings(gameId, payload);
}
