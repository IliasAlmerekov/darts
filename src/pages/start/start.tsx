import "./start.css";
import {
  useEffect,
  useRef
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
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useUser } from "../../provider/UserProvider";

export type PlayerProps = {
  id: number;
  name: string;
  isAdded?: boolean;
  isClicked?: number | null;
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

function Start() {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";

  const { event, updateEvent, functions } = useUser();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      if (event.list?.length === 0) {
        functions.initializePlayerList();
      } else {
        updateEvent({ selectedPlayers: event.list });
        const playersFromLS = localStorage.getItem("UserUnselected");
        const playersFromLocalStorage =
          !!playersFromLS && JSON.parse(playersFromLS);
        updateEvent({ unselectedPlayers: playersFromLocalStorage });
      }
    }
  }, [event.list, functions, updateEvent]);

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
                  item.id === event.activeTab
                    ? item.activeIcon
                    : item.inActiveIcon
                }
                alt={item.label}
              />
              {item.label}
            </span>
          </button>
        ))}
      </div>
      {event.activeTab === "statistics" ? (
        <Statistics />
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
                        functions.handleSelectPlayer(player.name, player.id);
                      }}
                      src={arrowRight}
                      alt="Select player arrow"
                      isClicked={
                        event.clickedPlayerId === player.id
                          ? event.clickedPlayerId
                          : undefined
                      }
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
                handleClick={() => updateEvent({ isNewPlayerOverlayOpen: true })}
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
              onDragEnd={functions.handleDragEnd}
              onDragMove={() => updateEvent({ dragEnd: false })}
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
                      handleClick={() => functions.handleUnselect(player.name, player.id)}
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
                  functions.addUnselectedUserListToLs(event.unselectedPlayers);
                  functions.playSound(START_SOUND_PATH);
                  functions.resetGame()
                }}
              />
            </div>
          </div>
        </>
      )}

      <Overlay
        className="overlayBox"
        src={deleteIcon}
        isOpen={event.isNewPlayerOverlayOpen}
        onClose={() => {
          updateEvent({ newPlayer: "", isNewPlayerOverlayOpen: false });
        }}
      >
        <div className="createPlayerOverlay">
          <p className="overlayHeading">New Player</p>
          <DefaultInputField
           
            value={event.newPlayer}
            placeholder="Playername"
            onChange={functions.handleChange}
            onKeyDown={() => functions.handleKeyPess}
          />
          {event.errormessage && <p id="error-message">{event.errormessage}</p>}
          <Button
            iconStyling="userPlus"
            label="Player Input"
            iconSrc={userPLus}
            handleClick={() => {
              functions.createPlayer(event.newPlayer);
            }}
            link={""}
          />
        </div>
      </Overlay>
    </div>
  );
}
export default Start;
