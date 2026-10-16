import React from "react";
import { ErrorState } from "@/shared/ui/error-state";
import styles from "./InvitationErrorScreen.module.css";

interface InvitationErrorScreenProps {
  message: string;
  onGoToPlayerProfile: () => void;
}

/** Shown after a login whose invitation the backend could not join. */
export function InvitationErrorScreen({
  message,
  onGoToPlayerProfile,
}: InvitationErrorScreenProps): React.JSX.Element {
  return (
    <div className={styles.invitationErrorScreen}>
      <ErrorState
        variant="page"
        title={message}
        message="You are logged in, but you cannot join this game."
        primaryAction={{ label: "Go to my profile", onClick: onGoToPlayerProfile }}
      />
    </div>
  );
}
