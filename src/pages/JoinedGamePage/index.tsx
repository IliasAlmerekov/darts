import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { useRoomStream } from "@/shared/hooks/useRoomStream";
import { $currentGameId, $user } from "@/shared/store";
import styles from "./JoinedGamePage.module.css";

function JoinedGamePage(): React.JSX.Element {
  const user = useStore($user);
  const currentGameId = useStore($currentGameId);
  const { event } = useRoomStream(currentGameId);
  const [hasGameStarted, setHasGameStarted] = useState(false);

  useEffect(() => {
    setHasGameStarted(false);
  }, [currentGameId]);

  useEffect(() => {
    if (event?.type === "game-started") {
      setHasGameStarted(true);
    }
  }, [event?.type]);

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.header}>
                <span className={styles.checkIcon} aria-hidden="true" />
                <h1 className={styles.title}>Joined game</h1>
              </div>

              <div className={styles.info}>
                <p className={styles.welcome}>
                  Welcome{user?.username != null ? `, ${user.username}` : ""}!
                </p>
                {currentGameId !== null && <p className={styles.gameId}>Game #{currentGameId}</p>}
              </div>

              {hasGameStarted ? (
                <p className={styles.waitingText}>Game has started.</p>
              ) : (
                <div className={styles.waiting}>
                  <span
                    className={styles.spinner}
                    role="status"
                    aria-label="Waiting for game start"
                  />
                  <p className={styles.waitingText}>Waiting for the game to start...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinedGamePage;
