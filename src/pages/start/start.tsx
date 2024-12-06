import "./start.css";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import UnselectedPlayerItem from "../../components/PlayerItems/UnselectedPlayerItem";
import SelectedPlayerItem from "../../components/PlayerItems/SelectedPlayerItem";
import Plus from "../../icons/plus.svg";
import Madebydeepblue from "../../icons/madeByDeepblue.svg";
import userPLus from "../../icons/user-plus.svg";
import LinkButton from "../../components/LinkButton/LinkButton";
import Button from "../../components/Button/Button";
import "../../components/Button/Button.css";
import settingsCog from "../../icons/settings.svg";
import arrowRight from "../../icons/arrow-right.svg";
import trashIcon from "../../icons/trash-icon.svg";
import Overlay from "../../components/Overlay/Overlay";
import DefaultInputField from "../../components/InputField/DefaultInputField";
import deleteIcon from "../../icons/delete.svg";
import clsx from "clsx";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

export type PlayerProps = {
  id: number;
  name: string;
  isAdded: boolean;
  isClicked?: number | null;
};

export type IProps = {
  list: PlayerProps[];
  setList: Dispatch<SetStateAction<PlayerProps[]>>;
  userList: BASIC.UserProps[];
  addUserToLS: (name: string, id: number) => void;
  deleteUserFromLS: (id: number) => void;
  resetLS: () => void;
  addUnselectedUserListToLs: (unselectedPlayers: PlayerProps[]) => void;
};

