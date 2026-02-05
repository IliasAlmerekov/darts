import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "@nanostores/react";
import settingsCogInactive from "@/assets/icons/settings-inactive.svg";
import settingsCog from "@/assets/icons/settings.svg";
import dartIcon from "@/assets/icons/dart.svg";
import dartIconInactive from "@/assets/icons/dart-inactive.svg";
import statisticIcon from "@/assets/icons/statistics.svg";
import statisticIconInactive from "@/assets/icons/statistics-inactive.svg";
import styles from "./NavigationBar.module.css";
import Madebydeepblue from "@/assets/icons/madeByDeepblue.svg";
import clsx from "clsx";
import { $currentGameId } from "@/stores";

export default function NavigationBar(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const currentGameId = useStore($currentGameId);

  // Dynamischer path für Game basierend auf currentGameId
  const gamePath = useMemo(() => {
    return currentGameId ? `/start/${currentGameId}` : "/start";
  }, [currentGameId]);

  // Dynamischer path für Settings basierend auf currentGameId
  const settingsPath = useMemo(() => {
    return currentGameId ? `/settings/${currentGameId}` : "/settings";
  }, [currentGameId]);

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
      path: gamePath,
    },
    {
      label: "Settings",
      activeIcon: settingsCog,
      inActiveIcon: settingsCogInactive,
      id: "settings",
      path: settingsPath,
    },
  ];

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className={styles.navigation}>
      <img className={styles.deepblueIcon} src={Madebydeepblue} alt="" />
      <div className={styles.navItems}>
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.id === "game" &&
              (location.pathname === "/start" || location.pathname.startsWith("/start/"))) ||
            (item.id === "statistics" && location.pathname === "/gamesoverview") ||
            (item.id === "settings" && location.pathname.startsWith("/settings"));

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.path)}
              className={clsx(styles.tabButton, {
                [styles.active]: isActive,
                [styles.inactive]: !isActive,
              })}
            >
              <span className={styles.tabContent}>
                <img src={isActive ? item.activeIcon : item.inActiveIcon} alt={item.label} />
                <span className={styles.tabLabel}>{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
