import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { ROUTES } from "@/lib/router/routes";
import { ErrorState } from "@/shared/ui/error-state";
import { LogoutButton } from "@/shared/ui/logout-button";
import { useWaitingRoom, type WaitingRoomStatus } from "./useWaitingRoom";
import styles from "./JoinedGamePage.module.css";

interface GameStatusProps {
  status: WaitingRoomStatus;
  isConnectionLost: boolean;
}

function GameStatus({ status, isConnectionLost }: GameStatusProps): React.JSX.Element {
  const hasStarted = status.kind === "started";

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
          <p className={styles.waitingText}>Connection lost. Trying again…</p>
        ) : null}
      </div>
    </div>
  );
}

function JoinedGamePage(): React.JSX.Element {
  const { user } = useAuthenticatedUser();
  const { status, isConnectionLost } = useWaitingRoom();
  const navigate = useNavigate();

  if (status.kind === "no-game") {
    return <Navigate to={ROUTES.playerProfile} replace />;
  }

  const gameId = status.kind === "waiting" || status.kind === "started" ? status.gameId : null;

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

              {status.kind === "removed" ? (
                <ErrorState
                  title="You are no longer in this game"
                  message="Ask the admin for a new invite link to join again."
                  primaryAction={{
                    label: "Go to my profile",
                    onClick: () => navigate(ROUTES.playerProfile),
                  }}
                />
              ) : (
                <GameStatus status={status} isConnectionLost={isConnectionLost} />
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
