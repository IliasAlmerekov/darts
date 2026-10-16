import React from "react";
import type { InvitationError } from "@/shared/api/auth";
import { ErrorState } from "@/shared/ui/error-state";
import styles from "./InvitationErrorScreen.module.css";

interface InvitationErrorScreenProps {
  invitationError: InvitationError;
  onGoToPlayerProfile: () => void;
}

const INVITATION_ERROR_TITLES: Record<InvitationError, string> = {
  GAME_ALREADY_STARTED: "This game has already started",
  GAME_ROOM_FULL: "This game is full",
  GAME_NOT_FOUND: "This game no longer exists",
  GAME_JOIN_NOT_ALLOWED: "This game can no longer be joined",
};

/** Shown after a login whose invitation the backend could not join. */
function InvitationErrorScreen({
  invitationError,
  onGoToPlayerProfile,
}: InvitationErrorScreenProps): React.JSX.Element {
  return (
    <div className={styles.invitationErrorScreen}>
      <ErrorState
        variant="page"
        title={INVITATION_ERROR_TITLES[invitationError]}
        message="You are logged in, but you cannot join this game."
        primaryAction={{ label: "Go to my profile", onClick: onGoToPlayerProfile }}
      />
    </div>
  );
}

export default React.memo(InvitationErrorScreen);
