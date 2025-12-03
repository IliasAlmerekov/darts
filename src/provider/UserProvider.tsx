import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { DragEndEvent } from "@dnd-kit/core";
import { $settings, newSettings } from "../stores/settings";
import { useStore } from "@nanostores/react";
import { NavigateFunction } from "react-router-dom";
import {
  createRematch,
  deletePlayerFromGame,
  recordThrow,
  undoLastThrow,
  GameThrowsResponse,
} from "../services/api";
import { persistInvitationToStorage, readInvitationFromStorage } from "../hooks/useRoomInvitation";
import { getGameStates } from "../services/Game/state";

interface PlayerProps {
  id: number;
  name: string;
  isAdded?: boolean;
  isClicked?: number | null;
}

interface GameState {
  // Start.tsx
  newPlayer: string;
  isNewPlayerOverlayOpen: boolean;
  selectedPlayers?: PlayerProps[];
  dragEnd?: boolean;
  clickedPlayerId: number | null;
  errormessage: string;
  activeTab: string;
  list: PlayerProps[];
  userList?: PlayerProps[];

  // summary
  winnerList: BASIC.WinnerPlayerProps[];

  // Game state - now from backend API
  isFinishGameOverlayOpen: boolean;
  isSettingsOverlayOpen: boolean;
  isInitialized: boolean;
  currentGameId: number | null;
  lastFinishedGameId: number | null;
  lastFinishedPlayerIds: number[];
}

interface GameFunctions {
  initializePlayerList?: () => void;
  playSound?: (soundType: string) => void;
  handleTabClick?: (id: string, navigate: NavigateFunction) => void;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUnselect?: (id: number, gameId?: number | null) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  handleGameModeClick?: (mode: string | number) => void;
  handlePointsClick?: (points: string | number) => void;
  handleThrow?: (
    playerId: number,
    value: number,
    isDouble?: boolean,
    isTriple?: boolean,
  ) => Promise<GameThrowsResponse | null>;
  handleUndo?: () => Promise<GameThrowsResponse | null>;
  startRematch?: (mode: "play-again" | "back-to-start") => Promise<void>;
  getNecessaryGameId?: () => number | null;
  getGameStates?: (gameId: number) => Promise<unknown>;
}

const defaultFunctions: GameFunctions = {
  initializePlayerList: () => {},
  playSound: () => {},
  handleTabClick: () => {},
  handleChange: () => {},
  handleUnselect: () => {},
  handleDragEnd: () => {},
  handleUndo: async () => null,
  handleGameModeClick: () => {},
  handlePointsClick: () => {},
  handleThrow: async () => null,
  startRematch: () => Promise.resolve(),
  getNecessaryGameId: () => null,
  getGameStates: async () => undefined,
};

interface UserContextType {
  event: GameState;
  updateEvent: React.Dispatch<Partial<GameState>>;
  functions: GameFunctions;
}

const initialInvitation = readInvitationFromStorage();

const initialValues: GameState = {
  newPlayer: "",
  isNewPlayerOverlayOpen: false,
  selectedPlayers: undefined,
  dragEnd: undefined,
  clickedPlayerId: null,
  errormessage: "",
  activeTab: "game",
  list: [],
  winnerList: [],
  isFinishGameOverlayOpen: false,
  isSettingsOverlayOpen: false,
  isInitialized: false,
  currentGameId: initialInvitation?.gameId ?? null,
  lastFinishedGameId: null,
  lastFinishedPlayerIds: [],
};

export const UserContext = createContext<UserContextType>({
  event: initialValues,
  updateEvent: () => {},
  functions: defaultFunctions,
});

const reducer = (prev: GameState, next: Partial<GameState>): GameState => {
  return { ...prev, ...next };
};

type UserProviderProps = {
  children?: ReactNode;
};

