import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { DragEndEvent } from "@dnd-kit/core";
import { $settings } from "../stores/settings";
import { useStore } from "@nanostores/react";

interface PlayerProps {
  id: number;
  name: string;
  isAdded?: boolean;
  isClicked?: number | null;
}

interface SavedGamePlayer {
  id: number;
  name: string;
  totaScore: number;
  rounds: {
    throw1?: number;
    throw2?: number;
    throw3?: number;
  }[];
  won: boolean;
}

interface SavedGame {
  id: string;
  date: string;
  players: SavedGamePlayer[];
}

interface GameSummury {
  date: string;
  playersCount: number;
  winnerName: string;
  winnerRounds: number;
}

const getUserFromLS = (): PlayerProps[] => {
  if (localStorage.getItem("User") !== null) {
    const playersFromLS = localStorage.getItem("User");
    const playersFromLocalStorage =
      !!playersFromLS && JSON.parse(playersFromLS);
    return playersFromLocalStorage;
  } else {
    localStorage.setItem("User", JSON.stringify([]));
    return [];
  }
};

interface GameState {
  newPlayer: string;
  isNewPlayerOverlayOpen: boolean;
  selectedPlayers: PlayerProps[];
  unselectedPlayers: PlayerProps[];
  dragEnd?: boolean;
  clickedPlayerId: number | null;
  errormessage: string;
  activeTab: string;
  list: PlayerProps[];
  userList: PlayerProps[];
  winnerList: BASIC.WinnerPlayerProps[];
  lastHistory: BASIC.GameState[];
  playerScore: number;
  roundsCount: number;
  playerList: BASIC.WinnerPlayerProps[];
  throwCount: number;
  playerTurn: number;
  isFinishGameOverlayOpen: boolean;
  isSettingsOverlayOpen: boolean;
  selectedPoints: number;
  selectedGameMode: string;
  history: BASIC.GameState[];
  finishedPlayerList: BASIC.WinnerPlayerProps[];
}

interface GameFunctions {
  initializePlayerList: () => void;
  playSound: (soundType: string) => void;
  handleTabClick: (id: string) => void;
  handleSelectPlayer: (name: string, id: number) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyPess: (
    name: string
  ) => (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleUnselect: (name: string, id: number) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  createPlayer: (name: string) => void;
  getUserFromLS: () => PlayerProps[] | null;
  savedFinishedGameToLS: (players: BASIC.WinnerPlayerProps[]) => void;
  getAllPlayerStats: () => {
    id: number;
    name: string;
    games: number;
    averageRoundScore: number;
  }[];
  getFinishedGamesSummary(): GameSummury[];
  addUnselectedUserListToLs: (players: PlayerProps[]) => void;
  addUserToLS: (name: string, id: number) => void;
  resetGame: () => void;
  undoFromSummary: () => void;
  handleUndo: () => void;
  handleGameModeClick: (mode: string) => void;
  handlePointsClick: (points: number) => void;
  handleThrow: (
    value: BASIC.WinnerPlayerProps,
    throwCount: number,
    playerList: string | number
  ) => void;
  handleBust: (startingScore: number) => void;
  handlePlayerFinishTurn: () => void;
  handleLastPlayer: () => void;
  sortPlayer: () => void;
  changeActivePlayer: () => void;
}

const defaultFunctions: GameFunctions = {
  initializePlayerList: () => {},
  playSound: () => {},
  handleTabClick: () => {},
  handleSelectPlayer: () => {},
  handleChange: () => {},
  handleUnselect: () => {},
  handleDragEnd: () => {},
  createPlayer: () => {},
  addUnselectedUserListToLs: () => {},
  addUserToLS: () => {},
  resetGame: () => {},
  undoFromSummary: () => {},
  handleUndo: () => {},
  handleGameModeClick: () => {},
  handlePointsClick: () => {},
  handleThrow: () => {},
  handleBust: () => {},
  handlePlayerFinishTurn: () => {},
  handleLastPlayer: () => {},
  sortPlayer: () => {},
  changeActivePlayer: () => {},
  getAllPlayerStats: () => [],
  getFinishedGamesSummary: () => [],
  handleKeyPess: function (): (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => void {
    throw new Error("Function not implemented.");
  },
  getUserFromLS: function (): PlayerProps[] | null {
    throw new Error("Function not implemented.");
  },
  savedFinishedGameToLS: function (): void {
    throw new Error("Function not implemented.");
  },
};

interface UserContextType {
  event: GameState;
  updateEvent: React.Dispatch<Partial<GameState>>;
  functions: GameFunctions;
}

const initialValues: GameState = {
  //Start.tsx
  newPlayer: "",
  isNewPlayerOverlayOpen: false,
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
  lastHistory: [] /* <BASIC.GameState[]> */,

  //Game.tsx
  playerScore: 0,
  roundsCount: 1,
  playerList: [] /* <BASIC.WinnerPlayerProps[]> */,
  throwCount: 0,
  playerTurn: 0,
  isFinishGameOverlayOpen: false,
  isSettingsOverlayOpen: false,
  selectedPoints: 0,
  selectedGameMode: "" /* settings.gameMode */,
  history: [] /* <GameState[]> */,
  finishedPlayerList: [] /* <BASIC.WinnerPlayerProps[]> */,
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
  const startingScoreRef = useRef<number | null>(null);

  // all sounds
  const SELECT_PLAYER_SOUND_PATH = "/sounds/select-sound.mp3";
  const UNSELECT_PLAYER_SOUND_PATH = "/sounds/unselect-sound.mp3";
  const ADD_PLAYER_SOUND_PATH = "/sounds/add-player-sound.mp3";
  const ERROR_SOUND_PATH = "/sounds/error-sound.mp3";
  const THROW_SOUND_PATH = "/sounds/throw-sound.mp3";
  const WIN_SOUND_PATH = "/sounds/win-sound.mp3";
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
    const initialPlayerList: PlayerProps[] = event.userList.map(
      (user: BASIC.UserProps) => ({
        name: user.name,
        id: user.id,
        isAdded: false,
        isClicked: event.clickedPlayerId,
      })
    );
    updateEvent({ unselectedPlayers: initialPlayerList });
  }, [event.clickedPlayerId, event.userList, updateEvent]);

