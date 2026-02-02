import { useState } from "react";

export function useJoinedGamePage() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async (): Promise<void> => {
    setLoading(true);
    try {
      await fetch(`api/logout`, {
        method: "POST",
        credentials: "include",
      });
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
