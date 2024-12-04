import "../GamePlayerItem/GamePlayerItem.css";
import bustIconX from "../../icons/delete-grey.svg";
import clsx from "clsx";

type Props = {
  name?: string;
  key?: number;
  isActive?: boolean;
  value: number;
  gamePlayerItemThrow1?: number | JSX.Element;
  gamePlayerItemThrow2?: number | JSX.Element;
  gamePlayerItemThrow3?: number | JSX.Element;
  className: string;
  src?: any;
  isBust?: boolean;
  throwCount?: number;
  isPlaying?: boolean;
  roundsCount: BASIC.Round[];
  gamePlayerItemPrevThrow1?: number;
  gamePlayerItemPrevThrow2?: number;
  gamePlayerItemPrevThrow3?: number;
  id: string;
  classNameforName?: string;
};

const bustIcon = <img src={bustIconX} alt="" />;

function GamePlayerItem({ ...props }: Props) {
  function handlePoint(
    currentThrow?: number | JSX.Element,
    prevThrow?: number
  ): number | undefined | JSX.Element {
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
    <div className={props.className} key={props?.key} id={props.id}>
      <div>
        <div className={props.classNameforName}>{props?.name}</div>
      </div>

      <div className="throws">
        <div
          className={clsx("throwDisplay", {
            hidden: props.isPlaying === false,
          })}
        >
          <div
            className={clsx("divDisplay copylarge", {
              handleBust: !props.isActive && props.throwCount === 0,
            })}
          >
            {handlePoint(
              props.gamePlayerItemThrow1,
              props.gamePlayerItemPrevThrow1
            )}
          </div>

          <div
            className={clsx("divDisplay copylarge", {
              handleBust: !props.isActive && props.throwCount === 1,
            })}
          >
            {handlePoint(
              props.gamePlayerItemThrow2,
              props.gamePlayerItemPrevThrow2
            )}
          </div>

          <div
            className={clsx("divDisplay copylarge", {
              handleBust: props.isBust && props.throwCount === 2,
            })}
          >
            {handlePoint(
              props.gamePlayerItemThrow3,
              props.gamePlayerItemPrevThrow3
            )}
          </div>
        </div>

        <div className="pointer">
          <div
            className={clsx("scoreDisplay", {
              hidden: props.isPlaying === false,
            })}
          >
            Score
          </div>
          <div className="valueDisplay">{props.value}</div>
        </div>
      </div>
    </div>
  );
}
export default GamePlayerItem;
