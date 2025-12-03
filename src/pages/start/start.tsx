import styles from "./start.module.css";
import React, { useEffect } from "react";
import { useStore } from "@nanostores/react";
import NavigationBar from "../../components/NavigationBar/NavigationBar";
import Plus from "../../icons/plus.svg";
import LinkButton from "../../components/LinkButton/LinkButton";
import Button from "../../components/Button/Button";
import "../../components/Button/Button.css";
import QRCode from "../../components/QRCode/QRCode";
import { useRoomInvitation } from "../../hooks/useRoomInvitation";
import { startGame, deletePlayerFromGame } from "../../services/api";
import { LivePlayersList } from "../../components/LivePlayersList/LivePlayersList";
import { useGamePlayers } from "../../hooks/useGamePlayers";
import { $settings, $lastFinishedGameId, setCurrentGameId } from "../../stores";

function Start(): React.JSX.Element {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const frontendBaseUrl = "http://localhost:5173";

  const settings = useStore($settings);
  const lastFinishedGameId = useStore($lastFinishedGameId);

  const { invitation, createRoom } = useRoomInvitation();

  const gameId = invitation?.gameId ?? null;
  const { count: playerCount } = useGamePlayers(gameId);

  const isDoubleOut = settings.gameMode === "double-out";
  const isTripleOut = settings.gameMode === "triple-out";

  const handleRemovePlayer = async (playerId: number, currentGameId: number) => {
    try {
      await deletePlayerFromGame(currentGameId, playerId);
    } catch (error) {
      console.error("Failed to remove player:", error);
    }
  };

  useEffect(() => {
    if (invitation?.gameId) {
      setCurrentGameId(invitation.gameId);
    }
  }, [invitation?.gameId]);

  const handleStartGame = async () => {
    if (!gameId) return;

    const audio = new Audio(START_SOUND_PATH);
    audio.volume = 0.4;
    audio.play().catch(console.error);

    await startGame(gameId, {
      startScore: settings.points,
      doubleOut: isDoubleOut,
      tripleOut: isTripleOut,
      round: 1,
      status: "started",
    });
  };

  return (
    <div className={styles.main}>
      <div className="start">
        <NavigationBar />
        <>
          <div className="existing-player-list">
            <div className="header">
              <h4 className="header-unselected-players">Login</h4>
            </div>
            <div className="qr-code-section">
              {invitation && (
                <QRCode
                  invitationLink={frontendBaseUrl + invitation.invitationLink}
                  gameId={invitation.gameId}
                />
              )}
            </div>
            <div className="bottom">
              <LinkButton
                className="create-new-player-button h4"
                label={invitation ? "Create New Game" : "Create Game"}
                icon={Plus}
                handleClick={() =>
                  createRoom({
                    previousGameId: lastFinishedGameId ?? undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="added-player-list">
            <LivePlayersList gameId={gameId} onRemovePlayer={handleRemovePlayer} dragEnd={false} />

            <div className="start-btn">
              <Button
                isLink
                label="Start"
                link="/game"
                disabled={playerCount < 2 || !gameId}
                type="secondary"
                handleClick={handleStartGame}
              />
            </div>
          </div>
        </>
      </div>
    </div>
  );
}

export default Start;
