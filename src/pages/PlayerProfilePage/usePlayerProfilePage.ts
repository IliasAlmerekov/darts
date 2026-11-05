import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { PlayerProfile } from "@/lib/player/profile";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { playerQueries } from "@/shared/query/player.queries";
import { toHitDots, type HitDot } from "./lib/hitDots";
import { toBoardHitFrequencies, type BoardHitFrequencies } from "./lib/hitFrequency";
import { getDisplayName, parseProfileTab, type ProfileTab } from "./lib/profilePage";

export type ProfileState =
  | { status: "pending" }
  | { status: "error"; message: string; retry: () => void }
  | {
      status: "success";
      profile: PlayerProfile;
      hitFrequencies: BoardHitFrequencies;
      hitDots: HitDot[];
    };

interface UsePlayerProfilePageResult {
  /** Null until the logged-in user is known. */
  playerId: number | null;
  displayName: string;
  profileState: ProfileState;
  tab: ProfileTab;
  selectTab: (tab: ProfileTab) => void;
}

export function usePlayerProfilePage(): UsePlayerProfilePageResult {
  const { user } = useAuthenticatedUser();
  const { data, error, refetch } = useQuery(playerQueries.profile());
  const [searchParams, setSearchParams] = useSearchParams();

  const selectTab = (tab: ProfileTab): void => {
    setSearchParams(
      (params) => {
        params.set("tab", tab);
        return params;
      },
      { replace: true },
    );
  };

  // Up to 600 dots, so they are worked out once per profile answer, not on every render.
  const hitDots = useMemo(
    () => (data === undefined ? [] : toHitDots(data.hitDistribution)),
    [data],
  );

  // A failed request shows its error even when an older answer is still cached.
  const profileState: ProfileState =
    error !== null
      ? {
          status: "error",
          message: toUserErrorMessage(error),
          retry: () => void refetch(),
        }
      : data === undefined
        ? { status: "pending" }
        : {
            status: "success",
            profile: data,
            hitFrequencies: toBoardHitFrequencies(data.hitDistribution),
            hitDots,
          };

  return {
    playerId: user?.id ?? null,
    displayName: getDisplayName(user),
    profileState,
    tab: parseProfileTab(searchParams.get("tab")),
    selectTab,
  };
}
