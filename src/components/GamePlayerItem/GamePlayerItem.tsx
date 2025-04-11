import "../GamePlayerItem/GamePlayerItem.css";
import bustIconX from "../../icons/delete-grey.svg";
import clsx from "clsx";
import React from "react";

type Props = {
  name?: string;
  isActive?: boolean;
  value: number;
  gamePlayerItemThrow1?: number | string | JSX.Element;
  gamePlayerItemThrow2?: number | string | JSX.Element;
  gamePlayerItemThrow3?: number | string | JSX.Element;
  className: string;
  src?: string;
  isBust?: boolean;
  throwCount?: number;
  isPlaying?: boolean;
  roundsCount: BASIC.Round[];
  gamePlayerItemPrevThrow1?: number | string | JSX.Element;
  gamePlayerItemPrevThrow2?: number | string | JSX.Element;
  gamePlayerItemPrevThrow3?: number | string | JSX.Element;
  id: string;
  classNameforName?: string;
};

const bustIcon = <img src={bustIconX} alt="Bust icon" />;

function GamePlayerItem({ ...props }: Props) {
  function handlePoint(
    currentThrow?: number | string | JSX.Element,
    prevThrow?: number | string | JSX.Element,
  ): number | undefined | string | JSX.Element {
    return currentThrow !== undefined
      ? currentThrow
      : prevThrow !== undefined
        ? prevThrow
        : undefined;
  }

  switch (true) {
    case props.isActive && props.roundsCount?.length > 1:
      props.gamePlayerItemPrevThrow1 = undefined;
      props.gamePlayerItemPrevThrow2 = undefined;
      props.gamePlayerItemPrevThrow3 = undefined;
      break;
    case props.isBust && props.throwCount === 1:
      props.gamePlayerItemThrow3 = bustIcon;
      break;
    case props.isBust && props.throwCount === 0:
      props.gamePlayerItemThrow2 = bustIcon;
      props.gamePlayerItemThrow3 = bustIcon;
      break;
    default:
      break;
  }

  return (
    <div className={props.className} id={props.id}>
      <div>
        <div className={props.classNameforName}>{props?.name}</div>
      </div>

      <div className="throws">
        <div
          className={clsx("throw-display", {
            hidden: props.isPlaying === false,
          })}
        >
          <div
            className={clsx("div-display copylarge", {
              "handle-bust": !props.isActive && props.throwCount === 0,
            })}
          >
            {handlePoint(props.gamePlayerItemThrow1, props.gamePlayerItemPrevThrow1)}
          </div>

          <div
            className={clsx("div-display copylarge", {
              "handle-bust": !props.isActive && props.throwCount === 1,
            })}
          >
            {handlePoint(props.gamePlayerItemThrow2, props.gamePlayerItemPrevThrow2)}
          </div>

          <div
            className={clsx("div-display copylarge", {
              "handle-bust": props.isBust && props.throwCount === 2,
            })}
          >
            {handlePoint(props.gamePlayerItemThrow3, props.gamePlayerItemPrevThrow3)}
          </div>
        </div>

        <div className="pointer">
          <div
            className={clsx("score-display", {
              hidden: props.isPlaying === false,
            })}
          >
            Score
          </div>
          <div className="value-display">{props.value}</div>
        </div>
      </div>
    </div>
  );
}
export default GamePlayerItem;
