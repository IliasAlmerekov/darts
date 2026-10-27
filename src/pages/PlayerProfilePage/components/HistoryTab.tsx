import React from "react";
import type { PlayerProfile } from "@/lib/player/profile";
import { ProfileMessage } from "./ProfileMessage";
import styles from "./HistoryTab.module.css";

interface HistoryTabProps {
  profile: PlayerProfile;
}

// Rows are not links: a player cannot read the game summary API.
export function HistoryTab({ profile }: HistoryTabProps): React.JSX.Element {
  if (profile.history.length === 0) {
    return <ProfileMessage>No finished games yet.</ProfileMessage>;
  }

  return (
    <ol className={styles.gameList} aria-label="Recent games">
      {profile.history.map((row) => (
        <li key={row.gameId} className={styles.gameRow}>
          <p className={styles.gameSummary}>
            {row.summary} ·{" "}
            <span role="group" aria-label="three-dart average">
              <span aria-hidden="true">Ø AVG</span> {row.average}
            </span>
          </p>
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
