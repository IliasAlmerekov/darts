import clsx from "clsx";
import type { To } from "react-router-dom";
import { Link } from "react-router-dom";
import styles from "./BackButton.module.css";

type BaseBackButtonProps = {
  ariaLabel?: string;
  className?: string;
  label?: string;
};

type BackButtonLinkProps = BaseBackButtonProps & {
  to: To;
  onClick?: never;
};

type BackButtonActionProps = BaseBackButtonProps & {
  onClick: () => void;
  to?: never;
};

type BackButtonProps = BackButtonLinkProps | BackButtonActionProps;

function BackButtonContent({ label }: { label: string }): React.JSX.Element {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="25"
        height="25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={styles.backIcon}
      >
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </svg>
      <span className={styles.backLabel}>{label}</span>
    </>
  );
}

export default function BackButton(props: BackButtonProps): React.JSX.Element {
  const label = props.label ?? "Back";
  const ariaLabel = props.ariaLabel ?? label;
  const buttonClassName = clsx(styles.backButton, props.className);

  if ("to" in props) {
    return (
      <Link to={props.to} className={buttonClassName} aria-label={ariaLabel}>
        <BackButtonContent label={label} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={props.onClick}
      aria-label={ariaLabel}
    >
      <BackButtonContent label={label} />
    </button>
  );
}
