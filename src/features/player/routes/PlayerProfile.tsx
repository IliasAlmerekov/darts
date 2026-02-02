import { useAuthenticatedUser } from "@/features/auth";
import React from "react";

const PlayerProfile = (): React.JSX.Element => {
  const { user, error } = useAuthenticatedUser();

  if (error) return <div>Fehler: {error}</div>;

  return (
    <div>
      <h1>Spielerprofil</h1>
      {user && (
        <div>
          <p>Benutzername: {JSON.stringify(user)}</p>
          <p>ID: {user.id}</p>
          <p>Rollen: {user.roles.join(", ")}</p>
        </div>
      )}
    </div>
  );
};
export default PlayerProfile;
