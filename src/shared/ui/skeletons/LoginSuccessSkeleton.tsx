import styles from "./LoginSuccessSkeleton.module.css";
import React from "react";
import clsx from "clsx";

export default function LoginSuccessSkeleton(): React.JSX.Element {
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginRow}>
        <div className={styles.loginCol}>
          <div className={styles.loginCard}>
            <div className={styles.loginCardBody}>
              <div className={clsx(styles.skeleton, styles.skeletonTitleLarge)}></div>

              <div className={styles.skeletonSuccessBox}>
                <div className={clsx(styles.skeleton, styles.skeletonSubtitle)}></div>
                <div className={clsx(styles.skeleton, styles.skeletonText)}></div>
                <div className={clsx(styles.skeleton, styles.skeletonText, styles.short)}></div>
              </div>

              <div className={styles.formFooter}>
                <div className={clsx(styles.skeleton, styles.skeletonButton)}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
