import React from "react";
import styles from "./SampleBadge.module.css";

/** Marks a value that comes from the sample data module, not from the API. */
export function SampleBadge(): React.JSX.Element {
  return <span className={styles.sampleBadge}>Sample data</span>;
}
