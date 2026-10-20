import React, { useId, useRef } from "react";
import clsx from "clsx";
import { PROFILE_TAB_LABELS, PROFILE_TABS, type ProfileTab } from "../lib/profilePage";
import type { ProfileState } from "../usePlayerProfilePage";
import { HistoryTab } from "./HistoryTab";
import { OverviewTab } from "./OverviewTab";
import { PerformanceTab } from "./PerformanceTab";
import styles from "./ProfileTabs.module.css";

interface ProfileTabsProps {
  tab: ProfileTab;
  onSelectTab: (tab: ProfileTab) => void;
  profileState: Exclude<ProfileState, { status: "error" }>;
}

const KEY_STEPS: Partial<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

function renderPanel(
  tab: ProfileTab,
  profileState: ProfileTabsProps["profileState"],
): React.JSX.Element {
  if (profileState.status === "pending") {
    return <p className={styles.loading}>Loading…</p>;
  }
  switch (tab) {
    case "overview":
      return <OverviewTab profile={profileState.profile} />;
    case "performance":
      return <PerformanceTab profile={profileState.profile} />;
    case "history":
      return <HistoryTab profile={profileState.profile} />;
  }
}

/** Overview, Performance and History, as WAI-ARIA tabs with arrow-key navigation. */
export function ProfileTabs({
  tab,
  onSelectTab,
  profileState,
}: ProfileTabsProps): React.JSX.Element {
  const idPrefix = useId();
  const tabRefs = useRef<Partial<Record<ProfileTab, HTMLButtonElement | null>>>({});

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const currentIndex = PROFILE_TABS.indexOf(tab);
    let nextIndex: number | undefined;
    const step = KEY_STEPS[event.key];
    if (step !== undefined) {
      nextIndex = (currentIndex + step + PROFILE_TABS.length) % PROFILE_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PROFILE_TABS.length - 1;
    }
    const nextTab = nextIndex === undefined ? undefined : PROFILE_TABS[nextIndex];
    if (nextTab === undefined) {
      return;
    }
    event.preventDefault();
    onSelectTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <div className={styles.profileTabs}>
      <div className={styles.tabList} role="tablist" aria-label="Profile sections">
        {PROFILE_TABS.map((item) => {
          const isSelected = item === tab;
          return (
            <button
              key={item}
              ref={(element) => {
                tabRefs.current[item] = element;
              }}
              className={clsx(styles.tab, { [styles.tabActive ?? ""]: isSelected })}
              id={`${idPrefix}-tab-${item}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${idPrefix}-panel-${item}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelectTab(item)}
              onKeyDown={handleKeyDown}
            >
              {PROFILE_TAB_LABELS[item]}
            </button>
          );
        })}
      </div>
      <div
        className={styles.tabPanel}
        id={`${idPrefix}-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${tab}`}
        tabIndex={0}
      >
        {renderPanel(tab, profileState)}
      </div>
    </div>
  );
}
