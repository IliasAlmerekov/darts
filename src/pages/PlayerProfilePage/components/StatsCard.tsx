import React from "react";
import clsx from "clsx";
import avatarIcon from "@/assets/icons/user-blue.svg";
import barChartIcon from "@/assets/icons/bar-chart.svg";
import gamepadIcon from "@/assets/icons/gamepad.svg";
import targetIcon from "@/assets/icons/target.svg";
import trophyIcon from "@/assets/icons/trophy.svg";
import { LogoutButton } from "@/shared/ui/logout-button";
import type { PlayerProfile } from "@/lib/player/profile";
import type { ProfileState } from "../usePlayerProfilePage";
import styles from "./StatsCard.module.css";

interface StatsCardProps {
  displayName: string;
  profileState: ProfileState;
  className?: string | undefined;
}

interface StatItemProps {
  label: string;
  /** The group's accessible name when it differs from the visible label. */
  accessibleName?: string;
  value: string;
  iconSrc: string;
  /** Null while the stat has no detail to show. */
  detail: string | null;
}

function StatItem({
  label,
  accessibleName,
  value,
  iconSrc,
  detail,
}: StatItemProps): React.JSX.Element {
  return (
    <li>
      <div className={styles.statItem} role="group" aria-label={accessibleName ?? label}>
        <span className={styles.statIconTile}>
          <img className={styles.statIcon} src={iconSrc} alt="" width={36} height={36} />
        </span>
        <div className={styles.statText}>
          <span
            className={styles.statLabel}
            aria-hidden={accessibleName === undefined ? undefined : true}
          >
            {label}
          </span>
          <span className={styles.statValue}>{value}</span>
          {detail === null ? null : <span className={styles.statDetail}>{detail}</span>}
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

function readStat(profileState: ProfileState, stat: keyof PlayerProfile["stats"]): string {
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
  const profile = profileState.status === "success" ? profileState.profile : null;

  return (
    <section className={clsx(styles.statsCard, className)} aria-label="Player stats">
      <div className={styles.identity}>
        <span className={styles.avatar}>
          <img className={styles.avatarIcon} src={avatarIcon} alt="" width={80} height={80} />
        </span>
        <h2 className={styles.displayName}>{displayName}</h2>
        {profile === null || profile.memberSince === null ? null : (
          <p className={styles.memberSince} role="group" aria-label="Member since">
            <CalendarIcon />
            Member since {profile.memberSince}
          </p>
        )}
      </div>

      <ul className={styles.statList}>
        <StatItem
          label="Games played"
          value={readStat(profileState, "gamesPlayed")}
          detail={null}
          iconSrc={gamepadIcon}
        />
        <StatItem
          label="Won"
          value={readStat(profileState, "wins")}
          detail={profile === null ? null : `${profile.stats.winRate} win rate`}
          iconSrc={trophyIcon}
        />
        <StatItem
          label="Ø AVG"
          accessibleName="three-dart average"
          value={readStat(profileState, "scoreAverage")}
          detail={null}
          iconSrc={barChartIcon}
        />
        <StatItem
          label="Checkout rate"
          value={readStat(profileState, "checkoutRate")}
          detail={profile === null ? null : `${profile.stats.checkouts} checkouts`}
          iconSrc={targetIcon}
        />
      </ul>

      <div className={styles.actions}>
        <LogoutButton />
      </div>
    </section>
  );
}
