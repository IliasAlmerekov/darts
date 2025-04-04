import OverviewPlayerItemList from "../../components/OverviewPlayerItem/OverviewPlayerItemList";
import "./gamesummary.css";
import Button from "../../components/Button/Button";
import Podium from "../../components/Podium/Podium";
import Undo from "../../icons/undolinkbutton.svg";
import { Link } from "react-router-dom";
import React from "react";
import { useUser } from "../../provider/UserProvider";

function Gamesummary(): JSX.Element {
  const { event, updateEvent } = useUser();

  const newList = [...event.winnerList];
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
  const podiumData =
    podiumList.length === 2 ? podiumListWithPlaceholder : podiumList;

  return (
    <div className="summary">
      <div>
        <Link
          to="/game"
          className="undoButton"
          onClick={() => updateEvent({ undoFromSummary: true })}
        >
          <img src={Undo} alt="Undo last action" />
        </Link>
      </div>
      <Podium userMap={podiumData} list={event.winnerList} />
      <div className="leaderBoard">
        <OverviewPlayerItemList userMap={leaderBoardList} />
      </div>

      <div className="playAgainButton">
        <Button
          isLink
          link={"/game"}
          label="Play Again"
          type="primary"
          isInverted
          className="playAgainButton"
        />
      </div>
      <div className="backToStartButton">
        <Button
          className="backToStartButton"
          link={"/"}
          isLink
          label="Back To Start"
          type="primary"
        />
      </div>
    </div>
  );
}
export default Gamesummary;
