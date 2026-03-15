import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./LinkButton.module.css";

interface Props {
  href?: string;
  icon?: string;
  label?: ReactNode;
  handleClick?: () => void;
  className?: string;
  disabled?: boolean;
}

function LinkButton({
  href,
  icon,
  label,
  handleClick,
  className,
  disabled,
}: Props): React.JSX.Element {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (handleClick) {
      handleClick();
    }
  };

  const content = (
    <>
      {icon ? <img src={icon} alt="" aria-hidden="true" /> : null}
      {label}
    </>
  );

  const commonClassName = clsx(styles.linkButton, className, disabled && styles.disabled);

  if (!href) {
    return (
      <button
        type="button"
        className={commonClassName}
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled || undefined}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={href}
      onClick={handleLinkClick}
      className={commonClassName}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
    >
      {content}
    </a>
  );
}
export default LinkButton;
