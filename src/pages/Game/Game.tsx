import Keyboard from "../../components/Keyboard/Keyboard";
import "./game.css";
import Back from "../../icons/back.svg";
import { Link, useNavigate } from "react-router-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import GamePlayerItemList from "../../components/GamePlayerItem/GamplayerItemList";
import Overlay from "../../components/Overlay/Overlay";
import Button from "../../components/Button/Button";
import NumberButton from "../../components/Keyboard/NumberButton";
import FinishedGamePlayerItemList from "../../components/GamePlayerItem/FinishedGamePlayerItemList";
import LinkButton from "../../components/LinkButton/LinkButton";
import Undo from "../../icons/undo-copy.svg";
import { PlayerProps } from "../Start/Start";

type Props = {
  players: PlayerProps[];
  setWinnerList: Dispatch<SetStateAction<BASIC.PlayerProps[]>>;
  undoFromSummary: boolean;
  setUndoFromSummary: Dispatch<SetStateAction<boolean>>;
  setLastHistory: Dispatch<SetStateAction<any>>;
  lastHistory: any;
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
  const [playerScore, setPlayerScore] = useState(301);
  const [roundsCount, setRoundsCount] = useState(1);
  const [playerList, setPlayerList] = useState<BASIC.PlayerProps[]>([]);
  const [throwCount, setThrowCount] = useState(0);
  const [playerTurn, setPlayerTurn] = useState(0);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [finishedPlayerList, setFinishedPlayerList] = useState<
    BASIC.PlayerProps[]
  >([]);
  const [undoLastHistory, setUndoLastHistory] = useState(false);
  const ERROR_SOUND_PATH = "/sounds/error-sound.mp3";
  const THROW_SOUND_PATH = "/sounds/throw-sound.mp3";
  const WIN_SOUND_PATH = "/sounds/win-sound.mp3";
  const UNDO_SOUND_PATH = "/sounds/undo-sound.mp3";

  function initializePlayerList() {
    const initialPlayerlist: BASIC.PlayerProps[] = players.map(
      (user: BASIC.UserProps, i: number) => ({
        id: user.id,
        name: user.name,
        score: playerScore,
        isActive: i === 0 ? true : false,
        index: i,
        rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
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
    const newPlayerList: BASIC.PlayerProps[] = [...playerList];

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
        });
      });
    }
  }

  function playSound(path: string) {
    var audio = new Audio(path);
    audio.play();
    if (path === THROW_SOUND_PATH) {
      audio.currentTime = 2.3;
    } else if (path === UNDO_SOUND_PATH) {
      audio.currentTime = 0.2;
      audio.volume = 0.1;
    }
  }

  function handleThrow(
    player: BASIC.PlayerProps,
    currentThrow: number,
    currentScoreAchieved: number | any
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

    const updatedPlayerScore =
      playerList[playerTurn].score - currentScoreAchieved;
    const currentPlayerThrows =
      playerList[playerTurn].rounds[playerList[playerTurn].rounds.length - 1];
    const throwKey = `throw${
      currentThrow + 1
    }` as keyof typeof currentPlayerThrows;

    currentPlayerThrows[throwKey] = currentScoreAchieved;
    setPlayerScore(updatedPlayerScore);

    if (currentScoreAchieved > playerList[playerTurn].score) {
      handleBust(playerScore);
      playSound(ERROR_SOUND_PATH);
    } else {
      const updatedPlayerList = [...playerList];
      updatedPlayerList[playerTurn].score = updatedPlayerScore;
      setThrowCount(currentThrow + 1);
      playSound(THROW_SOUND_PATH);
    }
    // wir überprüfen, ob der aktuelle Spieler das Spiel beendet hat
    if (playerList[playerTurn].score === 0) {
      if (playerList.length === 2) {
        handleLastPlayer();
        return finishedPlayerList;
      } else if (finishedPlayerList.length < 1) {
        setIsOverlayOpen(true); //Victory overlay
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
  function handleBust(bustedPlayerScore: number) {
    const currentRoundOfPlayer = playerList[playerTurn].rounds[roundsCount - 1];
    const {
      throw1: firstThrow,
      throw2: secondThrow,
      throw3: thirdThrow,
    } = currentRoundOfPlayer;
    let oldThrowScore = playerList[playerTurn].score;
    playerList[playerTurn].isBust = true;

    if (thirdThrow) {
      let firstAndSecondThrowScore = 0;
      if (firstThrow !== undefined && secondThrow !== undefined) {
        firstAndSecondThrowScore = firstThrow + secondThrow;
      }
      oldThrowScore = firstAndSecondThrowScore + bustedPlayerScore;
    } else if (
      firstThrow !== undefined &&
      secondThrow !== undefined &&
      secondThrow > playerList[playerTurn].score
    ) {
      oldThrowScore = firstThrow + bustedPlayerScore;
    }

    playerList[playerTurn].score = oldThrowScore;
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
      (player) => player.score == 0
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
    if (undoFromSummary === true) {
      setHistory(lastHistory);
      setUndoFromSummary(false);
      setUndoLastHistory(true);
    }
  }, [undoFromSummary]);

  useEffect(() => {
    if (undoLastHistory === true) {
      handleUndo();
      setUndoLastHistory(false);
    }
  }, [undoLastHistory]);

  return (
    <>
      <Overlay className="overlayBox" isOpen={isOverlayOpen}>
        <div className="finishGameOverlay">
          <p className="overlayHeading">Continue Game?</p>
          <div>
            <Button
              label="Finish"
              isLink
              handleClick={sortPlayer}
              type="secondary"
              isInverted={true}
            />
            <Button
              label="Continue"
              handleClick={() => {
                handlePlayerFinishTurn();
                setIsOverlayOpen(false);
              }}
              type="primary"
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
    </>
  );
}
export default Game;
