import React from "react";
import { useStore } from "@nanostores/react";
import { $user } from "@/shared/store/auth";
import { $currentGameId } from "@/shared/store";
import styles from "./JoinedGamePage.module.css";

function JoinedGamePage(): React.JSX.Element {
  const user = useStore($user);
  const currentGameId = useStore($currentGameId);

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.header}>
                <span className={styles.checkIcon} aria-hidden="true" />
                <h1 className={styles.title}>Spiel beigetreten</h1>
              </div>

              <div className={styles.info}>
                <p className={styles.welcome}>
                  Willkommen{user?.username != null ? `, ${user.username}` : ""}!
                </p>
                {currentGameId !== null && <p className={styles.gameId}>Spiel #{currentGameId}</p>}
              </div>

              <div className={styles.waiting}>
                <span className={styles.spinner} role="status" aria-label="Warte auf Spielstart" />
                <p className={styles.waitingText}>Warte auf den Start des Spiels…</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinedGamePage;
