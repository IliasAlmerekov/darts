import React, { Dispatch, SetStateAction, useState } from "react";
import "./Statistics.css";
import sortAZ from "../../icons/sorting-az.svg";
import sortScore from "../../icons/sorting-score.svg";
import clsx from "clsx";
import { PlayerProps } from "../../pages/Start/Start";

export type IProps = {
  list?: PlayerProps[];
  setList?: React.Dispatch<React.SetStateAction<PlayerProps[]>>;
};

const Statistics = ({ list = [] }: IProps) => {
  const [sortBy, setSortBy] = useState<"alphabetically" | "score">(
    "alphabetically"
  );

  return (
    <div className="player-stats">
      <div className="header">
        <h1>Playerstats</h1>
        <div className="sort-options">
          <button
            className={clsx("sort-button", {
              active: sortBy === "alphabetically",
            })}
            onClick={() => setSortBy("alphabetically")}
          >
            <span className="icon">
              <img src={sortAZ} />
            </span>
            Alphabetically
          </button>
          <button
            className={clsx("sort-button", {
              active: sortBy === "score",
            })}
            onClick={() => setSortBy("score")}
          >
            <span className="icon">
              <img src={sortScore} />
            </span>
            Score
          </button>
        </div>
      </div>
      <div className="tabs">
        <span className="tab active">Players</span>
        <span className="tab">Games</span>
      </div>

      <ul className="player-list">
        <li className="player-item">
          <span className="rank">.</span>
          <span className="name"></span>
          <span className="stats">
            <span className="round">Ⓖ Round</span>
            <span className="games-played">Played games:</span>
          </span>
        </li>
      </ul>
    </div>
  );
};

export default Statistics;
