import { Navigate, Outlet, useLocation } from "react-router-dom";
import React from "react";
import { StartPageSkeleton, LoginSuccessSkeleton, UniversalSkeleton } from "@/shared/ui/skeletons";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { ROUTES } from "@/lib/routes";

type ProtectedRoutesProps = {
  allowedRoles?: string[];
};

const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ allowedRoles = ["ROLE_ADMIN"] }) => {
  const { user: loggedInUser, loading: checking } = useAuthenticatedUser();
  const { pathname } = useLocation();

  if (checking) {
    if (pathname.includes(ROUTES.start())) {
      return <StartPageSkeleton />;
    }
    if (pathname.includes(ROUTES.joined)) {
      return <LoginSuccessSkeleton />;
    }
    return <UniversalSkeleton />;
  }

  if (!loggedInUser) {
    return <Navigate to={ROUTES.login} />;
  }

  const roles = loggedInUser.roles;
  const isAuthorized = Array.isArray(roles) && roles.some((r: string) => allowedRoles.includes(r));

  if (!isAuthorized) {
    return <Navigate to={ROUTES.login} />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