export const UserProvider = ({ children }: UserProviderProps) => {
  const storeSettings = useStore($settings);
  const [event, updateEvent] = useReducer(reducer, initialValues);
  // const startingScoreRef = useRef<number | null>(null);

  // all sounds
  // const SELECT_PLAYER_SOUND_PATH = "/sounds/select-sound.mp3";
  // const UNSELECT_PLAYER_SOUND_PATH = "/sounds/unselect-sound.mp3";
  // const ADD_PLAYER_SOUND_PATH = "/sounds/add-player-sound.mp3";
  // const ERROR_SOUND_PATH = "/sounds/error-sound.mp3";
  const THROW_SOUND_PATH = "/sounds/throw-sound.mp3";
  // const WIN_SOUND_PATH = "/sounds/win-sound.mp3";
  const UNDO_SOUND_PATH = "/sounds/undo-sound.mp3";

  function playSound(path: string) {
    const audio = new Audio(path);
    audio.volume = 0.4;
    if (path === THROW_SOUND_PATH) {
      audio.currentTime = 2.3;
    } else if (path === UNDO_SOUND_PATH) {
      audio.currentTime = 0.2;
      audio.volume = 0.1;
    }
    audio.play();
  }

  //Start.tsx functions
  const initializePlayerList = useCallback(() => {
    const initialPlayerList: PlayerProps[] =
      event.userList?.map((user: BASIC.UserProps) => ({
        name: user.name,
        id: user.id,
        isAdded: false,
        isClicked: event.clickedPlayerId,
      })) || [];
    updateEvent({ selectedPlayers: initialPlayerList });
  }, [event.clickedPlayerId, event.userList, updateEvent]);

  // NavigationBar
  function handleTabClick(id: string, navigate: NavigateFunction) {
    updateEvent({ activeTab: id });

    switch (id) {
      case "game":
        navigate("/start");
        break;
      case "settings":
        navigate("/settings");
        break;
      case "statistics":
        navigate("/statistics");
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    if (location.pathname.includes("statistics")) {
      updateEvent({ activeTab: "statistics" });
    } else if (location.pathname.includes("settings")) {
      updateEvent({ activeTab: "settings" });
    } else if (location.pathname.includes("game")) {
      updateEvent({ activeTab: "game" });
    }
  }, []);

  // function handleSelectPlayer(name: string, id: number) {
  //   if (event.selectedPlayers.length === 10) return;
  //   updateEvent({ clickedPlayerId: id });
  //   setTimeout(() => {
  //     const updatedUnselectedPlayerList = event.unselectedPlayers.filter(
  //       (list: PlayerProps) => list.id !== id,
  //     );
  //     const updatedSelectedPlayerList: PlayerProps[] = [
  //       ...event.selectedPlayers,
  //       { name, isAdded: true, id },
  //     ];
  //     updateEvent({
  //       selectedPlayers: updatedSelectedPlayerList,
  //       unselectedPlayers: updatedUnselectedPlayerList,
  //       list: updatedSelectedPlayerList,
  //     });
  //     localStorage.setItem("UserUnselected", JSON.stringify(updatedUnselectedPlayerList));
  //     functions.playSound(SELECT_PLAYER_SOUND_PATH);
  //   }, 200);
  // }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateEvent({ newPlayer: e.target.value });
  }

  // const handleKeyPess = (name: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (e.key === "Enter") {
  //     updateEvent({ newPlayer: name });
  //     functions.createPlayer(name);
  //   }
  // };

  function handleUnselect(id: number, gameId?: number | null) {
    updateEvent({ clickedPlayerId: null });

    const removePlayerLocally = () => {
      const updatedSelectedPlayers = event.selectedPlayers?.filter(
        (list: PlayerProps) => list.id !== id,
      );
      updateEvent({
        selectedPlayers: updatedSelectedPlayers,
        list: updatedSelectedPlayers,
      });

      sessionStorage.setItem("SelectedPlayers", JSON.stringify(updatedSelectedPlayers));
      //functions.playSound(UNSELECT_PLAYER_SOUND_PATH);
    };

    if (typeof gameId === "number") {
      deletePlayerFromGame(gameId, id)
        .then(removePlayerLocally)
        .catch((error) => {
          console.error("Failed to remove player from game:", error);
        });
      return;
    }

    removePlayerLocally();
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    updateEvent({ dragEnd: true });

    if (over && active.id !== over?.id) {
      const activeIndex = event.selectedPlayers?.findIndex(
        ({ id }: PlayerProps) => id === active.id,
      );
      const overIndex = event.selectedPlayers?.findIndex(({ id }: PlayerProps) => id === over.id);
      const newArray: PlayerProps[] = arrayMove(
        event.selectedPlayers || [],
        activeIndex || 0,
        overIndex || 0,
      );
      updateEvent({
        selectedPlayers: newArray,
        list: newArray,
      });
    }
  }

  // function createPlayer(name: string) {
  //   if (!/^[^\s][a-zA-Z0-9 _-]{2,}$/.test(name)) {
  //     updateEvent({
  //       newPlayer: "",
  //       errormessage:
  //         "Nickname must contain at least 3 letters or digits and cannot start with a space.",
  //     });
  //     functions.playSound(ERROR_SOUND_PATH);
  //     return;
  //   }
  //   const id = Number(new Date());
  //   addUserToLS(name, id);

  //   if (event.selectedPlayers.length === 10) {
  //     // const updatedUnselectedPlayers = [...event.unselectedPlayers, { name, isAdded: false, id }];
  //     // updateEvent({ unselectedPlayers: updatedUnselectedPlayers });
  //   } else {
  //     const updatedSelectedPlayers = [...event.selectedPlayers, { name, isAdded: true, id }];
  //     updateEvent({
  //       selectedPlayers: updatedSelectedPlayers,
  //       list: updatedSelectedPlayers,
  //     });
  //   }
  //   updateEvent({
  //     newPlayer: "",
  //     isNewPlayerOverlayOpen: !event.isNewPlayerOverlayOpen,
  //     errormessage: "",
  //   });
  //   functions.playSound(ADD_PLAYER_SOUND_PATH);
  // }

  //App.tsx functions

  // Simplified handleThrow - Backend handles all game logic
  async function handleThrow(
    playerId: number,
    value: number,
    isDouble: boolean = false,
    isTriple: boolean = false,
  ): Promise<GameThrowsResponse | null> {
    const gameId = event.currentGameId;

    if (!gameId) {
      console.error("No active game ID");
      updateEvent({ errormessage: "No active game found" });
      return null;
    }

    try {
      // Send throw to backend - it returns the complete updated game state
      const gameState = await recordThrow(gameId, {
        playerId,
        value,
        isDouble,
        isTriple,
      });

      // Return the updated game state immediately for UI update
      playSound(THROW_SOUND_PATH);
      return gameState;
    } catch (error) {
      console.error("Failed to record throw:", error);
      updateEvent({
        errormessage: "Failed to record throw. Please try again.",
      });
      return null;
    }
  }

  async function handleUndo(): Promise<GameThrowsResponse | null> {
    const gameId = event.currentGameId;

    if (!gameId) {
      console.error("No active game ID");
      return null;
    }

    try {
      const gameState = await undoLastThrow(gameId);
      // Return the updated game state immediately for UI update
      playSound(UNDO_SOUND_PATH);
      return gameState;
    } catch (error) {
      console.error("Failed to undo throw:", error);
      updateEvent({
        errormessage: "Failed to undo throw. Please try again.",
      });
      return null;
    }
  }

  const handleGameModeClick = (id: string | number) => {
    const mode = id.toString();
    newSettings(mode, storeSettings.points);
  };

  const handlePointsClick = (id: string | number) => {
    const points = Number(id);
    newSettings(storeSettings.gameMode, points);
  };

  const getNecessaryGameId = () => {
    const latestInvitation = readInvitationFromStorage();
    return event.currentGameId ?? latestInvitation?.gameId ?? null;
  };

  const fetchGameStates = async (gameId: number) => {
    try {
      const data = await getGameStates(gameId);
      return data;
    } catch (error) {
      console.error("Failed to fetch game states:", error);
      throw error;
    }
  };

  /*const getLastFinishedPlayerIds = () => {
    if (event.selectedPlayers?.length > 0) {
      return event.selectedPlayers?.map((p) => p.id);
    }
    return event.lastFinishedPlayerIds;
  };*/

  async function startRematch(mode: "play-again" | "back-to-start"): Promise<void> {
    const storedInvitation = readInvitationFromStorage();
    const prevGameId = event.currentGameId ?? storedInvitation?.gameId ?? null;
    const lastFinishedGameId = prevGameId ?? event.lastFinishedGameId ?? null;

    if (mode === "back-to-start") {
      persistInvitationToStorage(null);
      updateEvent({
        currentGameId: null,
        lastFinishedGameId,
        winnerList: [],
        list: event.selectedPlayers,
      });
      return;
    }

    if (!prevGameId) {
      console.warn("No previous game ID found for rematch.");
      return;
    }

    try {
      const rematch = await createRematch(prevGameId);

      persistInvitationToStorage({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      updateEvent({
        currentGameId: rematch.gameId,
        lastFinishedGameId,
      });
    } catch (error) {
      console.error("Failed to start rematch:", error);
    }
  }

  const functions: GameFunctions = {
    initializePlayerList,
    playSound,
    handleTabClick,
    handleChange,
    handleUnselect,
    handleDragEnd,
    handleGameModeClick,
    handlePointsClick,
    handleThrow,
    handleUndo,
    startRematch,
    getNecessaryGameId,
    getGameStates: fetchGameStates,
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
