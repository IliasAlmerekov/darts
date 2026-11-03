import React, { useState } from "react";
import clsx from "clsx";
import fallbackIcon from "@/assets/icons/user-blue.svg";
import styles from "./PlayerAvatar.module.css";

interface PlayerAvatarProps {
  /** Null when there is no player id: the icon shows without a request. */
  playerId: number | null;
  /** Sets the circle's size; the circle keeps it with the picture and with the icon. */
  className?: string | undefined;
}

/**
 * The player's avatar in a circle, or the user icon when the picture fails to load.
 * The picture is decorative: the player's name always sits next to it.
 */
export function PlayerAvatar({ playerId, className }: PlayerAvatarProps): React.JSX.Element {
  // Holding the id that failed, not a flag, gives a new player id its own attempt.
  const [failedPlayerId, setFailedPlayerId] = useState<number | null>(null);
  const showPicture = playerId !== null && playerId !== failedPlayerId;

  return (
    <span className={clsx(styles.avatar, className)}>
      {showPicture ? (
        <img
          className={styles.picture}
          src={`/api/player/${playerId}/avatar`}
          alt=""
          onError={() => setFailedPlayerId(playerId)}
        />
      ) : (
        <img className={styles.fallbackIcon} src={fallbackIcon} alt="" />
      )}
    </span>
  );
}
