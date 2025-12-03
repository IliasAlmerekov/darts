import OverviewPlayerItemList from "@/components/overview-player-item/OverviewPlayerItemList";
import styles from "./game-summary.module.css";
import Button from "@/components/Button/Button";
import Podium from "@/components/Podium/Podium";
import Undo from "@/icons/undolinkbutton.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import { getFinishedGame, FinishedPlayerResponse, createRematch } from "@/services/api";
import { setInvitation, setLastFinishedGameId, resetRoomStore } from "@/stores";
import { playSound } from "@/shared/lib/soundPlayer";
import "@/types/BASIC.d";

function Gamesummary(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverFinished, setServerFinished] = useState<FinishedPlayerResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const finishedGameIdFromRoute = (location.state as { finishedGameId?: number } | null)
    ?.finishedGameId;

  useEffect(() => {
    if (!finishedGameIdFromRoute) return;

    getFinishedGame(finishedGameIdFromRoute)
      .then((data) => {
        setServerFinished(data);
        setLastFinishedGameId(finishedGameIdFromRoute);
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch finished game:", err);
        setError("Could not load finished game data");
      });
  }, [finishedGameIdFromRoute]);

  const newList: BASIC.WinnerPlayerProps[] = useMemo(() => {
    if (serverFinished.length > 0) {
      return serverFinished.map((player) => {
        const roundsPlayed = Math.max(player.roundsPlayed ?? 0, 1);
        return {
          id: player.playerId,
          name: player.username,
          score: 0,
          isActive: false,
          index: player.position - 1,
          rounds: Array.from({ length: roundsPlayed }).map(() => ({
            throw1: undefined,
            throw2: undefined,
            throw3: undefined,
          })),
          scoreAverage: player.roundAverage,
          roundCount: player.roundsPlayed,
        };
      });
    }
    return [];
  }, [serverFinished]);

  const podiumList = newList.slice(0, 3);
  const leaderBoardList = newList.slice(3, newList.length);
  const podiumListWithPlaceholder = [...podiumList];
  podiumListWithPlaceholder.push({
    id: 0,
    name: "-",
    score: 0,
    isActive: false,
    index: 0,
    rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
  });
  const podiumData = podiumList.length === 2 ? podiumListWithPlaceholder : podiumList;

  const handleUndo = () => {
    playSound("undo");
  };

  const handlePlayAgain = async () => {
    sessionStorage.removeItem("OngoingGame");

    if (!finishedGameIdFromRoute) return;

    try {
      const rematch = await createRematch(finishedGameIdFromRoute);

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      navigate("/game");
    } catch (err) {
      console.error("Failed to start rematch:", err);
    }
  };

  const handleBackToStart = async () => {
    sessionStorage.removeItem("OngoingGame");
    resetRoomStore();

    if (finishedGameIdFromRoute) {
      setLastFinishedGameId(finishedGameIdFromRoute);
    }

    navigate("/start");
  };

  return (
    <div className={styles.summary}>
      <div>
        <Link onClick={handleUndo} to="/game" className={styles.undoButton}>
          <img src={Undo} alt="Undo last action" />
        </Link>
      </div>
      <div className={styles.podiumBoard}>
        <Podium userMap={podiumData} list={newList} />
      </div>
      <div className={styles.leaderBoard}>
        <OverviewPlayerItemList userMap={leaderBoardList} />
      </div>

      <div className={styles.playAgainButton}>
        <Button
          label="Play Again"
          type="primary"
          isInverted
          className={styles.playAgainButton}
          handleClick={handlePlayAgain}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.backToStartButton}>
        <Button label="Back To Start" type="primary" handleClick={handleBackToStart} />
      </div>
    </div>
  );
}

export default Gamesummary;
