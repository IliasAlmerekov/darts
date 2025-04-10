import "./OverviewPlayerItem.css";
import React from "react";

type Props = {
  className?: string;
  rounds?: number;
  averagePerRound?: number;
  name?: string;
  placement?: number;
};

function OverviewPlayerItem({ ...props }: Props) {
  return (
    <div className={props.className}>
      <div className="player-infos">
        <h4 className="leader-board">{props.placement}</h4>
        <div className="copylarge ">{props.name}</div>
      </div>
      <div className="player-statistics">
        <div className="copylarge rounds">
          Rounds <h4 className="number-display">{props.rounds}</h4>
        </div>
        <div className="copylarge rounds">
          Ø Round <h4 className="number-display">{props.averagePerRound}</h4>
        </div>
      </div>
    </div>
  );
}
export default OverviewPlayerItem;
