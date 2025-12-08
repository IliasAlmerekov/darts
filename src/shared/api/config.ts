export const API_BASE_URL = "/api";

export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/login",
  LOGOUT: "/logout",
  REGISTER: "/register",

  // Game Room
  CREATE_ROOM: "/room/create",
  LEAVE_ROOM: (id: number) => `/room/${id}`,
  SSE_STREAM: (id: number) => `/room/${id}/stream`,
  REMATCH: (id: number) => `/room/${id}/rematch`,

  // Game
  START_GAME: (id: number) => `/game/${id}/start`,
  RECORD_THROW: (id: number) => `/game/${id}/throw`,
  UNDO_THROW: (id: number) => `/game/${id}/throw`,
  GET_GAME: (id: number) => `/game/${id}`,
  GET_GAME_PLAYERS: (id: number) => `/game/${id}/players`,
  GAME_SETTINGS: (id: number) => `/game/${id}/settings`,
  FINISH_GAME: (id: number) => `/game/${id}/finished`,

  // Invitation
  CREATE_INVITE: (id: number) => `/invite/create/${id}`,
  JOIN_INVITE: (uuid: string) => `/invite/join/${uuid}`,

  // Statistics
  GAMES_OVERVIEW: "/games/overview",
  PLAYER_STATS: "/players/stats",
} as const;
