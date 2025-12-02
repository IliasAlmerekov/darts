import "./start.css";
import React, { useEffect } from "react";
import NavigationBar from "../../components/NavigationBar/NavigationBar";
import SelectedPlayerItem from "../../components/PlayerItems/SelectedPlayerItem";
import Plus from "../../icons/plus.svg";
import LinkButton from "../../components/LinkButton/LinkButton";
import Button from "../../components/Button/Button";
import "../../components/Button/Button.css";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useUser } from "../../provider/UserProvider";
import QRCode from "../../components/QRCode/QRCode";
import { UseInitializePlayers } from "../../hooks/useInitializePlayers";
import { useRoomInvitation } from "../../hooks/useRoomInvitation";
import { UseSyncLivePlayersWithEvent } from "../../hooks/useSyncLivePlayersWithEvent";
import { startGame } from "../../services/api";

function Start() {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const frontendBaseUrl = "http://localhost:5173";

  const { event, updateEvent, functions } = useUser();

  UseInitializePlayers({ event, updateEvent, functions });

  const { invitation, createRoom } = useRoomInvitation();

  const necessaryGameId = functions.getNecessaryGameId();
  const lastFinishedPlayerIds = functions.getLastFinishedPlayerIds();
  const isDoubleOut = event.selectedGameMode === "double-out";
  const isTripleOutMode = event.selectedGameMode === "triple-out";

  UseSyncLivePlayersWithEvent({
    gameId: necessaryGameId,
    selectedPlayers: event.selectedPlayers,
    updateEvent,
  });

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
                    playerIds: lastFinishedPlayerIds,
                  })
                }
              />
            </div>
          </div>

          <div className="added-player-list">
            <h4 className="header-selected-players">
              Selected Players <div className="listCount">{event.selectedPlayers.length}/10</div>
            </h4>
            <DndContext
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={functions.handleDragEnd}
              onDragMove={() => updateEvent({ dragEnd: false })}
            >
              <div className="selectedPlayerListScroll">
                <SortableContext
                  items={event.selectedPlayers}
                  strategy={verticalListSortingStrategy}
                >
                  {event.selectedPlayers.map(
                    (player: { name: string; id: number }, index: number) => (
                      <SelectedPlayerItem
                        {...player}
                        key={index}
                        user={player}
                        handleClick={() =>
                          functions.handleUnselect(player.id, invitation ? invitation.gameId : null)
                        }
                        alt="Unselect player cross"
                        dragEnd={event.dragEnd}
                      />
                    ),
                  )}
                </SortableContext>
              </div>
            </DndContext>

            <div className="start-btn">
              <Button
                isLink
                label="Start"
                link="/game"
                disabled={event.selectedPlayers.length < 2 || !necessaryGameId}
                type="secondary"
                handleClick={async () => {
                  if (!necessaryGameId) return;
                  functions.playSound(START_SOUND_PATH);
                  await startGame(necessaryGameId, {
                    startScore: event.selectedPoints,
                    doubleOut: isDoubleOut,
                    tripleOut: isTripleOutMode,
                    round: event.roundsCount ?? 0,
                    status: "started",
                  });
                  functions.resetGame();
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
