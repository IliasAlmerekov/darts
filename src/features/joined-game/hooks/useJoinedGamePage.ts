import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { $currentGameId, setCurrentGameId } from "@/stores/room";
import { leaveRoom } from "@/features/room";
import { logout } from "@/features/auth";

/**
 * Provides logout handling and loading state for the joined game page.
 */
export function useJoinedGamePage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const currentGameId = useStore($currentGameId);

  const handleLogout = async (): Promise<void> => {
    setLoading(true);
    try {
      if (currentGameId) {
        try {
          await leaveRoom(currentGameId);
        } catch (err) {
          console.error("Leave room error:", err);
        } finally {
          setCurrentGameId(null);
        }
      }
      await logout();
      navigate("/?left=1");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleLogout,
  };
}
