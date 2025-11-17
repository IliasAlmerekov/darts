export const createNewGame = async () => {
  try {
    const response = await fetch("http://localhost:8001/room/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Falls du Sessions/Cookies brauchst
    });

    if (response.ok) {
      console.log("Spiel erfolgreich erstellt");
    } else {
      console.error("Fehler beim Erstellen des Spiels");
    }
  } catch (error) {
    console.error("API-Fehler:", error);
  }
};
