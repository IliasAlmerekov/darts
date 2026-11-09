import React, { useId } from "react";
import madeByDeepblue from "@/assets/icons/madeByDeepblue.svg";
import { ProfileTabList, ProfileTabPanel } from "./components/ProfileTabs";
import { LogoutButton } from "@/shared/ui/logout-button";
import { ProfileStatsCard } from "@/shared/ui/profile-statistics";
import { usePlayerProfilePage } from "./usePlayerProfilePage";
import styles from "./PlayerProfilePage.module.css";

function PlayerProfilePage(): React.JSX.Element {
  const { playerId, displayName, profileState, tab, selectTab } = usePlayerProfilePage();
  const tabsId = useId();
  const profile = profileState.status === "success" ? profileState.profile : null;

  return (
    <div className={styles.page}>
      <header className={styles.navRow}>
        <img className={styles.brand} src={madeByDeepblue} alt="" />
        <ProfileTabList idPrefix={tabsId} tab={tab} onSelectTab={selectTab} />
      </header>
      <main className={styles.playerProfile}>
        <h1 className={styles.pageTitle}>Player Profile</h1>
        <ProfileStatsCard
          className={styles.card}
          playerId={playerId}
          displayName={displayName}
          stats={profile?.stats ?? null}
          isPending={profileState.status === "pending"}
          memberSince={profile?.memberSince ?? null}
          actions={<LogoutButton />}
        />
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
