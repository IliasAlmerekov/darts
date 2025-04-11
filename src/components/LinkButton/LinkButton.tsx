import React from "react";

type Props = {
  href?: string;
  icon?: string;
  label?: string | JSX.Element;
  handleClick?: () => void;
  className?: string;
};

function LinkButton({ ...props }: Props) {
  return (
    <a href={props.href} onClick={props.handleClick} className={props.className}>
      <img src={props.icon} alt="" />
      {props.label}
    </a>
  );
}
export default LinkButton;
