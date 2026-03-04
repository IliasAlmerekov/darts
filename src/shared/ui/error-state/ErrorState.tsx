import React from "react";
import { Link, type To } from "react-router-dom";
import clsx from "clsx";
import styles from "./ErrorState.module.css";

type ErrorAction = {
  label: string;
  onClick?: () => void;
  to?: To;
};

interface ErrorStateProps {
  title: string;
  message: string;
  variant?: "inline" | "page";
  className?: string;
  primaryAction?: ErrorAction;
  secondaryAction?: ErrorAction;
}

function renderAction(action: ErrorAction, variant: "primary" | "secondary"): React.JSX.Element {
  const actionClassName = clsx(styles.action, {
    [styles.primaryAction]: variant === "primary",
    [styles.secondaryAction]: variant === "secondary",
  });

  if (action.to) {
    return (
      <Link className={actionClassName} to={action.to}>
        {action.label}
      </Link>
    );
  }

  return (
    <button className={actionClassName} onClick={action.onClick} type="button">
      {action.label}
    </button>
  );
}

export function ErrorState({
  title,
  message,
  variant = "inline",
  className,
  primaryAction,
  secondaryAction,
}: ErrorStateProps): React.JSX.Element {
  return (
    <section
      className={clsx(styles.root, className, {
        [styles.page]: variant === "page",
        [styles.inline]: variant === "inline",
      })}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.header}>
        <span className={styles.badge} aria-hidden="true">
          !
        </span>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <p className={styles.message}>{message}</p>

      {(primaryAction || secondaryAction) && (
        <div className={styles.actions}>
          {primaryAction ? renderAction(primaryAction, "primary") : null}
          {secondaryAction ? renderAction(secondaryAction, "secondary") : null}
        </div>
      )}
    </section>
  );
}

export default ErrorState;
