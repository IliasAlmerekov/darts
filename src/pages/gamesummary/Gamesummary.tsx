import OverviewPlayerItemList from "../../components/OverviewPlayerItem/OverviewPlayerItemList";
import "./gamesummary.css";
import Button from "../../components/Button/Button";
import Podium from "../../components/Podium/Podium";
import Undo from "../../icons/undolinkbutton.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "../../provider/UserProvider";
import { getFinishedGame, FinishedPlayerResponse } from "../../services/api";

function Gamesummary(): React.JSX.Element {
  const { event, functions } = useUser();
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
    return [...event.winnerList];
  }, [event.winnerList, serverFinished]);

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

  return (
    <div className="summary">
      <div>
        <Link onClick={() => functions.undoFromSummary()} to="/game" className="undo-button">
          <img src={Undo} alt="Undo last action" />
        </Link>
      </div>
      <div className="podium-board">
        <Podium userMap={podiumData} list={newList} />
      </div>
      <div className="leader-board">
        <OverviewPlayerItemList userMap={leaderBoardList} />
      </div>

      <div className="play-again-button">
        <Button
          label="Play Again"
          type="primary"
          isInverted
          className="play-again-button"
          handleClick={async () => {
            functions.savedFinishedGameToLS(newList);
            sessionStorage.removeItem("OngoingGame");

            await functions.startRematch("play-again");
            navigate("/game");
          }}
        />
      </div>

      {error && <p className="error">{error}</p>}

      <div className="back-to-start-button">
        <Button
          className="back-to-start-button"
          label="Back To Start"
          type="primary"
          handleClick={async () => {
            /*  functions.savedFinishedGameToLS(newList);
            sessionStorage.removeItem("OngoingGame");*/

            await functions.startRematch("back-to-start");
            navigate("/start");
          }}
        />
      </div>
    </div>
  );
}
export default Gamesummary;
