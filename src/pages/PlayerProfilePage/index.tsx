import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import React from "react";

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: "Administrator",
  ROLE_PLAYER: "Spieler",
  ROLE_USER: "Benutzer",
};

function getDisplayName(
  nickname?: string | null,
  username?: string | null,
  email?: string | null,
): string {
  const normalizedNickname = nickname?.trim();
  if (normalizedNickname) {
    return normalizedNickname;
  }

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
    <main>
      <h1>Spielerprofil</h1>
      {user && (
        <>
          <section aria-labelledby="profile-identity-heading">
            <h2 id="profile-identity-heading">Identität</h2>
            <p>Benutzername: {getDisplayName(user.profile?.nickname, user.username, user.email)}</p>
            {user.email ? <p>E-Mail: {user.email}</p> : null}
          </section>

          {user.profile ? (
            <section aria-labelledby="profile-stats-heading">
              <h2 id="profile-stats-heading">Statistiken</h2>
              <p>Spiele gespielt: {user.profile.stats.gamesPlayed}</p>
              <p>Durchschnittspunktzahl: {user.profile.stats.scoreAverage}</p>
            </section>
          ) : null}

          <section aria-labelledby="profile-roles-heading">
            <h2 id="profile-roles-heading">Rollen</h2>
            <p>Rollen: {user.roles.length > 0 ? user.roles.map(formatRole).join(", ") : "Keine"}</p>
          </section>
        </>
      )}
    </main>
  );
};

export default PlayerProfilePage;
