import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import settingsCogInactive from "@/icons/settings-inactive.svg";
import settingsCog from "@/icons/settings.svg";
import dartIcon from "@/icons/dart.svg";
import dartIconInactive from "@/icons/dart-inactive.svg";
import statisticIcon from "@/icons/statistics.svg";
import statisticIconInactive from "@/icons/statistics-inactive.svg";
import styles from "./NavigationBar.module.css";
import Madebydeepblue from "@/icons/madeByDeepblue.svg";
import clsx from "clsx";

export default function NavigationBar(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: "Statistics",
      activeIcon: statisticIcon,
      inActiveIcon: statisticIconInactive,
      id: "statistics",
      path: "/statistics",
    },
    {
      label: "Game",
      activeIcon: dartIcon,
      inActiveIcon: dartIconInactive,
      id: "game",
      path: "/start",
    },
    {
      label: "Settings",
      activeIcon: settingsCog,
      inActiveIcon: settingsCogInactive,
      id: "settings",
      path: "/settings",
    },
  ];

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className={styles.navigation}>
      <img className={styles.deepblueIcon} src={Madebydeepblue} alt="" />
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.id === "game" && location.pathname === "/start") ||
          (item.id === "statistics" && location.pathname === "/gamesoverview");

        return (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.path)}
            className={clsx(styles.tabButton, {
              [styles.active]: isActive,
              [styles.inactive]: !isActive,
            })}
          >
            <span>
              <img src={isActive ? item.activeIcon : item.inActiveIcon} alt={item.label} />
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
