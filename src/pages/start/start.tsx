import "./start.css";
import React, { useEffect, useRef, useState } from "react";
import NavigationBar from "../../components/NavigationBar/NavigationBar";
import SelectedPlayerItem from "../../components/PlayerItems/SelectedPlayerItem";
import Plus from "../../icons/plus.svg";
import userPLus from "../../icons/user-plus.svg";
import LinkButton from "../../components/LinkButton/LinkButton";
import Button from "../../components/Button/Button";
import "../../components/Button/Button.css";
import Overlay from "../../components/Overlay/Overlay";
import DefaultInputField from "../../components/InputField/DefaultInputField";
import deleteIcon from "../../icons/delete.svg";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useUser } from "../../provider/UserProvider";
import { handleCreateGame } from "../../services/api";
import QRCode from "../../components/QRCode/QRCode";
import { useGamePlayers } from "../../hooks/useGamePlayers";

export type PlayerProps = {
  id: number;
  name: string;
  isAdded?: boolean;
  isClicked?: number | null;
};

function Start() {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const frontendBaseUrl = "http://localhost:5173";

  const { event, updateEvent, functions } = useUser();
  const isFirstRender = useRef(true);
  const previousLivePlayersRef = useRef<Set<number>>(new Set());
  const selectedPlayersRef = useRef(event.selectedPlayers);
  const [invitation, setInvitation] = useState<{
    gameId: number;
    invitationLink: string;
  } | null>(null);

  useEffect(() => {
    selectedPlayersRef.current = event.selectedPlayers;
  }, [event.selectedPlayers]);

  const { players: livePlayers } = useGamePlayers(invitation ? invitation.gameId : null, 3000);

  const handleCreateRoom = async () => {
    try {
      const data = await handleCreateGame();
      setInvitation(data);
    } catch (err) {
      console.error("Error during room creation:", err);
    }
  };

  useEffect(() => {
    if (livePlayers.length > 0) {
      const currentLivePlayerIds = new Set(livePlayers.map((p) => p.id));
      const previousLivePlayerIds = previousLivePlayersRef.current;

      const newPlayers = livePlayers.filter(
        (livePlayer) => !previousLivePlayerIds.has(livePlayer.id),
      );

      if (newPlayers.length > 0) {
        const playersToAdd = newPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          isAdded: true,
        }));

        updateEvent({
          selectedPlayers: [...selectedPlayersRef.current, ...playersToAdd],
        });
      }

      previousLivePlayersRef.current = currentLivePlayerIds;
    }
  }, [livePlayers, updateEvent]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      if (event.list?.length === 0) {
        functions.initializePlayerList();
      } else {
        updateEvent({ selectedPlayers: event.list });
        const playersFromLS = localStorage.getItem("UserUnselected");
        const playersFromLocalStorage = !!playersFromLS && JSON.parse(playersFromLS);
        updateEvent({ unselectedPlayers: playersFromLocalStorage || [] });
      }
    }
  }, [event.list, functions, updateEvent]);

  return (
    <div className="main">
      <Overlay
        className="overlay-box"
        src={deleteIcon}
        isOpen={event.isNewPlayerOverlayOpen}
        onClose={() => {
          updateEvent({ newPlayer: "", isNewPlayerOverlayOpen: false });
        }}
      >
        <div className="create-player-overlay">
          <p className="overlay-heading">New Player</p>
          <DefaultInputField
            name={""}
            value={event.newPlayer}
            placeholder="Playername"
            onChange={functions.handleChange}
            onKeyDown={() => functions.handleKeyPess}
          />
          {event.errormessage && <p id="error-message">{event.errormessage}</p>}
          <Button
            iconStyling="user-plus"
            label="Player Input"
            iconSrc={userPLus}
            handleClick={() => {
              functions.createPlayer(event.newPlayer);
            }}
            link={""}
          />
        </div>
      </Overlay>
      <div className="start">
        <NavigationBar />
        <>
          <div className="existing-player-list">
            <div className="header">
              <h4 className="header-unselected-players">QR Code Invitation</h4>
            </div>
            {invitation && (
              <QRCode
                invitationLink={frontendBaseUrl + invitation.invitationLink}
                gameId={invitation.gameId}
              />
            )}

            <div className="bottom">
              <LinkButton
                className="create-new-player-button h4"
                label="Create Game"
                icon={Plus}
                handleClick={handleCreateRoom}
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
