import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { gameQueries } from "@/shared/query/game.queries";
import { AdminLayout } from "@/shared/ui/admin-layout";

// A route loader may have read the tablet game a moment before the layout mounts.
const LOADER_READ_FRESH_MS = 1_000;

export default function AdminLayoutRoute(): React.JSX.Element {
  const { data } = useQuery({
    ...gameQueries.tablet(),
    // /statistics, /games and /details have no tablet game loader, and the game can finish on
    // /game or /summary, outside this layout. So the layout reads it again when it mounts.
    staleTime: LOADER_READ_FRESH_MS,
    // After a failed read only Retry reads again, so a page never renders for an id its
    // loader did not check.
    refetchOnMount: (query) => query.state.status !== "error",
    retryOnMount: false,
  });

  return (
    <AdminLayout tabletGame={data?.game ?? null}>
      <Outlet />
    </AdminLayout>
  );
}
