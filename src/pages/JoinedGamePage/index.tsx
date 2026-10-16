import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { ROUTES } from "@/lib/router/routes";
import { ErrorState } from "@/shared/ui/error-state";
import { LogoutButton } from "@/shared/ui/logout-button";
import { gameIdOf } from "./lib/waitingRoomView";
import { useWaitingRoom } from "./useWaitingRoom";
import styles from "./JoinedGamePage.module.css";

interface GameStatusProps {
  hasStarted: boolean;
  isConnectionLost: boolean;
}

function GameStatus({ hasStarted, isConnectionLost }: GameStatusProps): React.JSX.Element {
  return (
    <div className={styles.waiting}>
      {hasStarted ? (
        <span className={styles.startedMark} aria-hidden="true" />
      ) : (
        <span className={styles.spinner} aria-hidden="true" />
      )}
      <div role="status" className={styles.statusText}>
        {hasStarted ? (
          <>
            <p className={styles.startedTitle}>The game has started</p>
            <p className={styles.waitingText}>Follow your score on the tablet</p>
          </>
        ) : (
          <p className={styles.waitingText}>Waiting for the game to start...</p>
        )}
        {isConnectionLost && !hasStarted ? (
          <p className={styles.connectionLost}>Connection lost. Trying again…</p>
        ) : null}
      </div>
    </div>
  );
}

function JoinedGamePage(): React.JSX.Element {
  const { user } = useAuthenticatedUser();
  const { view, isConnectionLost } = useWaitingRoom();
  const navigate = useNavigate();

  if (view.kind === "no-game") {
    return <Navigate to={ROUTES.playerProfile} replace />;
  }

  const gameId = gameIdOf(view);

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
                {gameId !== null && <p className={styles.gameId}>Game #{gameId}</p>}
              </div>

              {view.kind === "removed" ? (
                <ErrorState
                  title="You are no longer in this game"
                  message="Ask the admin for a new invite link to join again."
                  primaryAction={{
                    label: "Go to my profile",
                    onClick: () => navigate(ROUTES.playerProfile),
                  }}
                />
              ) : (
                <GameStatus
                  hasStarted={view.kind === "started"}
                  isConnectionLost={isConnectionLost}
                />
              )}

              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinedGamePage;
