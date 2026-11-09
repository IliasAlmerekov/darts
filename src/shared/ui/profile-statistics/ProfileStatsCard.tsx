import React from "react";
import clsx from "clsx";
import barChartIcon from "@/assets/icons/bar-chart.svg";
import gamepadIcon from "@/assets/icons/gamepad.svg";
import targetIcon from "@/assets/icons/target.svg";
import trophyIcon from "@/assets/icons/trophy.svg";
import { PlayerAvatar } from "@/shared/ui/player-avatar";
import type { ProfileStatistics } from "@/lib/player/profile";
import styles from "./ProfileStatsCard.module.css";

type HeadlineStats = ProfileStatistics["stats"];

interface ProfileStatsCardProps {
  /** Null while the player is unknown: the avatar shows its icon. */
  playerId: number | null;
  displayName: string;
  /** Null while the profile loads or after it failed; `isPending` tells the two apart. */
  stats: HeadlineStats | null;
  isPending: boolean;
  /** The Registration month; only the own Player profile shows it. */
  memberSince?: string | null;
  /** Controls under the stats, such as Log out on the own Player profile. */
  actions?: React.ReactNode;
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

function readStat(
  stats: HeadlineStats | null,
  isPending: boolean,
  stat: keyof HeadlineStats,
): string {
  if (stats !== null) {
    return stats[stat];
  }
  // The error message itself shows once, next to the card.
  return isPending ? "Loading…" : "–";
}

/** The player's avatar, name and four headline stats. */
export function ProfileStatsCard({
  playerId,
  displayName,
  stats,
  isPending,
  memberSince = null,
  actions,
  className,
}: ProfileStatsCardProps): React.JSX.Element {
  return (
    <section className={clsx(styles.statsCard, className)} aria-label="Player stats">
      <div className={styles.identity}>
        <PlayerAvatar className={styles.avatar} playerId={playerId} />
        <h2 className={styles.displayName}>{displayName}</h2>
        {memberSince === null ? null : (
          <p className={styles.memberSince} role="group" aria-label="Member since">
            <CalendarIcon />
            Member since {memberSince}
          </p>
        )}
      </div>

      <ul className={styles.statList}>
        <StatItem
          label="Games played"
          value={readStat(stats, isPending, "gamesPlayed")}
          detail={null}
          iconSrc={gamepadIcon}
        />
        <StatItem
          label="Won"
          value={readStat(stats, isPending, "wins")}
          detail={stats === null ? null : `${stats.winRate} win rate`}
          iconSrc={trophyIcon}
        />
        <StatItem
          label="Ø AVG"
          accessibleName="three-dart average"
          value={readStat(stats, isPending, "scoreAverage")}
          detail={null}
          iconSrc={barChartIcon}
        />
        <StatItem
          label="Checkout rate"
          value={readStat(stats, isPending, "checkoutRate")}
          detail={stats === null ? null : `${stats.checkouts} checkouts`}
          iconSrc={targetIcon}
        />
      </ul>

      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
