import React from "react";
import avatarIcon from "@/assets/icons/user-blue.svg";
import barChartIcon from "@/assets/icons/bar-chart.svg";
import gamepadIcon from "@/assets/icons/gamepad.svg";
import targetIcon from "@/assets/icons/target.svg";
import trophyIcon from "@/assets/icons/trophy.svg";
import { LogoutButton } from "@/shared/ui/logout-button";
import { SAMPLE_PROFILE } from "../lib/sampleProfile";
import type { ProfileState } from "../usePlayerProfilePage";
import { SampleBadge } from "./SampleBadge";
import styles from "./StatsCard.module.css";

interface StatsCardProps {
  displayName: string;
  profileState: ProfileState;
}

interface StatItemProps {
  label: string;
  value: string;
  iconSrc?: string;
  detail?: string;
  isSample?: boolean;
}

function StatItem({
  label,
  value,
  iconSrc,
  detail,
  isSample = false,
}: StatItemProps): React.JSX.Element {
  return (
    <div className={styles.statItem} role="group" aria-label={label}>
      {iconSrc ? (
        <img className={styles.statIcon} src={iconSrc} alt="" width={28} height={28} />
      ) : null}
      <div className={styles.statText}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
        {detail ? <span className={styles.statDetail}>{detail}</span> : null}
      </div>
      {isSample ? <SampleBadge /> : null}
    </div>
  );
}

function readStat(profileState: ProfileState, stat: "gamesPlayed" | "scoreAverage"): string {
  if (profileState.status === "pending") {
    return "Loading…";
  }
  // The error message itself shows once, next to the tabs.
  return profileState.status === "error" ? "–" : profileState.profile.stats[stat];
}

export function StatsCard({ displayName, profileState }: StatsCardProps): React.JSX.Element {
  const { won, checkout } = SAMPLE_PROFILE;

  return (
    <section className={styles.statsCard} aria-label="Player stats">
      <div className={styles.identity}>
        <img className={styles.avatar} src={avatarIcon} alt="" width={32} height={32} />
        <div className={styles.identityText}>
          <h2 className={styles.displayName}>{displayName}</h2>
          <p className={styles.subtitle}>
            {SAMPLE_PROFILE.subtitle} <SampleBadge />
          </p>
        </div>
      </div>

      <StatItem label="Member since" value={SAMPLE_PROFILE.memberSince} isSample />
      <StatItem
        label="Games played"
        value={readStat(profileState, "gamesPlayed")}
        iconSrc={gamepadIcon}
      />
      <StatItem
        label="Avg. points"
        value={readStat(profileState, "scoreAverage")}
        iconSrc={barChartIcon}
      />
      <StatItem
        label="Won"
        value={`${won.games} · ${won.winRate}% win rate`}
        iconSrc={trophyIcon}
        isSample
      />
      <StatItem
        label="Checkout rate"
        value={`${checkout.rate}%`}
        detail={`${checkout.checkouts} / ${checkout.attempts} checkouts`}
        iconSrc={targetIcon}
        isSample
      />

      <LogoutButton />
    </section>
  );
}
