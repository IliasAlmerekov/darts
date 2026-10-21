import React, { useId } from "react";
import madeByDeepblue from "@/assets/icons/madeByDeepblue.svg";
import { ProfileTabList, ProfileTabPanel } from "./components/ProfileTabs";
import { StatsCard } from "./components/StatsCard";
import { usePlayerProfilePage } from "./usePlayerProfilePage";
import styles from "./PlayerProfilePage.module.css";

function PlayerProfilePage(): React.JSX.Element {
  const { displayName, profileState, tab, selectTab } = usePlayerProfilePage();
  const tabsId = useId();

  return (
    <div className={styles.page}>
      <header className={styles.navRow}>
        <img className={styles.brand} src={madeByDeepblue} alt="" />
        <ProfileTabList idPrefix={tabsId} tab={tab} onSelectTab={selectTab} />
      </header>
      <main className={styles.playerProfile}>
        <h1 className={styles.pageTitle}>Player Profile</h1>
        <StatsCard className={styles.card} displayName={displayName} profileState={profileState} />
        <ProfileTabPanel
          className={styles.panel}
          idPrefix={tabsId}
          tab={tab}
          displayName={displayName}
          profileState={profileState}
        />
      </main>
    </div>
  );
}

export default PlayerProfilePage;
