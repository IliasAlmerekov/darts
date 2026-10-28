import React from "react";
import { SortTabs, type SortMethod } from "@/shared/ui/sort-tabs";
import ViewToggleButton from "./ViewToggleButton";
import styles from "./StatisticsHeaderControls.module.css";

interface StatisticsHeaderControlsProps {
  title: string;
  sortValue: SortMethod;
  onSortChange?: (method: SortMethod) => void;
  sortDisabled?: boolean;
}

function StatisticsHeaderControlsComponent({
  title,
  sortValue,
  onSortChange,
  sortDisabled = false,
}: StatisticsHeaderControlsProps): React.JSX.Element {
  const sortTabsProps = {
    ...(onSortChange !== undefined ? { onChange: onSortChange } : {}),
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.controlsRow}>
        <SortTabs value={sortValue} disabled={sortDisabled} {...sortTabsProps} />
        <div className={styles.viewTabs}>
          <ViewToggleButton />
        </div>
      </div>
    </div>
  );
}

export const StatisticsHeaderControls = React.memo(StatisticsHeaderControlsComponent);