  function handleTabClick(id: string) {
    updateEvent({ activeTab: id });
  }

  function handleSelectPlayer(name: string, id: number) {
    if (event.selectedPlayers.length === 10) return;
    updateEvent({ clickedPlayerId: id });
    setTimeout(() => {
      const updatedUnselectedPlayerList = event.unselectedPlayers.filter(
        (list: PlayerProps) => list.id !== id
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
        functions.createPlayer(name);
      }
    };

  function handleUnselect(name: string, id: number) {
    updateEvent({ clickedPlayerId: null });
    const updatedSelectedPlayers = event.selectedPlayers.filter(
      (list: PlayerProps) => list.id !== id
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
        ({ id }: PlayerProps) => id === active.id
      );
      const overIndex = event.selectedPlayers.findIndex(
        ({ id }: PlayerProps) => id === over.id
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
      isNewPlayerOverlayOpen: !event.isNewPlayerOverlayOpen,
      errormessage: "",
    });
    functions.playSound(ADD_PLAYER_SOUND_PATH);
  }

  //App.tsx functions

  //save finished Game to LS
  function savedFinishedGameToLS(players: BASIC.WinnerPlayerProps[]) {
    const savedGames = JSON.parse(
      localStorage.getItem("FinishedGames") || "[]"
    );

    const gameId = players
      .map((p) => p.id)
      .sort((a, b) => a - b)
      .join("");

    const isDuplicate = savedGames.some(
      (game: SavedGame) => game.id === gameId
    );
    if (isDuplicate) {
      return;
    }
    const gameSummary = {
      id: gameId,
      date: new Date().toISOString(),
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        totalScore: player.score,
        rounds: Array.isArray(player.rounds) ? player.rounds : [],
        won: player.score === 0,
      })),
    };
    savedGames.push(gameSummary);
    localStorage.setItem("FinishedGames", JSON.stringify(savedGames));
    console.log("Saved games", gameSummary);
  }

  //get all Players with AverageScore from LS
  function getAllPlayerStats(): {
    id: number;
    name: string;
    games: number;
    averageRoundScore: number;
  }[] {
    const savedGames = JSON.parse(
      localStorage.getItem("FinishedGames") || "[]"
    );

    const statMap: Record<
      number,
      {
        id: number;
        name: string;
        games: number;
        totalScore: number;
        totalRounds: number;
      }
    > = {};

    for (const game of savedGames) {
      for (const player of game.players) {
        if (!statMap[player.id]) {
          statMap[player.id] = {
            id: player.id,
            name: player.name,
            games: 0,
            totalScore: 0,
            totalRounds: 0,
          };
        }

        statMap[player.id].games += 1;

        if (Array.isArray(player.rounds)) {
          for (const round of player.rounds) {
            let roundScore = 0;
            for (const throwKey of ["throw1", "throw2", "throw3"]) {
              const value = round[throwKey];
              if (typeof value === "number") {
                roundScore += value;
              }
            }
            statMap[player.id].totalScore += roundScore;
            statMap[player.id].totalRounds += 1;
          }
        } else {
          console.warn("Missed a player without rounds", player);
        }
      }
    }

    return Object.values(statMap).map((player) => ({
      id: player.id,
      name: player.name,
      games: player.games,
      averageRoundScore:
        player.totalRounds > 0
          ? Number((player.totalScore / player.totalRounds).toFixed(2))
          : 0,
    }));
  }

  function getFinishedGamesSummary(): GameSummury[] {
    const savedGames: SavedGame[] = JSON.parse(
      localStorage.getItem("FinishedGames") || "[]"
    );

    return savedGames.map((game: SavedGame) => {
      const players = Array.isArray(game.players) ? game.players : [];
      const playersCount = players.length;

      const winner = players.find((p: SavedGamePlayer) => p.won);
      const winnerName = winner?.name || "";
      const winnerRounds =
        winner && Array.isArray(winner?.rounds) ? winner.rounds.length : 0;

      return {
        date: game.date || "",
        playersCount,
        winnerName,
        winnerRounds,
      };
    });
  }

  function addUnselectedUserListToLs(unselectedPlayers: PlayerProps[]) {
    localStorage.setItem("UserUnselected", JSON.stringify(unselectedPlayers));
  }

  function addUserToLS(name: string, id: number) {
    const newUserList = [...event.userList];
    newUserList.push({ name, id });
    updateEvent({ userList: newUserList });
    localStorage.setItem("User", JSON.stringify(newUserList));
  }

  function resetGame() {
    updateEvent({
      playerScore: event.selectedPoints,
      roundsCount: 1,
      throwCount: 0,
      playerTurn: 0,
      finishedPlayerList: [],
      history: [],
    });
    const initialPlayerList: BASIC.WinnerPlayerProps[] = event.list.map(
      (user: BASIC.UserProps, i: number) => ({
        id: user.id,
        name: user.name,
        score: event.selectedPoints,
        isActive: i === 0,
        index: i,
        rounds: [
          {
            throw1: undefined,
            throw2: undefined,
            throw3: undefined,
          },
        ] as BASIC.Round[],
        isPlaying: true,
        isBust: false,
        throwCount: 0,
      })
    );
    updateEvent({ playerList: initialPlayerList });
  }
  function undoFromSummary() {
    updateEvent({ history: event.lastHistory });
    functions.handleUndo();
  }

  function handleUndo() {
    if (event.history.length > 0) {
      const newHistory = [...event.history];
      const lastState = newHistory.pop();
      if (lastState) {
        updateEvent({
          finishedPlayerList: lastState.finishedPlayerList,
          playerList: lastState.playerList,
          playerScore: lastState.playerScore,
          throwCount: lastState.throwCount,
          playerTurn: lastState.playerTurn,
          roundsCount: lastState.roundsCount,
        });
        updateEvent({ history: newHistory });
        playSound(UNDO_SOUND_PATH);
      }
    }
  }

  function changeActivePlayer() {
    const prevPlayerTurnIndex = event.playerTurn;
    const newPlayerTurnIndex = event.playerTurn + 1;
    const newPlayerList: BASIC.WinnerPlayerProps[] = [...event.playerList];

    newPlayerList[prevPlayerTurnIndex].isActive = false;
    const isEndOfArray = newPlayerTurnIndex > newPlayerList.length - 1;
    const handleNewIndex = isEndOfArray ? 0 : newPlayerTurnIndex;
    newPlayerList[handleNewIndex].isBust = false;
    newPlayerList[handleNewIndex].isActive = true;
    updateEvent({
      playerList: newPlayerList,
      playerTurn: handleNewIndex,
      throwCount: 0,
    });

    if (isEndOfArray) {
      updateEvent({ roundsCount: event.roundsCount + 1 });
      newPlayerList.forEach((player) => {
        return player.rounds.push({
          throw1: undefined,
          throw2: undefined,
          throw3: undefined,
        } as BASIC.Round);
      });
    }
  }

  const handleGameModeClick = (gameMode: string) => {
    updateEvent({ selectedGameMode: gameMode });
  };

  const handlePointsClick = (points: number) => {
    updateEvent({ selectedPoints: points });
  };

  const isDouble = (throwValue: string) =>
    typeof throwValue === "string" && throwValue.startsWith("D");

  const isTriple = (throwValue: string) =>
    typeof throwValue === "string" && throwValue.startsWith("T");

  function handleThrow(
    player: BASIC.WinnerPlayerProps,
    currentThrow: number,
    currentScoreAchieved: number | string
  ) {
    updateEvent({
      history: [
        ...event.history,
        {
          finishedPlayerList: JSON.parse(
            JSON.stringify(event.finishedPlayerList)
          ),
          playerList: JSON.parse(JSON.stringify(event.playerList)),
          playerScore: event.playerScore,
          throwCount: event.throwCount,
          playerTurn: event.playerTurn,
          roundsCount: event.roundsCount,
        },
      ],
    });

    let actualScore: number = 0;
    if (typeof currentScoreAchieved === "string") {
      const type = currentScoreAchieved.charAt(0);
      const value = parseInt(currentScoreAchieved.slice(1));
      if (isNaN(value)) {
        console.error("Invalid value:", currentScoreAchieved);
        return;
      }
      if (type === "D") actualScore = value * 2;
      else if (type === "T") actualScore = value * 3;
      else actualScore = value;
    } else {
      actualScore = currentScoreAchieved;
    }

    if (currentThrow === 0) {
      startingScoreRef.current = event.playerList[event.playerTurn].score;
    }

    const updatedPlayerScore =
      event.playerList[event.playerTurn].score - actualScore;
    const currentPlayerThrows =
      event.playerList[event.playerTurn].rounds[
        event.playerList[event.playerTurn].rounds.length - 1
      ];
    const throwKey = `throw${currentThrow + 1}` as
      | "throw1"
      | "throw2"
      | "throw3";

    currentPlayerThrows[throwKey] = actualScore;
    updateEvent({ playerScore: updatedPlayerScore });

    const isDoubleOutMode = event.selectedGameMode === "double-out";
    const isTripleOutMode = event.selectedGameMode === "triple-out";
    const wouldFinishGame = updatedPlayerScore === 0;
    const isDoubleThrow =
      typeof currentScoreAchieved === "string" &&
      isDouble(currentScoreAchieved);
    const isTripleThrow =
      typeof currentScoreAchieved === "string" &&
      isTriple(currentScoreAchieved);

    const startingScoreThisRound =
      startingScoreRef.current ?? event.playerList[event.playerTurn].score;

    if (
      actualScore > startingScoreThisRound ||
      updatedPlayerScore < 0 ||
      (isDoubleOutMode && updatedPlayerScore === 1) ||
      (isTripleOutMode && updatedPlayerScore === 1) ||
      (isTripleOutMode && updatedPlayerScore === 2) ||
      (wouldFinishGame && isDoubleOutMode && !isDoubleThrow) ||
      (wouldFinishGame && isTripleOutMode && !isTripleThrow)
    ) {
      functions.handleBust(startingScoreThisRound);
      playSound(ERROR_SOUND_PATH);
    } else {
      const updatedPlayerList = [...event.playerList];
      updatedPlayerList[event.playerTurn].score = updatedPlayerScore;
      updateEvent({ throwCount: currentThrow + 1 });
      playSound(THROW_SOUND_PATH);
    }

    // wir überprüfen, ob der aktuelle Spieler das Spiel beendet hat

    if (
      (updatedPlayerScore === 0 && isDoubleOutMode && isDoubleThrow) ||
      (updatedPlayerScore === 0 && !isDoubleOutMode && !isTripleOutMode) ||
      (updatedPlayerScore === 0 && isTripleOutMode && isTripleThrow)
    ) {
      if (event.playerList.length === 2) {
        functions.handleLastPlayer();
        return event.finishedPlayerList;
      } else if (event.finishedPlayerList.length < 1) {
        updateEvent({ isFinishGameOverlayOpen: true });
        playSound(WIN_SOUND_PATH);
      } else {
        functions.handlePlayerFinishTurn();
        return event.playerList;
      }
      updateEvent({ winnerList: event.finishedPlayerList });
    }
    const updatedPlayerlist = [...event.playerList];
    updatedPlayerlist[event.playerTurn] = {
      ...player,
      throwCount: event.throwCount,
    };
    updateEvent({ playerList: updatedPlayerlist });
  }
  // wir prüfen, ob der Spieler überworfen hat
  function handleBust(startingScore: number) {
    event.playerList[event.playerTurn].isBust = true;
    event.playerList[event.playerTurn].score = startingScore;
    changeActivePlayer();
  }
  //wir prüfen, ob der Spieler seinen Zug beendet hat
  function handlePlayerFinishTurn() {
    const updatedPlayerList = [...event.playerList];
    updatedPlayerList[event.playerTurn].isPlaying = false;
    const finishedPlayers = event.playerList.filter(
      (player) => !player.isPlaying
    );
    event.finishedPlayerList.push(finishedPlayers[0]);

    const unfinishedPlayers = event.playerList.filter(
      (player) => player.isPlaying
    );
    changeActivePlayer();
    const nextPlayerIndex =
      event.playerTurn > unfinishedPlayers.length - 1 ? 0 : event.playerTurn;
    unfinishedPlayers[nextPlayerIndex].isActive = true;
    updateEvent({
      playerList: unfinishedPlayers,
      finishedPlayerList: event.finishedPlayerList,
      playerTurn:
        event.playerTurn > unfinishedPlayers.length - 1 ? 0 : event.playerTurn,
    });
    updateEvent({ winnerList: event.finishedPlayerList });
  }

  function handleLastPlayer() {
    const updatedPlayerList = [...event.playerList];
    updatedPlayerList[event.playerTurn].isPlaying = false;

    const updatedFinishedPlayerList = [...event.finishedPlayerList];
    const playersWithNonZeroScore = event.playerList.filter(
      (player) => player.score !== 0
    );
    const playersWithZeroScore = event.playerList.filter(
      (player) => player.score === 0
    );
    updatedFinishedPlayerList.push(
      playersWithZeroScore[0],
      playersWithNonZeroScore[0]
    );
    updateEvent({ finishedPlayerList: updatedFinishedPlayerList });
  }
  // wir sortieren main-array in absteigender Reihenfolge
  function sortPlayer() {
    const sortedPlayers = [...event.playerList].sort(
      (a, b) => b.score - a.score
    );
    const updatedFinishedPlayerList = [
      ...event.finishedPlayerList,
      ...sortedPlayers,
    ];
    updateEvent({ finishedPlayerList: updatedFinishedPlayerList });
  }

  const functions: GameFunctions = {
    getFinishedGamesSummary,
    savedFinishedGameToLS,
    getAllPlayerStats,
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
    resetGame,
    undoFromSummary,
    handleUndo,
    handleGameModeClick,
    handlePointsClick,
    handleThrow,
    handleBust,
    handlePlayerFinishTurn,
    handleLastPlayer,
    sortPlayer,
    changeActivePlayer,
  };

  useEffect(() => {
    updateEvent({
      selectedPoints: storeSettings.points,
      selectedGameMode: storeSettings.gameMode,
    });
  }, [storeSettings.points, storeSettings.gameMode]);

  return (
    <UserContext.Provider value={{ event, updateEvent, functions }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
