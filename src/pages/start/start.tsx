import "./start.css";
import React, { useEffect } from "react";
import NavigationBar from "../../components/NavigationBar/NavigationBar";
import Plus from "../../icons/plus.svg";
import LinkButton from "../../components/LinkButton/LinkButton";
import Button from "../../components/Button/Button";
import "../../components/Button/Button.css";
import { useUser } from "../../provider/UserProvider";
import QRCode from "../../components/QRCode/QRCode";
import { useRoomInvitation } from "../../hooks/useRoomInvitation";
import { startGame, deletePlayerFromGame } from "../../services/api";
import { LivePlayersList } from "../../components/LivePlayersList/LivePlayersList";
import { useGamePlayers } from "../../hooks/useGamePlayers";

function Start(): React.JSX.Element {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const frontendBaseUrl = "http://localhost:5173";

  const { event, updateEvent, functions } = useUser();

  const { invitation, createRoom } = useRoomInvitation();

  const necessaryGameId = functions.getNecessaryGameId?.() ?? invitation?.gameId ?? null;
  const { count: playerCount } = useGamePlayers(necessaryGameId);

  const isDoubleOut = event.selectedGameMode === "double-out";
  const isTripleOutMode = event.selectedGameMode === "triple-out";

  const handleRemovePlayer = async (playerId: number, gameId: number) => {
    try {
      await deletePlayerFromGame(gameId, playerId);
    } catch (error) {
      console.error("Failed to remove player:", error);
    }
  };

  useEffect(() => {
    if (invitation?.gameId) {
      updateEvent({ currentGameId: invitation.gameId });
    }
  }, [invitation?.gameId, updateEvent]);

  return (
    <div className="main">
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
                    previousGameId: event.lastFinishedGameId ?? undefined,
                    //playerIds: lastFinishedPlayerIds,
                  })
                }
              />
            </div>
          </div>

          <div className="added-player-list">
            <LivePlayersList
              gameId={necessaryGameId}
              onRemovePlayer={handleRemovePlayer}
              dragEnd={event.dragEnd}
            />

            <div className="start-btn">
              <Button
                isLink
                label="Start"
                link="/game"
                disabled={playerCount < 2 || !necessaryGameId}
                type="secondary"
                handleClick={async () => {
                  if (!necessaryGameId) return;
                  functions.playSound?.(START_SOUND_PATH);
                  await startGame(necessaryGameId, {
                    startScore: event.selectedPoints,
                    doubleOut: isDoubleOut,
                    tripleOut: isTripleOutMode,
                    round: 1,
                    status: "started",
                  });
                  functions.resetGame?.();
                }}
              />
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
export default Start;
