import clsx from "clsx";
import styles from "./SettingsGroupBtn.module.css";

type ButtonOption = {
  label: string;
  id: string | number;
};

type SettingsGroupProps = {
  title: string;
  options: ButtonOption[];
  selectedId?: string | number;
  onClick?: (id: string | number) => void;
};

const SettingsGroupBtn = ({ title, options, selectedId, onClick }: SettingsGroupProps) => {
  return (
    <div className={styles.settingsContainer}>
      <div className={styles.gameSettings}>{title}</div>
      <div className={styles.buttonContainer}>
        {options.map((btn) => (
          <button
            key={btn.id}
            className={clsx(styles.settingsButton, {
              [styles.active]: selectedId === btn.id,
            })}
            onClick={() => onClick?.(btn.id)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SettingsGroupBtn;
