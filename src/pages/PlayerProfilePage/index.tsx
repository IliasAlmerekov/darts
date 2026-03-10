import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import React from "react";

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: "Administrator",
  ROLE_PLAYER: "Spieler",
  ROLE_USER: "Benutzer",
};

function getDisplayName(username?: string | null, email?: string | null): string {
  const normalizedUsername = username?.trim();
  if (normalizedUsername) {
    return normalizedUsername;
  }

  const normalizedEmail = email?.trim();
  if (normalizedEmail) {
    return normalizedEmail;
  }

  return "Nicht angegeben";
}

function formatRole(role: string): string {
  const knownRoleLabel = ROLE_LABELS[role];
  if (knownRoleLabel) {
    return knownRoleLabel;
  }

  const normalizedRole = role
    .replace(/^ROLE_/, "")
    .toLowerCase()
    .replace(/_/g, " ");
  return normalizedRole.replace(/\b\w/g, (character) => character.toUpperCase());
}

const PlayerProfilePage = (): React.JSX.Element => {
  const { user, error } = useAuthenticatedUser();

  if (error) return <div>Fehler: {error}</div>;

  return (
    <div>
      <h1>Spielerprofil</h1>
      {user && (
        <div>
          <p>Benutzername: {getDisplayName(user.username, user.email)}</p>
          {user.email ? <p>E-Mail: {user.email}</p> : null}
          <p>Rollen: {user.roles.length > 0 ? user.roles.map(formatRole).join(", ") : "Keine"}</p>
        </div>
      )}
    </div>
  );
};

export default PlayerProfilePage;
