import type { AuthenticatedUser } from "@/shared/api/auth";

export const PROFILE_TABS = ["overview", "performance", "history"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
  overview: "Overview",
  performance: "Performance",
  history: "History",
};

function isProfileTab(value: string): value is ProfileTab {
  return PROFILE_TABS.some((tab) => tab === value);
}

/** The tab named by the `tab` URL parameter; a missing or unknown value opens Overview. */
export function parseProfileTab(value: string | null): ProfileTab {
  return value !== null && isProfileTab(value) ? value : "overview";
}

/** The username, then the email, of the logged-in player. */
export function getDisplayName(user: AuthenticatedUser | null): string {
  const username = user?.username?.trim();
  if (username) {
    return username;
  }

  const email = user?.email?.trim();
  if (email) {
    return email;
  }

  return "Not set";
}
