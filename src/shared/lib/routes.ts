export const ROUTES = {
  login: "/",
  register: "/register",
  start: (id?: number) => (id ? `/start/${id}` : "/start"),
  game: (id: number) => `/game/${id}`,
  summary: (id: number) => `/summary/${id}`,
  details: (id: number) => `/details/${id}`,
  gamesOverview: "/gamesoverview",
  settings: (id?: number) => (id ? `/settings/${id}` : "/settings"),
  statistics: "/statistics",
  joined: "/joined",
  playerProfile: "/playerprofile",
} as const;
