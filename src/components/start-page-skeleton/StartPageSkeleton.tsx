import styles from "./StartPageSkeleton.module.css";
import React from "react";

export default function StartPageSkeleton(): React.JSX.Element {
  return (
    <div className={styles.main}>
      <div className={styles.start}>
        <div className={`${styles.navigation} ${styles.skeletonNav}`}></div>

        <div className={styles.existingPlayerList}>
          <div className={styles.header}>
            <div className={`${styles.skeleton} ${styles.skeletonTitleLeft}`}></div>
          </div>
          <div className={styles.bottom}>
            <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
          </div>
        </div>

        <div className={styles.addedPlayerList}>
          <div className={styles.headerSelectedPlayers}>
            <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
            <div className={`${styles.skeleton} ${styles.skeletonCount}`}></div>
          </div>
          <div className={styles.selectedPlayerListScroll}>
            {[...Array(5)].map((_, index) => (
              <div key={index} className={`${styles.skeleton} ${styles.skeletonPlayerItem}`}></div>
            ))}
          </div>
          <div className={styles.startBtn}>
            <div className={`${styles.skeleton} ${styles.skeletonStartButton}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
