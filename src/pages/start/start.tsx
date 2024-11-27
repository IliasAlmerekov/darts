import "../start/start.css";
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
  const [userSelected, setUserSelected] = useState<PlayerProps[]>([]);
  const [userUnselected, setUserUnselected] = useState<PlayerProps[]>([]);
  const [dragEnd, setDragEnd] = useState<boolean>();
  const [clickedPlayerId, setClickedPlayerId] = useState<number | null>(null);

  function initializePlayerList() {
    const initialPlayerlist: PlayerProps[] = [];
    userList.forEach((user: BASIC.UserProps, i: number) => {
      const player = {
        name: user.name,
        isAdded: false,
        id: user.id,
        isClicked: clickedPlayerId,
      };
      initialPlayerlist.push(player);
    });
    setUserUnselected(initialPlayerlist);
  }

  function playSound(path: string) {
    var audio = new Audio(path);
    audio.play();
    audio.volume = 0.4;
  }

  function handleSelect(name: any, id: number, player: PlayerProps) {
    setClickedPlayerId(id);
    if (userSelected.length === 10) {
      return;
    } else {
      setTimeout(() => {
        const newList = userUnselected.filter((list) => list.id !== id);
        const newSelectedList: PlayerProps[] = [...userSelected];
        newSelectedList.push({ name, isAdded: true, id });
        setUserUnselected(newList);
        setUserSelected(newSelectedList);
        setList(newSelectedList);
        playSound("/sounds/select-sound.mp3");
      }, 200);
    }
  }

  function handleKeyPess(name: string, event: any) {
    if (event.key === "Enter") {
      setNewPlayer(name);
      createPlayer(newPlayer);
    }
  }

  function handleUnselect(name: any, id: number) {
    setClickedPlayerId(null);
    const newList = userSelected.filter((list) => list.id !== id);
    const newUnselectedList: PlayerProps[] = [...userUnselected];
    newUnselectedList.push({ name, isAdded: false, id });
    setUserSelected(newList);
    setUserUnselected(newUnselectedList);
    setList(newList);
    playSound("/sounds/unselect-sound.mp3");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDragEnd(true);

    if (over && active.id !== over?.id) {
      const activeIndex = userSelected.findIndex(({ id }) => id === active.id);
      const overIndex = userSelected.findIndex(({ id }) => id === over.id);
      const newArray = arrayMove(userSelected, activeIndex, overIndex);
      setUserSelected(newArray);
      setList(newArray);
    }
  }

  function createPlayer(name: any) {
    const id = Number(new Date());
    addUserToLS(name, id);

    if (userSelected.length === 10) {
      const newList = [...userUnselected];
      newList.push({ name, isAdded: false, id });
      setUserUnselected(newList);
    } else {
      const newList = [...userSelected];
      newList.push({ name, isAdded: true, id });
      setUserSelected(newList);
      setList(newList);
    }
    setIsOverlayOpen(!isOverlayOpen);
    setNewPlayer("");
  }

  function deletePlayer(name: any, id: number) {
    const newList = deletePlayerList.filter((list) => list.id !== id);
    deleteUserFromLS(id);
    setDeletePlayerList(newList);
  }

  function overlayPlayerlist() {
    const concatPlayerlist = userSelected.concat(userUnselected);
    setDeletePlayerList(concatPlayerlist);
    setIsSettingsCogOpen(!isSettingsCogOpen);
  }

  function updateArray() {
    const newSelectedList: PlayerProps[] = [];
    const newUnselectedList: PlayerProps[] = [];
    deletePlayerList.forEach((player) => {
      if (player.isAdded === true) {
        newSelectedList.push(player);
      }
      if (player.isAdded === false) {
        newUnselectedList.push(player);
      }
    });
    setUserUnselected(newUnselectedList);
    setUserSelected(newSelectedList);
    setIsSettingsCogOpen(!isSettingsCogOpen);
    resetLS();
  }

  useEffect(() => {
    const deleteOverlayContentEl = document.querySelector(
      ".deleteOverlayContent"
    );
    const overlayBottomEl = document.querySelector(".overlayBottom");
    const overlayBoxEl = document.querySelector(".overlayBox");

    const handler = () => {
      const overlayBoxHeightActual = overlayBoxEl?.clientHeight ?? 0;
      const innerWindowHeight =
        overlayBoxHeightActual - (overlayBottomEl?.clientHeight ?? 0);
      if (
        (deleteOverlayContentEl?.getBoundingClientRect()?.bottom ?? 0) <
        innerWindowHeight + 60
      ) {
        overlayBottomEl?.classList.remove("overlayBottomEnabled");
      }
    };
    handler();
  }, [deletePlayerList.length, isSettingsCogOpen]);

  useEffect(() => {
    if (list.length === 0) {
      initializePlayerList();
    } else {
      setUserSelected(list);
      const playersFromLS = localStorage.getItem("UserUnselected");
      const playersFromLocalStorage =
        !!playersFromLS && JSON.parse(playersFromLS);
      setUserUnselected(playersFromLocalStorage);
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
              hide: userSelected.length === 0 && userUnselected.length === 0,
            })}
            src={settingsCog}
            alt=""
            onClick={
              userSelected.length === 0 && userUnselected.length === 0
                ? undefined
                : () => overlayPlayerlist()
            }
          />
        </div>

        {userUnselected.length > 0 && (
          <div
            className={clsx("testUserUnselectedList", {
              enabled: userSelected.length === 10,
            })}
          >
            {userUnselected.map((player: PlayerProps, index: number) => {
              return (
                <UnselectedPlayerItem
                  {...player}
                  key={player.id}
                  handleClickOrDelete={() => {
                    handleSelect(player.name, player.id, player);
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
          <div className="listCount">{userSelected.length}/10</div>
        </h4>
        <DndContext
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          onDragMove={() => setDragEnd(false)}
        >
          <SortableContext
            items={userSelected}
            strategy={verticalListSortingStrategy}
          >
            {userSelected.map(
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
            disabled={userSelected.length < 2}
            type="secondary"
            handleClick={() => {
              addUnselectedUserListToLs(userUnselected);
              playSound("/sounds/start-round-sound.mp3");
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
                    playSound("/sounds/trash-sound.mp3");
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
          <Button
            iconStyling="userPlus"
            label="Player Input"
            iconSrc={userPLus}
            handleClick={() => {
              playSound("/sounds/add-player-sound.mp3");
              createPlayer(newPlayer);
            }}
          />
        </div>
      </Overlay>
    </div>
  );
}
export default Start;
