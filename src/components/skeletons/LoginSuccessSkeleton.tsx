import styles from "./LoginSuccessSkeleton.module.css";
import React from "react";
import clsx from "clsx";

export default function LoginSuccessSkeleton(): React.JSX.Element {
  return (
    <div className="login-container">
      <div className="login-row">
        <div className="login-col">
          <div className="login-card">
            <div className="login-card-body">
              <div className={clsx(styles.skeleton, styles.skeletonTitleLarge)}></div>

              <div className={styles.skeletonSuccessBox}>
                <div className={clsx(styles.skeleton, styles.skeletonSubtitle)}></div>
                <div className={clsx(styles.skeleton, styles.skeletonText)}></div>
                <div className={clsx(styles.skeleton, styles.skeletonText, "short")}></div>
              </div>

              <div className="form-footer" style={{ marginTop: "20px" }}>
                <div className={clsx(styles.skeleton, styles.skeletonButton)}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
