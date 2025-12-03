import React from "react";
import styles from "./LoginSuccessSkeleton.module.css";

function LoadingAuth(): React.JSX.Element {
  return (
    <div className={styles.loadingAuthContainer}>
      <div className={styles.loadingAuthContent}>
        <div className={styles.spinner}></div>
        <h2>Checking authentication...</h2>
        <p>Please wait a moment</p>
      </div>
    </div>
  );
}

export default LoadingAuth;
