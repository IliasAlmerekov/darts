import OverviewPlayerItemList from "../../components/OverviewPlayerItem/OverviewPlayerItemList";
import "./gamesummary.css";
import Button from "../../components/Button/Button";
import Podium from "../../components/Podium/Podium";
import Undo from "../../icons/undolinkbutton.svg";
import { Link, useNavigate } from "react-router-dom";
import React, { useMemo } from "react";
import { useUser } from "../../provider/UserProvider";

function Gamesummary(): React.JSX.Element {
  const { event, functions } = useUser();
  const navigate = useNavigate();

  const newList: BASIC.WinnerPlayerProps[] = useMemo(() => {
    return [...event.winnerList];
  }, [event.winnerList]);

  const podiumList = newList.slice(0, 3);
  const leaderBoardList = newList.slice(3, event.winnerList.length + 1);
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
        <Podium userMap={podiumData} list={event.winnerList} />
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

      <div className="back-to-start-button">
        <Button
          className="back-to-start-button"
          label="Back To Start"
          type="primary"
          handleClick={async () => {
            functions.savedFinishedGameToLS(newList);
            sessionStorage.removeItem("OngoingGame");

            await functions.startRematch("back-to-start");
            navigate("/start");
          }}
        />
      </div>
    </div>
  );
}
export default Gamesummary;
