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
import { $settings, newSettings } from "../stores/settings";
import { useStore } from "@nanostores/react";
import { NavigateFunction } from "react-router-dom";
import { createRematch, deletePlayerFromGame, recordThrow, undoLastThrow } from "../services/api";
import { persistInvitationToStorage, readInvitationFromStorage } from "../hooks/useRoomInvitation";
// import { UseInitializePlayers } from "../hooks/useInitializePlayers";

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
  id: string;
  date: string;
  playersCount: number;
  winnerName: string;
  winnerRounds: number;
  players: SavedGamePlayer[];
}

const getSelectedPlayersFromLS = (): PlayerProps[] => {
  if (sessionStorage.getItem("SelectedPlayers") !== null) {
    const playersFromLS = sessionStorage.getItem("SelectedPlayers");
    const playersFromLocalStorage = !!playersFromLS && JSON.parse(playersFromLS);
    return playersFromLocalStorage;
  } else {
    return [];
  }
};

interface GameState {
  // Start.tsx
  newPlayer: string;
  isNewPlayerOverlayOpen: boolean;
  selectedPlayers: PlayerProps[];
  // unselectedPlayers: PlayerProps[];
  dragEnd?: boolean;
  clickedPlayerId: number | null;
  errormessage: string;
  activeTab: string;
  list: PlayerProps[];
  userList: PlayerProps[];

  // summary
  winnerList: BASIC.WinnerPlayerProps[];
  lastHistory: BASIC.GameState[];

  // Game.tsx
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
  isInitialized: boolean;
  currentGameId: number | null;
  lastFinishedGameId: number | null;
  lastFinishedPlayerIds: number[];
}

interface GameFunctions {
  initializePlayerList: () => void;
  playSound: (soundType: string) => void;
  handleTabClick: (id: string, navigate: NavigateFunction) => void;
  // handleSelectPlayer: (name: string, id: number) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // handleKeyPess: (name: string) => (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleUnselect: (id: number, gameId?: number | null) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  // createPlayer: (name: string) => void;
  // getUserFromLS: () => PlayerProps[] | null;
  getSelectedPlayersFromLS: () => PlayerProps[];
  savedFinishedGameToLS: (players: BASIC.WinnerPlayerProps[]) => void;
  getAllPlayerStats: () => {
    id: number;
    name: string;
    games: number;
    averageRoundScore: number;
  }[];
  getFinishedGamesSummary(): GameSummury[];
  // addUnselectedUserListToLs: (players: PlayerProps[]) => void;
  addUserToLS: (name: string, id: number) => void;
  resetGame: () => void;
  undoFromSummary: () => void;
  handleUndo: () => Promise<void>;
  handleGameModeClick: (mode: string | number) => void;
  handlePointsClick: (points: string | number) => void;
  handleThrow: (
    value: BASIC.WinnerPlayerProps,
    throwCount: number,
    playerList: string | number,
  ) => Promise<void>;
  handleBust: (startingScore: number) => void;
  handlePlayerFinishTurn: () => void;
  handleLastPlayer: () => void;
  sortPlayer: () => void;
  changeActivePlayer: () => void;
  startRematch: (mode: "play-again" | "back-to-start") => Promise<void>;
  getNecessaryGameId: () => number | null;
  getLastFinishedPlayerIds: () => number[];
}

