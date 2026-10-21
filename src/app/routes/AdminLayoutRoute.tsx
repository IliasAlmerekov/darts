import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { gameQueries } from "@/shared/query/game.queries";
import { AdminLayout } from "@/shared/ui/admin-layout";

export default function AdminLayoutRoute(): React.JSX.Element {
  const { data } = useQuery({
    ...gameQueries.tablet(),
    // Route loaders keep it fresh; the nav only reads it when nothing else has.
    refetchOnMount: false,
  });

  return (
    <AdminLayout tabletGame={data?.game ?? null}>
      <Outlet />
    </AdminLayout>
  );
}
