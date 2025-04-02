import Keyboard from "../../components/Keyboard/Keyboard";
import "./game.css";
import Back from "../../icons/back.svg";
import { Link, useNavigate } from "react-router-dom";
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import GamePlayerItemList from "../../components/GamePlayerItem/GamplayerItemList";
import Overlay from "../../components/Overlay/Overlay";
import Button from "../../components/Button/Button";
import NumberButton from "../../components/Keyboard/NumberButton";
import FinishedGamePlayerItemList from "../../components/GamePlayerItem/FinishedGamePlayerItemList";
import LinkButton from "../../components/LinkButton/LinkButton";
import deleteIcon from "../../icons/delete.svg";
import Undo from "../../icons/undo-copy.svg";
import { PlayerProps } from "../Start/start";
import { $settings, newSettings, SettingsType } from "../../stores/settings";
import { useStore } from "@nanostores/react";

interface GameState {
  finishedPlayerList: BASIC.WinnerPlayerProps[];
  playerList: BASIC.WinnerPlayerProps[];
  playerScore: number;
  roundsCount: number;
  throwCount: number;
  playerTurn: number;
}

type Props = {
  players: PlayerProps[];
  setWinnerList: Dispatch<BASIC.WinnerPlayerProps[] | undefined>;
  undoFromSummary: boolean;
  setUndoFromSummary: Dispatch<boolean | undefined>;
  setLastHistory: Dispatch<GameState[]>;
  lastHistory: GameState[];
  setUndoLastHistory: Dispatch<SetStateAction<boolean>>;
  undoLastHistory: boolean;
};

