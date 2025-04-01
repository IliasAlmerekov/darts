import "./start.css";
import {
  Dispatch,
  SetStateAction,
  useEffect
} from "react";
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
  addUnselectedUserListToLs,
}: IProps) {
  const SELECT_PLAYER_SOUND_PATH = "/sounds/select-sound.mp3";
  const UNSELECT_PLAYER_SOUND_PATH = "/sounds/unselect-sound.mp3";
  const ADD_PLAYER_SOUND_PATH = "/sounds/add-player-sound.mp3";
  const ERROR_SOUND_PATH = "/sounds/error-sound.mp3";
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";

  const { event, updateEvent, functions } = useUser();

  function initializePlayerList() {
    const initialPlayerList: PlayerProps[] = userList.map(
      (user: BASIC.UserProps) => ({
        name: user.name,
        id: user.id,
        isAdded: false,
        isClicked: event.clickedPlayerId,
      })
    );
    updateEvent({ unselectedPlayers: initialPlayerList });
  }

  function playSound(path: string) {
    const audio = new Audio(path);
    audio.play();
    audio.volume = 0.4;
  }



  function handleSelectPlayer(name: string, id: number) {
    if (event.selectedPlayers.length === 10) return;
    updateEvent({clickedPlayerId: id})
    setTimeout(() => {
      const updatedUnselectedPlayerList = event.unselectedPlayers.filter(
        (list: any) => list.id !== id
      );
      const updatedSelectedPlayerList: PlayerProps[] = [
        ...event.selectedPlayers,
        { name, isAdded: true, id },
      ];
      updateEvent({
        selectedPlayers: updatedSelectedPlayerList,
        unselectedPlayers: updatedUnselectedPlayerList,
      });
      setList(updatedSelectedPlayerList)
      playSound(SELECT_PLAYER_SOUND_PATH);
    }, 200);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateEvent({ newPlayer: e.target.value });
  }

  const handleKeyPess =
    (name: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        updateEvent({ newPlayer: name });
        createPlayer(event.newPlayer);
      }
    };

  function handleUnselect(name: string, id: number) {
    updateEvent({clickedPlayerId: null})
    const updatedSelectedPlayers = event.selectedPlayers.filter(
      (list: any) => list.id !== id
    );
    const updatedUnselectedPlayers: PlayerProps[] = [
      ...event.unselectedPlayers,
      { name, isAdded: false, id },
    ];
    updateEvent({
      selectedPlayers: updatedSelectedPlayers,
      unselectedPlayers: updatedUnselectedPlayers,
    });
    setList(updatedSelectedPlayers)
    playSound(UNSELECT_PLAYER_SOUND_PATH);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    updateEvent({dragEnd: true})

    if (over && active.id !== over?.id) {
      const activeIndex = event.selectedPlayers.findIndex(
        ({ id }: any) => id === active.id
      );
      const overIndex = event.selectedPlayers.findIndex(({ id }: any) => id === over.id);
      const newArray: PlayerProps[] = arrayMove(event.selectedPlayers, activeIndex, overIndex);
      updateEvent({
        selectedPlayers: newArray,
      });
      setList(newArray)
    }
  }

  function createPlayer(name: string) {
    if (!/^[^\s][a-zA-Z0-9 _-]{2,}$/.test(name)) {
      updateEvent({ newPlayer: "",
        errormessage: "Nickname must contain at least 3 letters or digits and cannot start with a space."
       });
      playSound(ERROR_SOUND_PATH);
      return;
    }
    const id = Number(new Date());
    addUserToLS(name, id);

    if (event.selectedPlayers.length === 10) {
      const updatedUnselectedPlayers = [
        ...event.unselectedPlayers,
        { name, isAdded: false, id },
      ];
      updateEvent({unselectedPlayers: updatedUnselectedPlayers})
    } else {
      const updatedSelectedPlayers = [
        ...event.selectedPlayers,
        { name, isAdded: true, id },
      ];
      updateEvent({
        selectedPlayers: updatedSelectedPlayers,
      });
      setList(updatedSelectedPlayers)
    }
    updateEvent({ newPlayer: "", isOverlayOpen: !event.isOverlayOpen, errormessage: "" });
    playSound(ADD_PLAYER_SOUND_PATH);
  }

  useEffect(() => {
    if (list.length === 0) {
      initializePlayerList();
    } else {
      updateEvent({selectedPlayers: list})
      const playersFromLS = localStorage.getItem("UserUnselected");
      const playersFromLocalStorage =
        !!playersFromLS && JSON.parse(playersFromLS);
      updateEvent({unselectedPlayers: playersFromLocalStorage})
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="start">
      <div className="navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => functions.handleTabClick(item.id)}
            className={clsx("tab-button", {
              active: event.activeTab === item.id,
              inactive: !(event.activeTab === item.id),
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
                  item.id === event.activeTab ? item.activeIcon : item.inActiveIcon
                }
                alt={item.label}
              />
              {item.label}
            </span>
          </button>
        ))}
      </div>
      {event.activeTab === "statistics" ? (
        <Statistics list={list} setList={setList} />
      ) : event.activeTab === "settings" ? (
        <Settings />
      ) : (
        <>
          <div className="existingPlayerList">
            <div className="header">
              <h4 className="headerUnselectedPlayers">
                Unselected <br /> Players
              </h4>
            </div>

            {event.unselectedPlayers.length > 0 && (
              <div
                className={clsx("unselectedPlayers", {
                  enabled: event.selectedPlayers.length === 10,
                })}
              >
                {event.unselectedPlayers.map((player: PlayerProps) => {
                  return (
                    <UnselectedPlayerItem
                      {...player}
                      key={player.id}
                      handleClickOrDelete={() => {
                        handleSelectPlayer(player.name, player.id);
                      }}
                      src={arrowRight}
                      alt="Select player arrow"
                      isClicked={event.clickedPlayerId === player.id}
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
                handleClick={() => updateEvent({ isOverlayOpen: true })}
              />
            </div>
          </div>
          <div className="addedPlayerList">
            <img className="deepblueIcon" src={Madebydeepblue} alt="" />
            <h4 className="headerSelectedPlayers">
              Selected Players{" "}
              <div className="listCount">{event.selectedPlayers.length}/10</div>
            </h4>
            <DndContext
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              onDragMove={() => updateEvent({dragEnd: false})}
            >
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
                      handleClick={() => handleUnselect(player.name, player.id)}
                      alt="Unselect player cross"
                      dragEnd={event.dragEnd}
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
                disabled={event.selectedPlayers.length < 2}
                type="secondary"
                handleClick={() => {
                  addUnselectedUserListToLs(event.unselectedPlayers);
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
          updateEvent({ newPlayer: "", isOverlayOpen: false });
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
          {event.errormessage && <p id="error-message">{event.errormessage}</p>}
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
