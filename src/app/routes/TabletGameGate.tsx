import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRevalidator } from "react-router-dom";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { gameQueries } from "@/shared/query/game.queries";
import { ErrorState } from "@/shared/ui/error-state";
import { UniversalSkeleton } from "@/shared/ui/skeletons";

interface TabletGameGateProps {
  children: ReactNode;
}

/**
 * Renders an admin route once its loader has read the tablet game. A failed read shows an
 * error with Retry, which runs the loader again, instead of a page for an unchecked game id.
 */
export default function TabletGameGate({ children }: TabletGameGateProps): React.JSX.Element {
  const revalidator = useRevalidator();
  const { data, error } = useQuery({
    ...gameQueries.tablet(),
    // The route loader has just read it. Retry is the user's call.
    refetchOnMount: false,
    retryOnMount: false,
  });

  if (error !== null) {
    return (
      <ErrorState
        variant="page"
        title="Could not load the game on the tablet"
        message={toUserErrorMessage(error, "Please try again.")}
        primaryAction={{ label: "Retry", onClick: () => void revalidator.revalidate() }}
      />
    );
  }

  if (data === undefined) {
    return <UniversalSkeleton />;
  }

  return <>{children}</>;
}
