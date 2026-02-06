import ViewToogleButton from "@/components/button/ViewToogleBtn";
import { SortTabs, type SortMethod } from "../sort-tabs";
import styles from "./StatisticsHeaderControls.module.css";

interface StatisticsHeaderControlsProps {
  title: string;
  sortValue: SortMethod;
  onSortChange?: (method: SortMethod) => void;
  sortDisabled?: boolean;
}

export function StatisticsHeaderControls({
  title,
  sortValue,
  onSortChange,
  sortDisabled = false,
}: StatisticsHeaderControlsProps): JSX.Element {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.controlsRow}>
        <SortTabs value={sortValue} onChange={onSortChange} disabled={sortDisabled} />
        <div className={styles.viewTabs}>
          <ViewToogleButton />
        </div>
      </div>
    </div>
  );
}
