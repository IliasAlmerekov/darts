import React from "react";
import styles from "./ProfileMessage.module.css";

interface ProfileMessageProps {
  isStatus?: boolean;
  children: React.ReactNode;
}

/** A one-line note in place of profile content: loading, or nothing to show yet. */
export function ProfileMessage({
  isStatus = false,
  children,
}: ProfileMessageProps): React.JSX.Element {
  return (
    <p className={styles.profileMessage} role={isStatus ? "status" : undefined}>
      {children}
    </p>
  );
}
