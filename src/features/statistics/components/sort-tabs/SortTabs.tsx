import clsx from "clsx";
import styles from "./SortTabs.module.css";

export type SortMethod = "alphabetically" | "score";

interface SortTabsProps {
  value: SortMethod;
  onChange?: (method: SortMethod) => void;
  disabled?: boolean;
  className?: string;
}

export function SortTabs({
  value,
  onChange,
  disabled = false,
  className,
}: SortTabsProps): JSX.Element {
  const handleChange = (method: SortMethod): void => {
    if (disabled || !onChange || method === value) {
      return;
    }

    onChange(method);
  };

  return (
    <div
      className={clsx(
        styles.root,
        className,
        { [styles.score]: value === "score" },
        { [styles.disabled]: disabled },
      )}
      aria-label={disabled ? "Sorting is unavailable in games overview" : "Sort players"}
    >
      <button
        type="button"
        className={clsx(styles.button, { [styles.active]: value === "alphabetically" })}
        onClick={() => handleChange("alphabetically")}
        aria-pressed={value === "alphabetically"}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        <span className={clsx(styles.icon, styles.iconAlphabet)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m3 16 4 4 4-4" />
            <path d="M7 20V4" />
            <path d="M20 8h-5" />
            <path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10" />
            <path d="M15 14h5l-5 6h5" />
          </svg>
        </span>
        A-Z
      </button>
      <button
        type="button"
        className={clsx(styles.button, { [styles.active]: value === "score" })}
        onClick={() => handleChange("score")}
        aria-pressed={value === "score"}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        <span className={styles.icon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m3 16 4 4 4-4" />
            <path d="M7 20V4" />
            <rect x="15" y="4" width="4" height="6" ry="2" />
            <path d="M17 20v-6h-2" />
            <path d="M15 20h4" />
          </svg>
        </span>
        Score
      </button>
    </div>
  );
}
