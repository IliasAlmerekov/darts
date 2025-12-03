export type CreateGamePayload = {
  previousGameId?: number;
  playerIds?: number[];
};

export const handleCreateGame = async (payload?: CreateGamePayload) => {
  try {
    const body =
      payload && (payload.previousGameId || (payload.playerIds && payload.playerIds.length > 0))
        ? payload
        : {};
    const createResponse = await fetch(`/api/room/create`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        contentType: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!createResponse.ok) {
      throw new Error("Failed to create room");
    }

    const createData = await createResponse.json();

    const inviteResponse = await fetch(`/api/invite/create/${createData.gameId}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!inviteResponse.ok) {
      throw new Error("Failed to create invitation");
    }

    const inviteData = await inviteResponse.json();

    return {
      gameId: inviteData.gameId,
      invitationLink: inviteData.invitationLink,
    };
  } catch (err) {
    console.error("Error during room creation:", err);
    throw err;
  }
};

export const getGamePlayers = async (gameId: number) => {
  try {
    const response = await fetch(`/api/room/${gameId}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch game players");
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching game players:", err);
    throw err;
  }
};

export const deletePlayerFromGame = async (gameId: number, playerId: number) => {
  try {
    const response = await fetch(`/api/room/${gameId}?playerId=${playerId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete player from game");
    }

    return await response.json();
  } catch (err) {
    console.error("Error deleting player from game:", err);
    throw err;
  }
};

export async function createRematch(previousGameId: number): Promise<BASIC.RematchResponse> {
  const response = await fetch(`/api/room/${previousGameId}/rematch`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to create rematch");
  }

  return await response.json();
}

export async function startGame(
  gameId: number,
  config: {
    startScore: number;
    doubleOut: boolean;
    tripleOut: boolean;
    round?: number;
    status?: string;
  },
) {
  const response = await fetch(`/api/game/${gameId}/start`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      contentType: "application/json",
    },
    body: JSON.stringify({
      status: config.status,
      round: config.round,
      startscore: config.startScore,
      doubleout: config.doubleOut,
      tripleout: config.tripleOut,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start game");
  }

  return response.json();
}

export type ThrowRequestPayload = {
  playerId: number;
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
};

/**
 * Records a throw and returns the complete updated game state.
 * No need for a separate GET request after this - the response contains full GameThrowsResponse.
 */
export async function recordThrow(gameId: number, payload: ThrowRequestPayload) {
  const response = await fetch(`/api/game/${gameId}/throw`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      contentType: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to record throw");
  }

  const data = await response.json();
  console.log("Throw recorded successfully", data);
  return data;
}

/**
 * Undoes the last throw and returns the complete updated game state.
 * No need for a separate GET request after this - the response contains full GameThrowsResponse.
 */
export async function undoLastThrow(gameId: number) {
  const response = await fetch(`/api/game/${gameId}/throw`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to undo throw");
  }

  return response.json();
}

export type FinishedPlayerResponse = {
  playerId: number;
  username: string;
  position: number;
  roundsPlayed: number;
  roundAverage: number;
};

export async function getFinishedGame(gameId: number): Promise<FinishedPlayerResponse[]> {
  const response = await fetch(`/api/game/${gameId}/finished`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch finished game");
  }

  return response.json();
}

export async function getPlayerStats(
  limit: number = 10,
  offset: number = 0,
  sort: string = "average:desc",
) {
  const response = await fetch(`/api/players/stats?limit=${limit}&offset=${offset}&sort=${sort}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch player stats");
  }

  return response.json();
}

export async function getGamesOverview(
  limit: number = 9,
  offset: number = 0,
  sort: string = "average:desc",
) {
  const response = await fetch(`/api/games/overview?limit=${limit}&offset=${offset}&sort=${sort}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch games overview");
  }

  return response.json();
}

export type PlayerThrow = {
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
};

export type GameThrowsResponse = {
  id: number;
  status: string;
  currentRound: number;
  activePlayerId: number;
  currentThrowCount: number;
  players: {
    id: number;
    name: string;
    score: number;
    isActive: boolean;
    isBust: boolean;
    position: number;
    throwsInCurrentRound: number;
    currentRoundThrows: PlayerThrow[];
    roundHistory: unknown[];
  }[];
  winnerId: number | null;
  settings: {
    startScore: number;
    doubleOut: boolean;
    tripleOut: boolean;
  };
};

export async function getGameThrows(gameId: number): Promise<GameThrowsResponse> {
  const response = await fetch(`/api/game/${gameId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch game throws");
  }

  return response.json();
}
