import { useStore } from "@nanostores/react";
import { Outlet } from "react-router-dom";
import { AdminLayout } from "@/shared/ui/admin-layout";
import { $currentGameId } from "@/shared/store";

export default function AdminLayoutRoute(): JSX.Element {
  const currentGameId = useStore($currentGameId);

  return (
    <AdminLayout currentGameId={currentGameId}>
      <Outlet />
    </AdminLayout>
  );
}
