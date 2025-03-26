import clsx from "clsx";
import "./PlayerItems.css";
import React from "react";

type Props = {
  name: string;
  isAdded?: boolean;
  handleClickOrDelete: () => void;
  src: string;
  alt?: string;
  isClicked?: boolean;
};

function UnselectedPlayerItem({ ...props }: Props) {
  return (
    <div
      className={clsx("unselectedPlayerItem", {
        "fade-out": !!props.isClicked,
      })}
    >
      <div className="copylarge">{props?.name}</div>
      <img
        src={props.src}
        alt={props.alt}
        onClick={props.handleClickOrDelete}
      />
    </div>
  );
}
export default UnselectedPlayerItem;
