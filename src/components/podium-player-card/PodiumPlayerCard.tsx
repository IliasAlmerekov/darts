import "./PodiumPlayerCard.css";
import React from "react";

type Props = {
  name?: string;
  placement?: number | string;
  className?: string;
  rounds?: number | string;
  averagePerRound?: number | string;
};

function PodiumPlayerCard({ ...props }: Props): React.JSX.Element {
  return (
    <div className={props.className}>
      <h4 className="center-align player-name">{props.name}</h4>
      <div className="copylarge center-align color">
        Rounds
        <h4 className="number">{props.rounds}</h4>
      </div>
      <div className="copylarge center-align color">
        Ø Round
        <h4 className="number">{props.averagePerRound}</h4>
      </div>
      <div className="copylarge placement-round">{props.placement}</div>
    </div>
  );
}
export default PodiumPlayerCard;
