export interface PaginatedRequest {
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface CreateRoomResponse {
  gameId: number;
  invitationLink: string;
}

export interface StartGameRequest {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
  round?: number;
  status?: string;
}

export interface ThrowRequest {
  playerId: number;
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
}
