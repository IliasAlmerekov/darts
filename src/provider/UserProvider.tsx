import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useReducer,
} from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { DragEndEvent } from "@dnd-kit/core";

const SELECT_PLAYER_SOUND_PATH = "/sounds/select-sound.mp3";
const UNSELECT_PLAYER_SOUND_PATH = "/sounds/unselect-sound.mp3";
const ADD_PLAYER_SOUND_PATH = "/sounds/add-player-sound.mp3";
const ERROR_SOUND_PATH = "/sounds/error-sound.mp3";


interface PlayerProps {
  id: number;
  name: string;
  isAdded?: boolean;
  isClicked?: number | null;
}

interface GameState {
  newPlayer: string;
  isOverlayOpen: boolean;
  selectedPlayers: PlayerProps[];
  unselectedPlayers: PlayerProps[];
  dragEnd?: boolean;
  clickedPlayerId: number | null;
  errormessage: string;
  activeTab: string;
  list: PlayerProps[];
  userList: PlayerProps[];
  winnerList: BASIC.WinnerPlayerProps[];
  undoFromSummary: boolean;
  lastHistory: BASIC.GameState[];
}

interface UserContextType {
  event: GameState;
  updateEvent: (next: Partial<GameState>) => void;
  functions: Record<string, (...args: any[]) => void>;
}

const initialValues: GameState = {
  //Start.tsx
  newPlayer: "",
  isOverlayOpen: false,
  selectedPlayers: [] /* <PlayerProps[]> */,
  unselectedPlayers: [] /* <PlayerProps[]> */,
  dragEnd: undefined /* <boolean> */,
  clickedPlayerId: null /* <number | null> */,
  errormessage: "",
  activeTab: "game",

  //App.tsx:
  list: [] /* <PlayerProps[]> */,
  userList: getUserFromLS(),
  winnerList: [] /* <BASIC.WinnerPlayerProps[]> */,
  undoFromSummary: false,
  lastHistory: [] /* <BASIC.GameState[]> */,
};

export const UserContext = createContext<UserContextType>({
  event: initialValues,
  updateEvent: () => {},
  functions: {},
});

//????
function getUserFromLS() {
  if (localStorage.getItem("User") !== null) {
    const playersFromLS = localStorage.getItem("User");
    const playersFromLocalStorage =
      !!playersFromLS && JSON.parse(playersFromLS);
    return playersFromLocalStorage;
  } else {
    localStorage.setItem("User", JSON.stringify([]));
    return [];
  }
}

const reducer = (prev: GameState, next: Partial<GameState>) => {
  const newEvent = { ...prev, ...next };
  // guards
  return newEvent;
};

type UserProviderProps = {
  children?: ReactNode;
};

export const UserProvider = ({ children }: UserProviderProps) => {
  const [event, updateEvent] = useReducer(reducer, initialValues);

  //Start.tsx functions
  const initializePlayerList = useCallback(() => {
    const initialPlayerList: PlayerProps[] = event.userList.map(
      (user: BASIC.UserProps) => ({
        name: user.name,
        id: user.id,
        isAdded: false,
        isClicked: event.clickedPlayerId,
      })
    );
    updateEvent({ unselectedPlayers: initialPlayerList });
  }, [event.userList, event.clickedPlayerId, updateEvent]);

  function playSound(path: string) {
    const audio = new Audio(path);
    audio.play();
    audio.volume = 0.4;
  }

  function handleTabClick(id: string) {
    updateEvent({ activeTab: id });
  }

  function handleSelectPlayer(name: string, id: number) {
    if (event.selectedPlayers.length === 10) return;
    updateEvent({ clickedPlayerId: id });
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
      updateEvent({ list: updatedSelectedPlayerList });
      functions.playSound(SELECT_PLAYER_SOUND_PATH);
    }, 200);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateEvent({ newPlayer: e.target.value });
  }

  const handleKeyPess =
    (name: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        updateEvent({ newPlayer: name });
        functions.createPlayer(event.newPlayer);
      }
    };

  function handleUnselect(name: string, id: number) {
    updateEvent({ clickedPlayerId: null });
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
      list: updatedSelectedPlayers,
    });
    functions.playSound(UNSELECT_PLAYER_SOUND_PATH);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    updateEvent({ dragEnd: true });

    if (over && active.id !== over?.id) {
      const activeIndex = event.selectedPlayers.findIndex(
        ({ id }: any) => id === active.id
      );
      const overIndex = event.selectedPlayers.findIndex(
        ({ id }: any) => id === over.id
      );
      const newArray: PlayerProps[] = arrayMove(
        event.selectedPlayers,
        activeIndex,
        overIndex
      );
      updateEvent({
        selectedPlayers: newArray,
        list: newArray,
      });
    }
  }

  function createPlayer(name: string) {
    if (!/^[^\s][a-zA-Z0-9 _-]{2,}$/.test(name)) {
      updateEvent({
        newPlayer: "",
        errormessage:
          "Nickname must contain at least 3 letters or digits and cannot start with a space.",
      });
      functions.playSound(ERROR_SOUND_PATH);
      return;
    }
    const id = Number(new Date());
    addUserToLS(name, id);

    if (event.selectedPlayers.length === 10) {
      const updatedUnselectedPlayers = [
        ...event.unselectedPlayers,
        { name, isAdded: false, id },
      ];
      updateEvent({ unselectedPlayers: updatedUnselectedPlayers });
    } else {
      const updatedSelectedPlayers = [
        ...event.selectedPlayers,
        { name, isAdded: true, id },
      ];
      updateEvent({
        selectedPlayers: updatedSelectedPlayers,
        list: updatedSelectedPlayers,
      });
    }
    updateEvent({
      newPlayer: "",
      isOverlayOpen: !event.isOverlayOpen,
      errormessage: "",
    });
    functions.playSound(ADD_PLAYER_SOUND_PATH);
  }

  //App.tsx functions
  function addUnselectedUserListToLs(unselectedPlayers: PlayerProps[]) {
    localStorage.setItem("UserUnselected", JSON.stringify(unselectedPlayers));
  }

  function addUserToLS(name: string, id: number) {
    const newUserList = [...event.userList];
    newUserList.push({ name, id });
    updateEvent({ userList: newUserList });
    localStorage.setItem("User", JSON.stringify(newUserList));
  }

  const functions = {
    initializePlayerList,
    playSound,
    handleTabClick,
    handleSelectPlayer,
    handleChange,
    handleKeyPess,
    handleUnselect,
    handleDragEnd,
    createPlayer,
    getUserFromLS,
    addUnselectedUserListToLs,
    addUserToLS,
  };

  return (
    <UserContext.Provider value={{ event, updateEvent, functions }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
