import React from "react";
import styles from "./JoiningScreen.module.css";

/** Full-screen spinner shown between a successful registration and the Waiting room. */
function JoiningScreen(): React.JSX.Element {
  return (
    <div className={styles.joiningScreen} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.joiningText}>Joining the game…</p>
    </div>
  );
}

export default React.memo(JoiningScreen);
