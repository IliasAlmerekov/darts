import "./start.css";
import React from "react";
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

function Start() {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const frontendBaseUrl = "http://localhost:5173";

  const { event, updateEvent, functions } = useUser();

  // Initialize Players on first render
  UseInitializePlayers({ event, updateEvent, functions });

  // Invitation and handling room creation
  const { invitation, createRoom } = useRoomInvitation();

  // Auto-sync live players with event selected players
  UseSyncLivePlayersWithEvent({
    gameId: invitation?.gameId ?? null,
    selectedPlayers: event.selectedPlayers,
    updateEvent,
  });

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
                handleClick={createRoom}
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
                        handleClick={() => functions.handleUnselect(player.name, player.id)}
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
                disabled={event.selectedPlayers.length < 2}
                type="secondary"
                handleClick={() => {
                  functions.addUnselectedUserListToLs(event.unselectedPlayers);
                  functions.playSound(START_SOUND_PATH);
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
