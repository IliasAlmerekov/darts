import React from "react";
import settingsCogInactive from "../../icons/settings-inactive.svg";
import settingsCog from "../../icons/settings.svg";
import dartIcon from "../../icons/dart.svg";
import dartIconInactive from "../../icons/dart-inactive.svg";
import statisticIcon from "../../icons/statistics.svg";
import statisticIconInactive from "../../icons/statistics-inactive.svg";
import clsx from "clsx";
import { useUser } from "../../provider/UserProvider";
import "./NavigationBar.css";
import { useNavigate } from "react-router-dom";
import Madebydeepblue from "../../icons/madeByDeepblue.svg";

export default function NavigationBar() {
  const { event, functions } = useUser();
  const navigate = useNavigate();

  const navItems = [
    {
      label: "Statistics",
      activeIcon: statisticIcon,
      inActiveIcon: statisticIconInactive,
      id: "statistics",
    },
    {
      label: "Game",
      activeIcon: dartIcon,
      inActiveIcon: dartIconInactive,
      id: "game",
    },
    {
      label: "Settings",
      activeIcon: settingsCog,
      inActiveIcon: settingsCogInactive,
      id: "settings",
    },
  ];
  return (
    <div className="navigation">
      <img className="deepblue-icon" src={Madebydeepblue} alt="" />
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => functions.handleTabClick(item.id, navigate)}
          className={clsx("tab-button", {
            active: event.activeTab === item.id,
            inactive: !(event.activeTab === item.id),
          })}
        >
          <span>
            <img
              src={
                item.id === event.activeTab
                  ? item.activeIcon
                  : item.inActiveIcon
              }
              alt={item.label}
            />
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
