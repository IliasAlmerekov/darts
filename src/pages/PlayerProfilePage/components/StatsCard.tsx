import React from "react";
import clsx from "clsx";
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
  className?: string | undefined;
}

interface StatItemProps {
  label: string;
  value: string;
  iconSrc: string;
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
    <li>
      <div className={styles.statItem} role="group" aria-label={label}>
        <span className={styles.statIconTile}>
          <img className={styles.statIcon} src={iconSrc} alt="" width={36} height={36} />
        </span>
        <div className={styles.statText}>
          <span className={styles.statLabel}>
            {label}
            {isSample ? <SampleBadge /> : null}
          </span>
          <span className={styles.statValue}>{value}</span>
          {detail ? <span className={styles.statDetail}>{detail}</span> : null}
        </div>
      </div>
    </li>
  );
}

function CalendarIcon(): React.JSX.Element {
  return (
    <svg
      className={styles.calendarIcon}
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" />
    </svg>
  );
}

function readStat(profileState: ProfileState, stat: "gamesPlayed" | "scoreAverage"): string {
  if (profileState.status === "pending") {
    return "Loading…";
  }
  // The error message itself shows once, in the tab panel.
  return profileState.status === "error" ? "–" : profileState.profile.stats[stat];
}

export function StatsCard({
  displayName,
  profileState,
  className,
}: StatsCardProps): React.JSX.Element {
  const { won, checkout } = SAMPLE_PROFILE;

  return (
    <section className={clsx(styles.statsCard, className)} aria-label="Player stats">
      <div className={styles.identity}>
        <span className={styles.avatar}>
          <img className={styles.avatarIcon} src={avatarIcon} alt="" width={80} height={80} />
        </span>
        <h2 className={styles.displayName}>{displayName}</h2>
        <p className={styles.subtitle}>
          {SAMPLE_PROFILE.subtitle} <SampleBadge />
        </p>
        <p className={styles.memberSince} role="group" aria-label="Member since">
          <CalendarIcon />
          Member since {SAMPLE_PROFILE.memberSince}
          <SampleBadge />
        </p>
      </div>

      <ul className={styles.statList}>
        <StatItem
          label="Games played"
          value={readStat(profileState, "gamesPlayed")}
          iconSrc={gamepadIcon}
        />
        <StatItem
          label="Won"
          value={String(won.games)}
          detail={`${won.winRate}% win rate`}
          iconSrc={trophyIcon}
          isSample
        />
        <StatItem
          label="Avg. points"
          value={readStat(profileState, "scoreAverage")}
          iconSrc={barChartIcon}
        />
        <StatItem
          label="Checkout rate"
          value={`${checkout.rate}%`}
          detail={`${checkout.checkouts} / ${checkout.attempts} checkouts`}
          iconSrc={targetIcon}
          isSample
        />
      </ul>

      <div className={styles.actions}>
        <LogoutButton />
      </div>
    </section>
  );
}
