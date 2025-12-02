export async function getGameStates(gameId: number) {
  const response = await fetch(`api/games/${gameId}`, {
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
