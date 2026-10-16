import React from "react";
import styles from "./LoginCheckScreen.module.css";

/** Full-screen spinner shown while the app checks for a Remembered login. */
function LoginCheckScreen(): React.JSX.Element {
  return (
    <div className={styles.checkScreen} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.checkText}>Checking your login…</p>
    </div>
  );
}

export default React.memo(LoginCheckScreen);
