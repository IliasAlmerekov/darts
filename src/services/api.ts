const API_BASE_URL = "http://localhost:8001";

export const handleCreateGame = async () => {
  try {
    const createResponse = await fetch(`${API_BASE_URL}/room/create`, {
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

    const inviteResponse = await fetch(`${API_BASE_URL}/invite/create/${createData.gameId}`, {
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
    const response = await fetch(`${API_BASE_URL}/room/${gameId}`, {
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
