import React from "react";
import clsx from "clsx";
import { Link, To } from "react-router-dom";

export interface ButtonProps {
  isLink?: boolean;
  href?: string;
  target?: string;
  isInverted?: boolean;
  iconSrc?: string;
  handleClick?: () => void;
  label?: string;
  class?: string;
  type?: "primary" | "secondary";
  className?: string;
  iconStyling?: string;
  link: To;
  alt?: string;
  disabled?: boolean;
}

function Button({ ...props }: ButtonProps) {
  const buttonType = props.type || "primary";

  const buttonClasses = clsx(props?.className, "btn h4", {
    "btn-primary": buttonType === "primary" && !props.isInverted,
    "btn-secondary": buttonType === "secondary" && !props.isInverted,
    "inverted": props.isInverted && buttonType !== "secondary",
    "inverted-secondary": props.isInverted && buttonType === "secondary",
    "disabled": props.disabled,
  });

  const buttonContent = (
    <>
      {props.iconSrc && (
        <img
          src={props.iconSrc}
          alt={props.alt}
          className={props.iconStyling}
        />
      )}
      {props.label}
    </>
  );

  if (props.isLink) {
    return (
      <Link className="no-underline" to={props.disabled ? '' : props.link}>
        <button className={buttonClasses} onClick={props.handleClick}>
          {buttonContent}
        </button>
      </Link>
    );
  }
  return (
    <button className={buttonClasses} onClick={props.handleClick}>
      {buttonContent}
    </button>
  );
}
export default Button;
