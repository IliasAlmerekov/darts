import clsx from "clsx";
import { Link, To } from "react-router-dom";
import styles from "./Button.module.css";

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
  link?: To;
  alt?: string;
  disabled?: boolean;
}

function Button({ ...props }: ButtonProps) {
  const buttonType = props.type || "primary";

  const buttonClasses = clsx(props?.className, styles.btn, styles.h4, {
    [styles.btnPrimary]: buttonType === "primary" && !props.isInverted,
    [styles.btnSecondary]: buttonType === "secondary" && !props.isInverted,
    [styles.inverted]: props.isInverted && buttonType !== "secondary",
    [styles.invertedSecondary]: props.isInverted && buttonType === "secondary",
    [styles.disabled]: props.disabled,
  });

  const buttonContent = (
    <>
      {props.iconSrc && <img src={props.iconSrc} alt={props.alt} className={props.iconStyling} />}
      {props.label}
    </>
  );

  if (props.isLink) {
    return (
      <Link className={styles.noUnderline} to={props.disabled ? "" : (props.link ?? "")}>
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
