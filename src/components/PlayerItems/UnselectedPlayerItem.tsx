import clsx from "clsx";
import "./PlayerItems.css";
import React from "react";

type Props = {
  name: string;
  isAdded?: boolean;
  handleClickOrDelete: () => void;
  src: string;
  alt?: string;
  isClicked?: number | null;
};

function UnselectedPlayerItem({ ...props }: Props) {
  return (
    <div
      className={clsx("unselected-player-item", {
        "fade-out": !!props.isClicked,
      })}
    >
      <div className="copylarge">{props?.name}</div>
      <button
        onClick={props.handleClickOrDelete}
        className="move-button"
        aria-label="Move Button"
      >
        <img src={props.src} alt={props.alt} />
      </button>
    </div>
  );
}
export default UnselectedPlayerItem;
