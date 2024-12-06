import clsx from "clsx";
import { Link } from "react-router-dom";

export interface ButtonProps {
  isLink?: boolean;
  href?: string | any;
  target?: string;
  isInverted?: boolean;
  iconSrc?: any;
  handleClick?: () => void;
  label?: string;
  class?: string;
  type?: "primary" | "secondary";
  className?: string;
  iconStyling?: string;
  link?: any;
  alt?: string;
  disabled?: boolean;
}

function Button({ ...props }: ButtonProps) {
  const buttonType = props.type || "primary";

  const buttonClasses = clsx(props?.className, "btn h4", {
    btnPrimary: buttonType === "primary" && !props.isInverted,
    btnSecondary: buttonType === "secondary" && !props.isInverted,
    inverted: props.isInverted && buttonType !== "secondary",
    invertedSecondary: props.isInverted && buttonType === "secondary",
    disabled: props.disabled,
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
      <Link className="noUnderline" to={props.disabled ? null : props.link}>
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
