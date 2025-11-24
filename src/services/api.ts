export const handleCreateGame = async () => {
  try {
    const createResponse = await fetch(`/api/room/create`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
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
      "Content-Type": "application/json",
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
