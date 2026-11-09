import React from "react";
import barChartIcon from "@/assets/icons/bar-chart.svg";
import type { PlayerProfile } from "@/lib/player/profile";
import {
  ProfileBlock,
  ProfileStatisticsOverview,
  RangeSelect,
} from "@/shared/ui/profile-statistics";
import { ScoringTrendChart } from "../components/ScoringTrendChart";

interface OverviewTabProps {
  profile: PlayerProfile;
  displayName: string;
}

// shortcut: the API serves one scoring trend range, so the menu has one item; add items with ranges.
const SCORING_TREND_OPTIONS = [{ value: "last10", label: "Last 10 games" }] as const;

export function OverviewTab({ profile, displayName }: OverviewTabProps): React.JSX.Element {
  return (
    <ProfileStatisticsOverview
      statistics={profile}
      displayName={displayName}
      isOwnProfile
      trendBlock={
        <ProfileBlock
          title="Scoring trend"
          iconSrc={barChartIcon}
          action={
            <RangeSelect
              label="Games in the scoring trend"
              options={SCORING_TREND_OPTIONS}
              value="last10"
            />
          }
        >
          <ScoringTrendChart points={profile.scoringTrend} />
        </ProfileBlock>
      }
    />
  );
}
