import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { PlayerProfile } from "@/lib/player/profile";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { playerQueries } from "@/shared/query/player.queries";
import { toBoardHitFrequencies, type BoardHitFrequencies } from "./lib/hitFrequency";
import { getDisplayName, parseProfileTab, type ProfileTab } from "./lib/profilePage";

export type ProfileState =
  | { status: "pending" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "success"; profile: PlayerProfile; hitFrequencies: BoardHitFrequencies };

interface UsePlayerProfilePageReturn {
  displayName: string;
  profileState: ProfileState;
  tab: ProfileTab;
  selectTab: (tab: ProfileTab) => void;
}

export function usePlayerProfilePage(): UsePlayerProfilePageReturn {
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
          };

  return {
    displayName: getDisplayName(user),
    profileState,
    tab: parseProfileTab(searchParams.get("tab")),
    selectTab,
  };
}
