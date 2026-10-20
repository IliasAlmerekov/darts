import React from "react";
import type { PlayerProfile } from "@/lib/player/profile";
import styles from "./HistoryTab.module.css";

interface HistoryTabProps {
  profile: PlayerProfile;
}

// Rows are not links: a player cannot read the game summary API.
export function HistoryTab({ profile }: HistoryTabProps): React.JSX.Element {
  if (profile.history.length === 0) {
    return <p className={styles.emptyHistory}>No finished games yet.</p>;
  }

  return (
    <ol className={styles.gameList} aria-label="Recent games">
      {profile.history.map((row) => (
        <li key={row.gameId} className={styles.gameRow}>
          <p className={styles.gameSummary}>{row.summary}</p>
          <ol className={styles.participantList} aria-label="Participants">
            {row.participants.map((participant) => (
              <li key={participant.key}>{participant.label}</li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
