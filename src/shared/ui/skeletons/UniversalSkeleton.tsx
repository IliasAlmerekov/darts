import styles from "./UniversalSkeleton.module.css";
import React from "react";

export default function UniversalSkeleton(): React.JSX.Element {
  return (
    <div className={styles.loadingSkeletonContainer} role="status" aria-label="Loading page" />
  );
}
