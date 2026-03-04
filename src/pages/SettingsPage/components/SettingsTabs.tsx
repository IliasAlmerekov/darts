import React from "react";
import clsx from "clsx";
import styles from "./SettingsTabs.module.css";

type SettingsTabOption = {
  id: string | number;
  label: string;
};

type SettingsTabsProps = {
  title: string;
  options: readonly SettingsTabOption[];
  selectedId: string | number;
  onChange: (id: string | number) => void;
  disabled?: boolean;
  mobileLayout?: "stack" | "grid";
};

function SettingsTabsComponent({
  title,
  options,
  selectedId,
  onChange,
  disabled = false,
  mobileLayout = "stack",
}: SettingsTabsProps): JSX.Element {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === selectedId),
  );

  return (
    <section className={styles.group}>
      <h2 className={styles.title}>{title}</h2>
      <div className={clsx(styles.tabs, { [styles.tabsGrid]: mobileLayout === "grid" })}>
        <span
          className={styles.slider}
          style={{
            width: `calc((100% - 8px) / ${options.length})`,
            transform: `translateX(calc(${activeIndex} * 100%))`,
          }}
          aria-hidden="true"
        />
        {options.map((option) => {
          const isActive = option.id === selectedId;

          return (
            <button
              key={option.id}
              type="button"
              className={clsx(styles.button, { [styles.buttonActive]: isActive })}
              onClick={() => onChange(option.id)}
              aria-pressed={isActive}
              disabled={disabled}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export const SettingsTabs = React.memo(SettingsTabsComponent);
