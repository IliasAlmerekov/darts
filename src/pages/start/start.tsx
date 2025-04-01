import "./start.css";
import { Dispatch, SetStateAction, useEffect, useState, useContext } from "react";
import UnselectedPlayerItem from "../../components/PlayerItems/UnselectedPlayerItem";
import SelectedPlayerItem from "../../components/PlayerItems/SelectedPlayerItem";
import Plus from "../../icons/plus.svg";
import Statistics from "../../components/Statistics/Statistics";
import Madebydeepblue from "../../icons/madeByDeepblue.svg";
import userPLus from "../../icons/user-plus.svg";
import LinkButton from "../../components/LinkButton/LinkButton";
import Button from "../../components/Button/Button";
import "../../components/Button/Button.css";
import settingsCogInactive from "../../icons/settings-inactive.svg";
import settingsCog from "../../icons/settings.svg";
import dartIcon from "../../icons/dart.svg";
import dartIconInactive from "../../icons/dart-inactive.svg";
import statisticIcon from "../../icons/statistics.svg";
import statisticIconInactive from "../../icons/statistics-inactive.svg";
import arrowRight from "../../icons/arrow-right.svg";
import Overlay from "../../components/Overlay/Overlay";
import DefaultInputField from "../../components/InputField/DefaultInputField";
import Settings from "../../components/Settings/Settings";
import deleteIcon from "../../icons/delete.svg";
import clsx from "clsx";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useUser } from "../../provider/UserProvider";

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

const navItems = [
  {
    label: "Statistics",
    activeIcon: statisticIcon,
    inActiveIcon: statisticIconInactive,
    id: "statistics",
  },
  {
    label: "Game",
    activeIcon: dartIcon,
    inActiveIcon: dartIconInactive,
    id: "game",
  },
  {
    label: "Settings",
    activeIcon: settingsCog,
    inActiveIcon: settingsCogInactive,
    id: "settings",
  },
];

function Start({
  list,
  setList,
  userList,
  addUserToLS,
  deleteUserFromLS,
  resetLS,
  addUnselectedUserListToLs,
}: IProps) {
  const [isSettingsCogOpen, setIsSettingsCogOpen] = useState(false);
  const [deletePlayerList, setDeletePlayerList] = useState<PlayerProps[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerProps[]>([]);
  const [unselectedPlayers, setUnselectedPlayers] = useState<PlayerProps[]>([]);
  const [dragEnd, setDragEnd] = useState<boolean>();
  const [clickedPlayerId, setClickedPlayerId] = useState<number | null>(null);
  const [errormessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("game");

  const SELECT_PLAYER_SOUND_PATH = "/sounds/select-sound.mp3";
  const UNSELECT_PLAYER_SOUND_PATH = "/sounds/unselect-sound.mp3";
  const ADD_PLAYER_SOUND_PATH = "/sounds/add-player-sound.mp3";
  const ERROR_SOUND_PATH = "/sounds/error-sound.mp3";
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";

  const { event, updateEvent } = useUser()

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
    const audio = new Audio(path);
    audio.play();
    audio.volume = 0.4;
  }

  function handleTabClick(id: string) {
      setActiveTab(id)
}

  function handleSelectPlayer(name: string, id: number) {
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateEvent({newPlayer: e.target.value})
  }

  const handleKeyPess = (name: string) => (e:React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      updateEvent({newPlayer: name});
      createPlayer(event.newPlayer);
    }
  }

  function handleUnselect(name: string, id: number) {
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
      updateEvent({newPlayer: ""});
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
    updateEvent({newPlayer: '', isOverlayOpen: !event.isOverlayOpen});
    setErrorMessage("");
    playSound(ADD_PLAYER_SOUND_PATH);
  }

  function deletePlayer(name: string, id: number) {
    const updatedPlayerList = deletePlayerList.filter((list) => list.id !== id);
    deleteUserFromLS(id);
    setDeletePlayerList(updatedPlayerList);
  }

  /* function overlayPlayerlist() {
    const concatPlayerlist = selectedPlayers.concat(unselectedPlayers);
    setDeletePlayerList(concatPlayerlist);
    setIsSettingsCogOpen(!isSettingsCogOpen);
  } */

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
    // eslint-disable-next-line
  }, []);

  return (
    <div className="start">
      <div className="navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={clsx("tab-button", {
              active: activeTab === item.id,
              inactive: !(activeTab === item.id),
            })}
          >
            {/* {item.id === "settings" && (
              <img
                className={clsx("settingsCog", {
                  hide:
                    selectedPlayers.length === 0 &&
                    unselectedPlayers.length === 0,
                })}
                src={settingsCog}
                alt=""
                onClick={
                  selectedPlayers.length === 0 && unselectedPlayers.length === 0
                    ? undefined
                    : () => overlayPlayerlist()
                }
              />
            )} */}
            <span>
              <img
                src={
                  item.id === activeTab ? item.activeIcon : item.inActiveIcon
                }
                alt={item.label}
              />
              {item.label}
            </span>
          </button>
        ))}
      </div>
      {activeTab === "statistics" ? (
        <Statistics  list={list}
        setList={setList}
        />
      ) : activeTab === "settings" ? (
        <Settings />
      ) : (
        <>
          <div className="existingPlayerList">
            <div className="header">
              <h4 className="headerUnselectedPlayers">
                Unselected <br /> Players
              </h4>
            </div>

            {unselectedPlayers.length > 0 && (
              <div
                className={clsx("unselectedPlayers", {
                  enabled: selectedPlayers.length === 10,
                })}
              >
                {unselectedPlayers.map((player: PlayerProps) => {
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
            handleClick={() => updateEvent({ isOverlayOpen: true})}
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
</>
      )}

      <Overlay
        className="overlayBox"
        src={deleteIcon}
        isOpen={event.isOverlayOpen}
        onClose={() => {
          updateEvent({newPlayer: "", isOverlayOpen: false});
        }}
      >
        <div className="createPlayerOverlay">
          <p className="overlayHeading">New Player</p>
          <DefaultInputField
            name={""}
            value={event.newPlayer}
            placeholder="Playername"
            onChange={handleChange}

            onKeyDown={handleKeyPess}
        
          />
          {errormessage && <p id="error-message">{errormessage}</p>}
          <Button
            iconStyling="userPlus"
            label="Player Input"
            iconSrc={userPLus}
            handleClick={() => {
              createPlayer(event.newPlayer);
            }}
            link={""}
          />
        </div>
      </Overlay>

    </div>
  );
}
export default Start;
