import clsx from "clsx";
import React from "react";
import "./SettingsGroupBtn.css";

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
    <div className="settings-container">
      <div className="game-settings">{title}</div>
      <div className="button-container">
        {options.map((btn) => (
          <button
            key={btn.id}
            className={clsx("settings-button", {
              active: selectedId === btn.id,
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