function Game({
  players,
  setWinnerList,
  undoFromSummary,
  setUndoFromSummary,
  setLastHistory,
  lastHistory,
}: Props) {
  const navigate = useNavigate();
  const settings: SettingsType = useStore($settings);
  const [playerScore, setPlayerScore] = useState<number>(settings.points);
  const startingScoreRef = useRef<number | null>(null);
  const [roundsCount, setRoundsCount] = useState(1);
  const [playerList, setPlayerList] = useState<BASIC.WinnerPlayerProps[]>([]);
  const [throwCount, setThrowCount] = useState(0);
  const [playerTurn, setPlayerTurn] = useState(0);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isSettingsOverlayOpen, setIsSettingsOverlayOpen] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(settings.points);
  const [selectedGameMode, setSelectedGameMode] = useState(settings.gameMode);
  const [history, setHistory] = useState<GameState[]>([]);
  const [finishedPlayerList, setFinishedPlayerList] = useState<
    BASIC.WinnerPlayerProps[]
  >([]);
  const [undoLastHistory, setUndoLastHistory] = useState(false);
  const ERROR_SOUND_PATH = "/sounds/error-sound.mp3";
  const THROW_SOUND_PATH = "/sounds/throw-sound.mp3";
  const WIN_SOUND_PATH = "/sounds/win-sound.mp3";
  const UNDO_SOUND_PATH = "/sounds/undo-sound.mp3";

  function initializePlayerList() {
    const initialPlayerlist: BASIC.WinnerPlayerProps[] = players.map(
      (user: BASIC.UserProps, i: number) => ({
        id: user.id,
        name: user.name,
        score: playerScore,
        isActive: i === 0 ? true : false,
        index: i,
        rounds: [
          {
            throw1: undefined,
            throw2: undefined,
            throw3: undefined,
          } as BASIC.Round,
        ],
        isPlaying: true,
        isBust: false,
        throwCount: 0,
      })
    );
    setPlayerList(initialPlayerlist);
  }

  function changeActivePlayer() {
    const prevPlayerTurnIndex = playerTurn;
    const newPlayerTurnIndex = playerTurn + 1;
    const newPlayerList: BASIC.WinnerPlayerProps[] = [...playerList];

    newPlayerList[prevPlayerTurnIndex].isActive = false;
    const isEndOfArray = newPlayerTurnIndex > newPlayerList.length - 1;
    const handleNewIndex = isEndOfArray ? 0 : newPlayerTurnIndex;
    newPlayerList[handleNewIndex].isBust = false;
    newPlayerList[handleNewIndex].isActive = true;
    setPlayerList(newPlayerList);
    setPlayerTurn(handleNewIndex);
    setThrowCount(0);

    if (isEndOfArray) {
      setRoundsCount(roundsCount + 1);
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
    setSelectedGameMode(gameMode);
  };

  const handlePointsClick = (points: number) => {
    setSelectedPoints(points);
  };

  function playSound(path: string) {
    const audio = new Audio(path);
    audio.play();
    if (path === THROW_SOUND_PATH) {
      audio.currentTime = 2.3;
    } else if (path === UNDO_SOUND_PATH) {
      audio.currentTime = 0.2;
      audio.volume = 0.1;
    }
  }

  const isDouble = (throwValue: string) =>
    typeof throwValue === "string" && throwValue.startsWith("D");

  const isTriple = (throwValue: string) =>
    typeof throwValue === "string" && throwValue.startsWith("T");

  function handleThrow(
    player: BASIC.WinnerPlayerProps,
    currentThrow: number,
    currentScoreAchieved: number | string | any
  ) {
    setHistory([
      ...history,
      {
        finishedPlayerList: JSON.parse(JSON.stringify(finishedPlayerList)),
        playerList: JSON.parse(JSON.stringify(playerList)),
        playerScore,
        throwCount,
        playerTurn,
        roundsCount,
      },
    ]);

    let actualScore: number = 0;
    let type = "";
    if (typeof currentScoreAchieved === "string") {
      type = currentScoreAchieved.charAt(0);
      const value = parseInt(currentScoreAchieved.substring(1));

      if (type === "D") {
        actualScore = value * 2;
      } else if (type === "T") {
        actualScore = value * 3;
      }
    } else {
      actualScore = currentScoreAchieved;
    }

    if (currentThrow === 0) {
      startingScoreRef.current = playerList[playerTurn].score;
    }

    const updatedPlayerScore = playerList[playerTurn].score - actualScore;
    const currentPlayerThrows =
      playerList[playerTurn].rounds[playerList[playerTurn].rounds.length - 1];
    const throwKey = `throw${currentThrow + 1}` as
      | "throw1"
      | "throw2"
      | "throw3";

    currentPlayerThrows[throwKey] = currentScoreAchieved;
    setPlayerScore(updatedPlayerScore);

    const isDoubleOutMode = selectedGameMode === "double-out";
    const isTripleOutMode = selectedGameMode === "triple-out";
    const wouldFinishGame = updatedPlayerScore === 0;
    const isDoubleThrow = isDouble(currentScoreAchieved);
    const isTripleThrow = isTriple(currentScoreAchieved);

    const startingScoreThisRound =
      startingScoreRef.current ?? playerList[playerTurn].score;

    if (
      actualScore > startingScoreThisRound ||
      updatedPlayerScore < 0 ||
      (isDoubleOutMode && updatedPlayerScore === 1) ||
      (isTripleOutMode && updatedPlayerScore === 1) ||
      (isTripleOutMode && updatedPlayerScore === 2) ||
      (wouldFinishGame && isDoubleOutMode && !isDoubleThrow) ||
      (wouldFinishGame && isTripleOutMode && !isTripleThrow)
    ) {
      handleBust(startingScoreThisRound);
      playSound(ERROR_SOUND_PATH);
    } else {
      const updatedPlayerList = [...playerList];
      updatedPlayerList[playerTurn].score = updatedPlayerScore;
      setThrowCount(currentThrow + 1);
      playSound(THROW_SOUND_PATH);
    }

    // wir überprüfen, ob der aktuelle Spieler das Spiel beendet hat

    if (
      (updatedPlayerScore === 0 && isDoubleOutMode && isDoubleThrow) ||
      (updatedPlayerScore === 0 && !isDoubleOutMode && !isTripleOutMode) ||
      (updatedPlayerScore === 0 && isTripleOutMode && isTripleThrow)
    ) {
      if (playerList.length === 2) {
        handleLastPlayer();
        return finishedPlayerList;
      } else if (finishedPlayerList.length < 1) {
        setIsOverlayOpen(true);
        playSound(WIN_SOUND_PATH);
      } else {
        handlePlayerFinishTurn();
        return playerList;
      }
      setWinnerList(finishedPlayerList);
    }
    const updatedPlayerlist = [...playerList];
    updatedPlayerlist[playerTurn] = { ...player, throwCount };
    setPlayerList(updatedPlayerlist);
  }
  // wir prüfen, ob der Spieler überworfen hat
  function handleBust(startingScore: number) {
    playerList[playerTurn].isBust = true;
    playerList[playerTurn].score = startingScore;
    changeActivePlayer();
  }
  //wir prüfen, ob der Spieler seinen Zug beendet hat
  function handlePlayerFinishTurn() {
    const updatedPlayerList = [...playerList];
    updatedPlayerList[playerTurn].isPlaying = false;
    const finishedPlayers = playerList.filter((player) => !player.isPlaying);
    finishedPlayerList.push(finishedPlayers[0]);

    const unfinishedPlayers = playerList.filter((player) => player.isPlaying);
    changeActivePlayer();
    const nextPlayerIndex =
      playerTurn > unfinishedPlayers.length - 1 ? 0 : playerTurn;
    unfinishedPlayers[nextPlayerIndex].isActive = true;
    setPlayerList(unfinishedPlayers);
    setFinishedPlayerList(finishedPlayerList);
    setPlayerTurn(playerTurn > unfinishedPlayers.length - 1 ? 0 : playerTurn);
    setWinnerList(finishedPlayerList);
  }

  function handleLastPlayer() {
    const updatedPlayerList = [...playerList];
    updatedPlayerList[playerTurn].isPlaying = false;

    const updatedFinishedPlayerList = [...finishedPlayerList];
    const playersWithNonZeroScore = playerList.filter(
      (player) => player.score !== 0
    );
    const playersWithZeroScore = playerList.filter(
      (player) => player.score === 0
    );
    updatedFinishedPlayerList.push(
      playersWithZeroScore[0],
      playersWithNonZeroScore[0]
    );
    setFinishedPlayerList(updatedFinishedPlayerList);
  }
  // wir sortieren main-array in absteigender Reihenfolge
  function sortPlayer() {
    const sortedPlayers = [...playerList].sort((a, b) => b.score - a.score);
    const updatedFinishedPlayerList = [...finishedPlayerList, ...sortedPlayers];
    setFinishedPlayerList(updatedFinishedPlayerList);
  }

  function handleUndo() {
    if (history.length > 0) {
      const newHistory = [...history];
      const lastState = newHistory.pop();
      if (lastState) {
        setFinishedPlayerList(lastState.finishedPlayerList);
        setPlayerList(lastState.playerList);
        setPlayerScore(lastState.playerScore);
        setThrowCount(lastState.throwCount);
        setPlayerTurn(lastState.playerTurn);
        setRoundsCount(lastState.roundsCount);
        setHistory(newHistory);
        playSound(UNDO_SOUND_PATH);
      }
    }
  }

  useEffect(() => {
    initializePlayerList();
  }, []);

  useEffect(() => {
    if (throwCount === 3 && !isOverlayOpen) {
      changeActivePlayer();
    }
  }, [throwCount, isOverlayOpen]);

  useEffect(() => {
    if (finishedPlayerList.length === players.length) {
      setWinnerList(finishedPlayerList);
      setLastHistory(history);
      navigate("/summary");
      if (players.length === 2) {
        playSound(WIN_SOUND_PATH);
      }
    }
  }, [finishedPlayerList.length, players.length]);

  useEffect(() => {
    if (!playerList || playerList.length === 0) return;

    if (playerTurn === 5 || playerTurn + 1 === playerList.length) {
      const player = document.getElementById(`playerid-${playerTurn}`);
      player?.scrollIntoView({
        behavior: "smooth",
      });
    } else if (playerTurn === 0) {
      window.scroll({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [playerTurn, playerList.length]);

  useEffect(() => {
    if (undoFromSummary) {
      setHistory(lastHistory);
      setUndoFromSummary(false);
      setUndoLastHistory(true);
    }
  }, [
    undoFromSummary,
    lastHistory,
    setLastHistory,
    setUndoFromSummary,
    setUndoLastHistory,
  ]);

  useEffect(() => {
    if (undoLastHistory) {
      handleUndo();
      setUndoLastHistory(false);
    }
  }, [undoLastHistory]);
  return (
    <>
      <Overlay className="overlayBox" isOpen={isOverlayOpen} src={undefined}>
        <div className="finishGameOverlay">
          <p className="overlayHeading">Continue Game?</p>
          <div>
            <Button
              label="Finish"
              isLink
              handleClick={sortPlayer}
              type="secondary"
              isInverted={true}
              link={""}
            />
            <Button
              label="Continue"
              handleClick={() => {
                handlePlayerFinishTurn();
                setIsOverlayOpen(false);
              }}
              type="primary"
              link={""}
            />
            <LinkButton
              icon={Undo}
              label="Undo Throw"
              handleClick={() => {
                setIsOverlayOpen(false);
                handleUndo();
              }}
              className="undoThrow"
            />
          </div>
        </div>
      </Overlay>

      <Overlay
        className="overlayBox"
        src={deleteIcon}
        isOpen={isSettingsOverlayOpen}
        onClose={() => {
          setIsSettingsOverlayOpen(false);
        }}
      >
        <div className="settingsOverlay">
          <p className="overlayHeading">Settings</p>

          <div className="overlayBody">
            <div className="settingsContainer">
              <div>Game Mode</div>
              <div className="buttonContainer">
                <button
                  className={`${
                    selectedGameMode === "single-out" ? "active" : ""
                  }`}
                  onClick={() => handleGameModeClick("single-out")}
                >
                  Single-out
                </button>
                <button
                  className={`${
                    selectedGameMode === "double-out" ? "active" : ""
                  }`}
                  onClick={() => handleGameModeClick("double-out")}
                >
                  Double-out
                </button>
                <button
                  className={`${
                    selectedGameMode === "triple-out" ? "active" : ""
                  }`}
                  onClick={() => handleGameModeClick("triple-out")}
                >
                  Triple-out
                </button>
              </div>
            </div>
            <div className="settingsContainer">
              <div>Punkte</div>
              <div className="buttonContainer">
                <button
                  className={`${selectedPoints === 101 ? "active" : ""}`}
                  onClick={() => handlePointsClick(101)}
                >
                  101
                </button>
                <button
                  className={`${selectedPoints === 201 ? "active" : ""}`}
                  onClick={() => handlePointsClick(201)}
                >
                  201
                </button>
                <button
                  className={`${selectedPoints === 301 ? "active" : ""}`}
                  onClick={() => handlePointsClick(301)}
                >
                  301
                </button>
                <button
                  className={`${selectedPoints === 401 ? "active" : ""}`}
                  onClick={() => handlePointsClick(401)}
                >
                  401
                </button>
                <button
                  className={`${selectedPoints === 501 ? "active" : ""}`}
                  onClick={() => handlePointsClick(501)}
                >
                  501
                </button>
              </div>
            </div>
          </div>
          <Button
            className="settingsOverlayBtn"
            type="primary"
            label="Save"
            handleClick={() => {
              newSettings(selectedGameMode, selectedPoints);
              console.log("test", selectedGameMode, selectedPoints);
              setIsSettingsOverlayOpen(false);
            }}
            link={""}
          />
        </div>
      </Overlay>

      <div className="gamePageHeader">
        <Link to="/" className="top">
          <img src={Back} alt="Back to Home" />
        </Link>
      </div>
      <div className="gamePlayerItemContainer">
        <GamePlayerItemList
          userMap={playerList}
          score={playerList[playerTurn]?.score}
          round={roundsCount}
          isBust={playerList[playerTurn]?.isBust}
          throwCount={playerList[playerTurn]?.throwCount}
        />
        <FinishedGamePlayerItemList userMap={finishedPlayerList} />
      </div>
      <div className="keyboard-and-undo">
        <NumberButton value="Undo" handleClick={handleUndo} />
        <Keyboard
          handleClick={(value) =>
            handleThrow(playerList[playerTurn], throwCount, value)
          }
          isOverlayOpen={isOverlayOpen}
        />
      </div>
      <LinkButton
        className="settingsBtn"
        label="Settings"
        handleClick={() => setIsSettingsOverlayOpen(true)}
      />
    </>
  );
}
export default Game;