const defaultFunctions: GameFunctions = {
  initializePlayerList: () => {},
  playSound: () => {},
  handleTabClick: () => {},
  // handleSelectPlayer: () => {},
  handleChange: () => {},
  handleUnselect: () => {},
  handleDragEnd: () => {},
  // createPlayer: () => {},
  // addUnselectedUserListToLs: () => {},
  addUserToLS: () => {},
  resetGame: () => {},
  undoFromSummary: () => {},
  handleUndo: async () => {},
  handleGameModeClick: () => {},
  handlePointsClick: () => {},
  handleThrow: async () => {},
  handleBust: () => {},
  handlePlayerFinishTurn: () => {},
  handleLastPlayer: () => {},
  sortPlayer: () => {},
  changeActivePlayer: () => {},
  startRematch: () => Promise.resolve(),
  getNecessaryGameId: () => null,
  getLastFinishedPlayerIds: () => [],
  getAllPlayerStats: () => [],
  getFinishedGamesSummary: () => [],
  // // handleKeyPess: function (): (e: React.KeyboardEvent<HTMLInputElement>) => void {
  //   throw new Error("Function not implemented.");
  // },
  // getUserFromLS: function (): PlayerProps[] | null {
  //   throw new Error("Function not implemented.");
  // },
  getSelectedPlayersFromLS: function (): PlayerProps[] {
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

const initialInvitation = readInvitationFromStorage();

const initialValues: GameState = {
  //Start.tsx
  newPlayer: "",
  isNewPlayerOverlayOpen: false,
  selectedPlayers: getSelectedPlayersFromLS() /* <PlayerProps[]> */,
  // unselectedPlayers: [] /* <PlayerProps[]> */,
  dragEnd: undefined /* <boolean> */,
  clickedPlayerId: null /* <number | null> */,
  errormessage: "",
  activeTab: "game",

  //App.tsx:
  list: [] /* <PlayerProps[]> */,
  userList: getSelectedPlayersFromLS(),
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
  const startingScoreRef = useRef<number | null>(null);

  // all sounds
  // const SELECT_PLAYER_SOUND_PATH = "/sounds/select-sound.mp3";
  const UNSELECT_PLAYER_SOUND_PATH = "/sounds/unselect-sound.mp3";
  // const ADD_PLAYER_SOUND_PATH = "/sounds/add-player-sound.mp3";
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
    const initialPlayerList: PlayerProps[] = event.userList.map((user: BASIC.UserProps) => ({
      name: user.name,
      id: user.id,
      isAdded: false,
      isClicked: event.clickedPlayerId,
    }));
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
      const updatedSelectedPlayers = event.selectedPlayers.filter(
        (list: PlayerProps) => list.id !== id,
      );
      updateEvent({
        selectedPlayers: updatedSelectedPlayers,
        list: updatedSelectedPlayers,
      });

      sessionStorage.setItem("SelectedPlayers", JSON.stringify(updatedSelectedPlayers));
      functions.playSound(UNSELECT_PLAYER_SOUND_PATH);
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
      const activeIndex = event.selectedPlayers.findIndex(
        ({ id }: PlayerProps) => id === active.id,
      );
      const overIndex = event.selectedPlayers.findIndex(({ id }: PlayerProps) => id === over.id);
      const newArray: PlayerProps[] = arrayMove(event.selectedPlayers, activeIndex, overIndex);
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

  // diese Funktion speichert das beendete Spiel im LS
  function savedFinishedGameToLS(players: BASIC.WinnerPlayerProps[]) {
    if (!Array.isArray(players) || players.length === 0) {
      console.warn("There are no players to save");
      return null;
    }
    const savedGames = JSON.parse(localStorage.getItem("FinishedGames") || "[]");

    const isDuplicate = savedGames.some((game: SavedGame) => {
      const samePlayers =
        game.players.length === players.length &&
        game.players.every((p, i) => p.id === players[i].id);

      const closeDate = Math.abs(new Date(game.date).getTime() - new Date().getTime()) < 2000;

      return samePlayers && closeDate;
    });

    if (isDuplicate) {
      console.warn("Duplicate game not saved");
      return;
    }
    const gameSummary = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      players: players.map((player) => {
        const rounds = Array.isArray(player.rounds) ? player.rounds : [];

        const completedRounds =
          rounds[rounds.length - 1]?.throw1 === undefined ? rounds.length - 1 : rounds.length;

        let totalScorePoints = 0;

        for (let i = 0; i < completedRounds; i++) {
          const round = rounds[i];
          for (const throwKey of ["throw1", "throw2", "throw3"] as const) {
            const value = round[throwKey];
            if (typeof value === "number") {
              totalScorePoints += value;
            }
          }
        }
        const scoreAverage =
          completedRounds > 0 ? Number((totalScorePoints / completedRounds).toFixed(2)) : 0;

        return {
          id: player.id,
          name: player.name,
          totalScore: totalScorePoints,
          roundCount: completedRounds,
          scoreAverage,
          rounds,
          won: player.score === 0,
        };
      }),
    };
    savedGames.push(gameSummary);
    localStorage.setItem("FinishedGames", JSON.stringify(savedGames));
  }

  // diese Funktion holt alle Spielerstatisitken aus dem LS, um sie auf der Seite PlayerStats anzuzeigen
  function getAllPlayerStats(): {
    id: number;
    name: string;
    games: number;
    averageRoundScore: number;
    scoreAverage: number;
  }[] {
    const savedGames = JSON.parse(localStorage.getItem("FinishedGames") || "[]");

    const statMap: Record<
      number,
      {
        id: number;
        name: string;
        games: number;
        totalScore: number;
        completedRounds: number;
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
            completedRounds: 0,
          };
        }

        statMap[player.id].games += 1;

        if (Array.isArray(player.rounds)) {
          const rounds = player.rounds;
          const completedRounds =
            rounds[rounds.length - 1]?.throw1 === undefined ? rounds.length - 1 : rounds.length;

          let totalScore = 0;
          for (let i = 0; i < completedRounds; i++) {
            const round = rounds[i];
            for (const key of ["throw1", "throw2", "throw3"] as const) {
              const value = round[key];
              if (typeof value === "number") {
                totalScore += value;
              }
            }
          }
          statMap[player.id].totalScore += totalScore;
          statMap[player.id].completedRounds += completedRounds;
        }
      }
    }

    return Object.values(statMap).map((player) => ({
      id: player.id,
      name: player.name,
      games: player.games,
      scoreAverage:
        player.completedRounds > 0
          ? Number((player.totalScore / player.completedRounds).toFixed(2))
          : 0,
      averageRoundScore:
        player.completedRounds > 0
          ? Number((player.totalScore / player.completedRounds).toFixed(2))
          : 0,
    }));
  }

  // diese Funktion holt alle Spieldaten aus dem LS, um sie auf der Seite Games Overview anzuzeigen
  function getFinishedGamesSummary(): GameSummury[] {
    const savedGames: SavedGame[] = JSON.parse(localStorage.getItem("FinishedGames") || "[]");

    return savedGames.map((game: SavedGame) => {
      const players = Array.isArray(game.players) ? game.players : [];
      const playersCount = players.length;

      const winner = players.find((p: SavedGamePlayer) => p.won);
      const winnerName = winner?.name || "";
      const winnerRounds = winner && Array.isArray(winner?.rounds) ? winner.rounds.length : 0;

      return {
        id: game.id,
        date: game.date || "",
        players: players,
        playersCount,
        winnerName,
        winnerRounds,
      };
    });
  }

  // function addUnselectedUserListToLs(unselectedPlayers: PlayerProps[]) {
  //   localStorage.setItem("UserUnselected", JSON.stringify(unselectedPlayers));
  // }
  // dieser UseEffect holt das gespeicherte Spiel aus dem LS und stellt es wieder her
  useEffect(() => {
    const savedGame = localStorage.getItem("OngoingGame");
    if (savedGame) {
      try {
        const parsed = JSON.parse(savedGame);
        if (parsed.playerList && parsed.playerList.length > 0) {
          updateEvent(parsed);
        }
      } catch (error) {
        console.error("Error parce Ongoinggame", error);
      }
    }
    updateEvent({ isInitialized: true });
  }, [updateEvent]);

  // dieser UseEffect speichert das begonnene Spiel in LS, um es bei einer Fensteraktualisierung alles wiederherzustellen
  useEffect(() => {
    if (!event.isInitialized) return;
    const gameStateToSave = {
      playerList: event.playerList,
      finishedPlayerList: event.finishedPlayerList,
      roundsCount: event.roundsCount,
      throwCount: event.throwCount,
      playerTurn: event.playerTurn,
      selectedPoints: event.selectedPoints,
      selectedGameMode: event.selectedGameMode,
      history: event.history,
      list: event.selectedPlayers,
      winnerList: event.winnerList,
    };
    localStorage.setItem("OngoingGame", JSON.stringify(gameStateToSave));
  }, [
    event.isInitialized,
    event.playerList,
    event.finishedPlayerList,
    event.roundsCount,
    event.throwCount,
    event.playerTurn,
    event.selectedGameMode,
    event.selectedPoints,
    event.history,
    event.selectedPlayers,
    event.winnerList,
  ]);

  // Save selectedPlayers to localStorage
  useEffect(() => {
    sessionStorage.setItem("SelectedPlayers", JSON.stringify(event.selectedPlayers));
  }, [event.selectedPlayers]);

  function addUserToLS(name: string, id: number) {
    const newUserList = [...event.userList];
    newUserList.push({ name, id });
    updateEvent({ userList: newUserList });
    sessionStorage.setItem("User", JSON.stringify(newUserList));
  }
  // diese Funktion ist für den PlayAgain button
  function resetGame() {
    updateEvent({
      playerScore: event.selectedPoints,
      roundsCount: 1,
      throwCount: 0,
      playerTurn: 0,
      finishedPlayerList: [],
      history: [],
    });
    const initialPlayerList: BASIC.WinnerPlayerProps[] = event.selectedPlayers.map(
      (user: PlayerProps, i: number) => ({
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
      }),
    );
    updateEvent({ playerList: initialPlayerList });
  }
  function undoFromSummary() {
    updateEvent({ history: event.lastHistory });
    functions.handleUndo();
  }

  async function handleUndo() {
    if (event.history.length > 0) {
      const newHistory = [...event.history];
      const lastState = newHistory.pop();

      if (event.currentGameId) {
        try {
          await undoLastThrow(event.currentGameId);
        } catch (error) {
          console.error("Failed to undo throw on server:", error);
          updateEvent({
            errormessage: "Error undoing throw on server, try again.",
          });
        }
      }

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
    if (!event.playerList || event.playerList.length === 0) return;

    const prevPlayerTurnIndex = event.playerTurn;
    const newPlayerTurnIndex = event.playerTurn + 1;
    const newPlayerList: BASIC.WinnerPlayerProps[] = [...event.playerList];

    if (!newPlayerList[prevPlayerTurnIndex]) {
      console.warn("Current player not found in playerList", prevPlayerTurnIndex);
      return;
    }

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

  function parseThrowValue(raw: number | string): {
    baseValue: number;
    isDoubleThrow: boolean;
    isTripleThrow: boolean;
    actualScore: number;
  } {
    if (typeof raw === "number") {
      return {
        baseValue: raw,
        isDoubleThrow: false,
        isTripleThrow: false,
        actualScore: raw,
      };
    }

    const type = raw.charAt(0);
    const value = parseInt(raw.slice(1));
    if (isNaN(value)) {
      throw new Error("Invalid value: " + raw);
    }

    const isDoubleThrow = type === "D";
    const isTripleThrow = type === "T";

    const multiplier = isTripleThrow ? 3 : isDoubleThrow ? 2 : 1;

    return {
      baseValue: value,
      isDoubleThrow,
      isTripleThrow,
      actualScore: value * multiplier,
    };
  }

  async function handleThrow(
    player: BASIC.WinnerPlayerProps,
    currentThrow: number,
    currentScoreAchieved: number | string,
  ) {
    updateEvent({
      history: [
        ...event.history,
        {
          finishedPlayerList: JSON.parse(JSON.stringify(event.finishedPlayerList)),
          playerList: JSON.parse(JSON.stringify(event.playerList)),
          playerScore: event.playerScore,
          throwCount: event.throwCount,
          playerTurn: event.playerTurn,
          roundsCount: event.roundsCount,
        },
      ],
    });

    let parsedThrow: ReturnType<typeof parseThrowValue>;
    try {
      parsedThrow = parseThrowValue(currentScoreAchieved);
    } catch (error) {
      console.error(error);
      return;
    }

    const actualScore = parsedThrow.actualScore;

    if (currentThrow === 0) {
      startingScoreRef.current = event.playerList[event.playerTurn].score;
    }

    const updatedPlayerScore = event.playerList[event.playerTurn].score - actualScore;
    const currentPlayerThrows =
      event.playerList[event.playerTurn].rounds[
        event.playerList[event.playerTurn].rounds.length - 1
      ];
    const throwKey = `throw${currentThrow + 1}` as "throw1" | "throw2" | "throw3";

    currentPlayerThrows[throwKey] = currentScoreAchieved;
    updateEvent({ playerScore: updatedPlayerScore });

    const isDoubleOutMode = event.selectedGameMode === "double-out";
    const isTripleOutMode = event.selectedGameMode === "triple-out";
    const wouldFinishGame = updatedPlayerScore === 0;
    const startingScoreThisRound =
      startingScoreRef.current ?? event.playerList[event.playerTurn].score;
    const isDoubleThrow = parsedThrow.isDoubleThrow;
    const isTripleThrow = parsedThrow.isTripleThrow;
    const isBustThrow =
      actualScore > startingScoreThisRound ||
      updatedPlayerScore < 0 ||
      (isDoubleOutMode && updatedPlayerScore === 1) ||
      (isTripleOutMode && updatedPlayerScore === 1) ||
      (isTripleOutMode && updatedPlayerScore === 2) ||
      (wouldFinishGame && isDoubleOutMode && !isDoubleThrow) ||
      (wouldFinishGame && isTripleOutMode && !isTripleThrow);

    if (event.currentGameId) {
      try {
        await recordThrow(event.currentGameId, {
          playerId: player.id,
          value: parsedThrow.baseValue,
          isDouble: isDoubleThrow,
          isTriple: isTripleThrow,
          isBust: isBustThrow,
        });
      } catch (error) {
        console.error("Failed to record throw:", error);
        updateEvent({
          errormessage: "Error recording throw on server, try again.",
        });
      }
    }

    if (isBustThrow) {
      functions.handleBust(startingScoreThisRound);
      playSound(ERROR_SOUND_PATH);
    } else {
      const updatedPlayerList = [...event.playerList];
      updatedPlayerList[event.playerTurn].score = updatedPlayerScore;
      updateEvent({ throwCount: currentThrow + 1 });
      playSound(THROW_SOUND_PATH);
    }

    // wir überprüfen, ob der aktuelle Spieler das Spiel beendet hat

    const isGameFinished =
      (updatedPlayerScore === 0 && isDoubleOutMode && isDoubleThrow) ||
      (updatedPlayerScore === 0 && !isDoubleOutMode && !isTripleOutMode) ||
      (updatedPlayerScore === 0 && isTripleOutMode && isTripleThrow);

    if (isGameFinished) {
      // wenn nur noch 2 Spieler und einer gewinnt, dann ist das Spiel vorbei
      if (event.playerList.length === 2) {
        functions.handleLastPlayer();
        playSound(WIN_SOUND_PATH);
        return;
      }

      // wenn mehr als 2 Spieler, aber ein Spieler gewinnt, wir zeigen das Overlay an
      if (event.finishedPlayerList.length < 1) {
        updateEvent({ isFinishGameOverlayOpen: true });
        playSound(WIN_SOUND_PATH);
        return;
      }

      // jemand hat gewonnen und jemand bis 0 erreicht
      functions.handlePlayerFinishTurn();
      return;
    }

    const updatedPlayerList = [...event.playerList];
    updatedPlayerList[event.playerTurn] = {
      ...player,
      throwCount: event.throwCount,
    };
    updateEvent({ playerList: updatedPlayerList });
  }

  // if (
  //   (updatedPlayerScore === 0 && isDoubleOutMode && isDoubleThrow) ||
  //   (updatedPlayerScore === 0 && !isDoubleOutMode && !isTripleOutMode) ||
  //   (updatedPlayerScore === 0 && isTripleOutMode && isTripleThrow)
  // ) {
  //   if (event.playerList.length === 2) {
  //     functions.handleLastPlayer();
  //   } else if (event.finishedPlayerList.length < 1) {
  //     updateEvent({ isFinishGameOverlayOpen: true, winnerList: event.finishedPlayerList });
  //     playSound(WIN_SOUND_PATH);
  //     return;
  //   } else {
  //     functions.handlePlayerFinishTurn();
  //   }
  //   }
  //   updateEvent({ winnerList: event.finishedPlayerList });
  //   }
  //   const updatedPlayerlist = [...event.playerList];
  //   updatedPlayerlist[event.playerTurn] = {
  //     ...player,
  //     throwCount: event.throwCount,
  //   };
  //   updateEvent({ playerList: updatedPlayerlist });
  // }
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
    const finishedPlayers = event.playerList.filter((player) => !player.isPlaying);
    event.finishedPlayerList.push(finishedPlayers[0]);

    const unfinishedPlayers = event.playerList.filter((player) => player.isPlaying);
    changeActivePlayer();
    const nextPlayerIndex = event.playerTurn > unfinishedPlayers.length - 1 ? 0 : event.playerTurn;
    unfinishedPlayers[nextPlayerIndex].isActive = true;
    updateEvent({
      playerList: unfinishedPlayers,
      finishedPlayerList: event.finishedPlayerList,
      playerTurn: event.playerTurn > unfinishedPlayers.length - 1 ? 0 : event.playerTurn,
    });
    updateEvent({ winnerList: event.finishedPlayerList });
  }

  function handleLastPlayer() {
    const currentPlayerList = [...event.playerList];
    currentPlayerList[event.playerTurn].isPlaying = false;

    // sortieren der Spieler in Gewinner und Verlierer
    const playersWithZeroScore = currentPlayerList.filter((player) => player.score === 0);
    const playersWithNonZeroScore = currentPlayerList.filter((player) => player.score !== 0);

    const updatedFinishedPlayerList = [
      ...event.finishedPlayerList,
      playersWithZeroScore[0],
      playersWithNonZeroScore[0],
    ];

    updateEvent({
      playerList: [],
      finishedPlayerList: updatedFinishedPlayerList,
      winnerList: updatedFinishedPlayerList,
    });
  }
  // wir sortieren main-array in absteigender Reihenfolge
  function sortPlayer() {
    const sortedPlayers = [...event.playerList].sort((a, b) => b.score - a.score);
    const updatedFinishedPlayerList = [...event.finishedPlayerList, ...sortedPlayers];
    updateEvent({ finishedPlayerList: updatedFinishedPlayerList });
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

  const getLastFinishedPlayerIds = () => {
    if (event.selectedPlayers.length > 0) {
      return event.selectedPlayers.map((p) => p.id);
    }
    return event.lastFinishedPlayerIds;
  };

  async function startRematch(mode: "play-again" | "back-to-start"): Promise<void> {
    const storedInvitation = readInvitationFromStorage();
    const prevGameId = event.currentGameId ?? storedInvitation?.gameId ?? null;
    const lastFinishedGameId = prevGameId ?? event.lastFinishedGameId ?? null;

    if (mode === "back-to-start") {
      persistInvitationToStorage(null);
      updateEvent({
        currentGameId: null,
        lastFinishedGameId,
        playerList: [],
        finishedPlayerList: [],
        winnerList: [],
        history: [],
        throwCount: 0,
        roundsCount: 1,
        playerTurn: 0,
        list: event.selectedPlayers,
      });
      return;
    }

    if (!prevGameId) {
      console.warn("No previous game ID found for rematch.");
      return;
    }

    try {
      const rematch = await createRematch(prevGameId); // { success, gameId, invitationLink }

      persistInvitationToStorage({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      updateEvent({
        currentGameId: rematch.gameId,
        lastFinishedGameId,
      });

      resetGame();
    } catch (error) {
      console.error("Failed to start rematch:", error);
    }
  }

  const functions: GameFunctions = {
    getFinishedGamesSummary,
    savedFinishedGameToLS,
    getAllPlayerStats,
    initializePlayerList,
    playSound,
    handleTabClick,
    // handleSelectPlayer,
    handleChange,
    // handleKeyPess,
    handleUnselect,
    handleDragEnd,
    // createPlayer,
    getSelectedPlayersFromLS,
    //addUnselectedUserListToLs,
    addUserToLS,
    resetGame,
    undoFromSummary,
    handleUndo,
    handleGameModeClick,
    handlePointsClick,
    handleThrow,
    startRematch,
    getNecessaryGameId,
    getLastFinishedPlayerIds,
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
