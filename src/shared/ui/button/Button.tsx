import clsx from "clsx";
import { Link, To } from "react-router-dom";
import styles from "./Button.module.css";

export interface ButtonProps {
  isLink?: boolean;
  isInverted?: boolean;
  iconSrc?: string;
  handleClick?: () => void;
  label?: string;
  type?: "primary" | "secondary";
  className?: string;
  iconStyling?: string;
  link?: To;
  alt?: string;
  disabled?: boolean;
}

function Button({
  isLink,
  isInverted,
  iconSrc,
  handleClick,
  label,
  type,
  className,
  iconStyling,
  link,
  alt,
  disabled,
}: ButtonProps) {
  const buttonType = type || "primary";

  const buttonClasses = clsx(className, styles.btn, styles.h4, {
    [styles.btnPrimary]: buttonType === "primary" && !isInverted,
    [styles.btnSecondary]: buttonType === "secondary" && !isInverted,
    [styles.inverted]: isInverted && buttonType !== "secondary",
    [styles.invertedSecondary]: isInverted && buttonType === "secondary",
    [styles.disabled]: disabled,
  });

  const buttonContent = (
    <>
      {iconSrc && <img src={iconSrc} alt={alt} className={iconStyling} />}
      {label}
    </>
  );

  if (isLink) {
    return (
      <Link
        className={clsx(styles.noUnderline, buttonClasses)}
        to={link ?? ""}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          handleClick?.();
        }}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        {buttonContent}
      </Link>
    );
  }
  return (
    <button className={buttonClasses} onClick={handleClick} disabled={disabled}>
      {buttonContent}
    </button>
  );
}
export default Button;