function Start({
  list,
  setList,
  userList,
  addUserToLS,
  deleteUserFromLS,
  resetLS,
  addUnselectedUserListToLs,
}: IProps) {
  const [newPlayer, setNewPlayer] = useState("");
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isSettingsCogOpen, setIsSettingsCogOpen] = useState(false);
  const [deletePlayerList, setDeletePlayerList] = useState<PlayerProps[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerProps[]>([]);
  const [unselectedPlayers, setUnselectedPlayers] = useState<PlayerProps[]>([]);
  const [dragEnd, setDragEnd] = useState<boolean>();
  const [clickedPlayerId, setClickedPlayerId] = useState<number | null>(null);
  const [errormessage, setErrorMessage] = useState("");
  const SELECT_PLAYER_SOUND_PATH = "/sounds/select-sound.mp3";
  const UNSELECT_PLAYER_SOUND_PATH = "/sounds/unselect-sound.mp3";
  const ADD_PLAYER_SOUND_PATH = "/sounds/add-player-sound.mp3";
  const ERROR_SOUND_PATH = "/sounds/error-sound.mp3";
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const TRASH_SOUND_PATH = "/sounds/trash-sound.mp3";

  function initializePlayerList() {
    const initialPlayerList: PlayerProps[] = userList.map(
      (user: BASIC.UserProps) => ({
        name: user.name,
        id: user.id,
        isAdded: false,
        isClicked: clickedPlayerId,
      })
    );
    setUnselectedPlayers(initialPlayerList);
  }

  function playSound(path: string) {
    var audio = new Audio(path);
    audio.play();
    audio.volume = 0.4;
  }

  function handleSelectPlayer(name: any, id: number) {
    if (selectedPlayers.length === 10) return;
    setClickedPlayerId(id);
    setTimeout(() => {
      const updatedUnselectedPlayerList = unselectedPlayers.filter(
        (list) => list.id !== id
      );
      const updatedSelectedPlayerList: PlayerProps[] = [
        ...selectedPlayers,
        { name, isAdded: true, id },
      ];
      setUnselectedPlayers(updatedUnselectedPlayerList);
      setSelectedPlayers(updatedSelectedPlayerList);
      setList(updatedSelectedPlayerList);
      playSound(SELECT_PLAYER_SOUND_PATH);
    }, 200);
  }

  function handleKeyPess(name: string, event: any) {
    if (event.key === "Enter") {
      setNewPlayer(name);
      createPlayer(newPlayer);
    }
  }

  function handleUnselect(name: any, id: number) {
    setClickedPlayerId(null);
    const updatedSelectedPlayers = selectedPlayers.filter(
      (list) => list.id !== id
    );
    const updatedUnselectedPlayers: PlayerProps[] = [
      ...unselectedPlayers,
      { name, isAdded: false, id },
    ];
    setSelectedPlayers(updatedSelectedPlayers);
    setUnselectedPlayers(updatedUnselectedPlayers);
    setList(updatedSelectedPlayers);
    playSound(UNSELECT_PLAYER_SOUND_PATH);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDragEnd(true);

    if (over && active.id !== over?.id) {
      const activeIndex = selectedPlayers.findIndex(
        ({ id }) => id === active.id
      );
      const overIndex = selectedPlayers.findIndex(({ id }) => id === over.id);
      const newArray = arrayMove(selectedPlayers, activeIndex, overIndex);
      setSelectedPlayers(newArray);
      setList(newArray);
    }
  }

  function createPlayer(name: string) {
    if (!/^[^\s][a-zA-Z0-9 _-]{2,}$/.test(name)) {
      setErrorMessage(
        "Nickname must contain at least 3 letters or digits and cannot start with a space."
      );
      setNewPlayer("");
      playSound(ERROR_SOUND_PATH);
      return;
    }
    const id = Number(new Date());
    addUserToLS(name, id);

    if (selectedPlayers.length === 10) {
      const updatedUnselectedPlayers = [
        ...unselectedPlayers,
        { name, isAdded: false, id },
      ];
      setUnselectedPlayers(updatedUnselectedPlayers);
    } else {
      const updatedSelectedPlayers = [
        ...selectedPlayers,
        { name, isAdded: true, id },
      ];
      setSelectedPlayers(updatedSelectedPlayers);
      setList(updatedSelectedPlayers);
    }
    setIsOverlayOpen(!isOverlayOpen);
    setNewPlayer("");
    setErrorMessage("");
    playSound(ADD_PLAYER_SOUND_PATH);
  }

  function deletePlayer(name: string, id: number) {
    const updatedPlayerList = deletePlayerList.filter((list) => list.id !== id);
    deleteUserFromLS(id);
    setDeletePlayerList(updatedPlayerList);
  }

  function overlayPlayerlist() {
    const concatPlayerlist = selectedPlayers.concat(unselectedPlayers);
    setDeletePlayerList(concatPlayerlist);
    setIsSettingsCogOpen(!isSettingsCogOpen);
  }

  function updateArray() {
    const newSelectedList: PlayerProps[] = [];
    const newUnselectedList: PlayerProps[] = [];
    deletePlayerList.map((player) => {
      return player.isAdded
        ? newSelectedList.push(player)
        : newUnselectedList.push(player);
    });
    setUnselectedPlayers(newUnselectedList);
    setSelectedPlayers(newSelectedList);
    setIsSettingsCogOpen(!isSettingsCogOpen);
    resetLS();
  }

  useEffect(() => {
    const handleOverlay = () => {
      const deleteOverlayContentEl = document.querySelector(
        ".deleteOverlayContent"
      );
      const overlayBottomEl = document.querySelector(".overlayBottom");
      const overlayBoxEl = document.querySelector(".overlayBox");

      if (!deleteOverlayContentEl || !overlayBottomEl || !overlayBoxEl) return;

      const overlayBoxHeightActual = overlayBoxEl?.clientHeight ?? 0;
      const overlayBottomHeight = overlayBottomEl.clientHeight ?? 0;
      const innerWindowHeight = overlayBoxHeightActual - overlayBottomHeight;

      const deleteOverlayContentBottom =
        deleteOverlayContentEl.getBoundingClientRect()?.bottom ?? 0;

      if (deleteOverlayContentBottom < innerWindowHeight + 60) {
        overlayBottomEl.classList.remove("overlayBottomEnabled");
      }
    };

    handleOverlay();
  }, [deletePlayerList.length, isSettingsCogOpen]);

  useEffect(() => {
    if (list.length === 0) {
      initializePlayerList();
    } else {
      setSelectedPlayers(list);
      const playersFromLS = localStorage.getItem("UserUnselected");
      const playersFromLocalStorage =
        !!playersFromLS && JSON.parse(playersFromLS);
      setUnselectedPlayers(playersFromLocalStorage);
    }
  }, []);

  return (
    <div className="start">
      <div className="existingPlayerList">
        <div className="header">
          <h4 className="headerUnselectedPlayers">
            Unselected <br /> Players
          </h4>
          <img
            className={clsx("settingsCog", {
              hide:
                selectedPlayers.length === 0 && unselectedPlayers.length === 0,
            })}
            src={settingsCog}
            alt=""
            onClick={
              selectedPlayers.length === 0 && unselectedPlayers.length === 0
                ? undefined
                : () => overlayPlayerlist()
            }
          />
        </div>

        {unselectedPlayers.length > 0 && (
          <div
            className={clsx("unselectedPlayers", {
              enabled: selectedPlayers.length === 10,
            })}
          >
            {unselectedPlayers.map((player: PlayerProps, index: number) => {
              return (
                <UnselectedPlayerItem
                  {...player}
                  key={player.id}
                  handleClickOrDelete={() => {
                    handleSelectPlayer(player.name, player.id);
                  }}
                  src={arrowRight}
                  alt="Select player arrow"
                  isClicked={clickedPlayerId === player.id}
                />
              );
            })}
          </div>
        )}

        <div className="bottom">
          <LinkButton
            className="createNewPlayerButton h4"
            label="Create new Player"
            icon={Plus}
            handleClick={() => setIsOverlayOpen(!isOverlayOpen)}
          />
        </div>
      </div>
      <div className="addedPlayerList">
        <img className="deepblueIcon" src={Madebydeepblue} alt="" />
        <h4 className="headerSelectedPlayers">
          Selected Players{" "}
          <div className="listCount">{selectedPlayers.length}/10</div>
        </h4>
        <DndContext
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          onDragMove={() => setDragEnd(false)}
        >
          <SortableContext
            items={selectedPlayers}
            strategy={verticalListSortingStrategy}
          >
            {selectedPlayers.map(
              (player: { name: string; id: number }, index: number) => (
                <SelectedPlayerItem
                  {...player}
                  key={index}
                  user={player}
                  handleClick={() => handleUnselect(player.name, player.id)}
                  alt="Unselect player cross"
                  dragEnd={dragEnd}
                />
              )
            )}
          </SortableContext>
        </DndContext>
        <div className="startBtn">
          <Button
            isLink
            label="Start"
            link="/game"
            disabled={selectedPlayers.length < 2}
            type="secondary"
            handleClick={() => {
              addUnselectedUserListToLs(unselectedPlayers);
              playSound(START_SOUND_PATH);
            }}
          />
        </div>
      </div>

      <Overlay
        className="overlayBox deletePlayerOverlayAdjust"
        src={deleteIcon}
        isOpen={isSettingsCogOpen}
        onClose={() => setIsSettingsCogOpen(!isSettingsCogOpen)}
      >
        <div className="deletePlayerOverlay">
          <p className="overlayHeading">Delete Player</p>
          <div className="deleteOverlayContent">
            {deletePlayerList.map(
              (player: { name: string; id: number }, index: number) => (
                <UnselectedPlayerItem
                  {...player}
                  key={index}
                  handleClickOrDelete={() => {
                    playSound(TRASH_SOUND_PATH);
                    deletePlayer(player.name, player.id);
                  }}
                  src={trashIcon}
                  alt="Delete player trashcan"
                />
              )
            )}
          </div>
        </div>
        <div className="overlayBottom overlayBottomEnabled">
          <Button
            className="deleteOverlayButton"
            type="primary"
            label="Done"
            handleClick={() => updateArray()}
          />
        </div>
      </Overlay>

      <Overlay
        className="overlayBox"
        src={deleteIcon}
        isOpen={isOverlayOpen}
        onClose={() => {
          setIsOverlayOpen(!isOverlayOpen);
          setNewPlayer("");
        }}
      >
        <div className="createPlayerOverlay">
          <p className="overlayHeading">New Player</p>
          <DefaultInputField
            value={newPlayer}
            placeholder="Playername"
            onChange={(e: any) => setNewPlayer(e.target.value)}
            onKeyDown={(name) => (e) => handleKeyPess(name.target?.value, e)}
          />
          {errormessage && <p id="error-message">{errormessage}</p>}
          <Button
            iconStyling="userPlus"
            label="Player Input"
            iconSrc={userPLus}
            handleClick={() => {
              createPlayer(newPlayer);
            }}
          />
        </div>
      </Overlay>
    </div>
  );
}
export default Start;
