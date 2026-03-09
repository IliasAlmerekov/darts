import { Navigate, Outlet, useLocation } from "react-router-dom";
import React from "react";
import { StartPageSkeleton, LoginSuccessSkeleton, UniversalSkeleton } from "@/shared/ui/skeletons";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { ROUTES } from "@/lib/routes";

type ProtectedRoutesProps = {
  allowedRoles?: string[];
};

function getFallbackRouteForAuthenticatedUser(roles: string[] | undefined): string {
  if (Array.isArray(roles) && roles.includes("ROLE_ADMIN")) {
    return ROUTES.start();
  }

  if (Array.isArray(roles) && roles.includes("ROLE_PLAYER")) {
    return ROUTES.joined;
  }

  return ROUTES.login;
}

const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ allowedRoles = ["ROLE_ADMIN"] }) => {
  const { user: loggedInUser, loading: checking } = useAuthenticatedUser();
  const { pathname } = useLocation();

  if (checking) {
    if (pathname === ROUTES.start() || pathname.startsWith(ROUTES.start() + "/")) {
      return <StartPageSkeleton />;
    }
    if (pathname === ROUTES.joined || pathname.startsWith(ROUTES.joined + "/")) {
      return <LoginSuccessSkeleton />;
    }
    return <UniversalSkeleton />;
  }

  if (!loggedInUser) {
    return <Navigate to={ROUTES.login} state={{ from: pathname }} replace />;
  }

  const roles = loggedInUser.roles;
  const isAuthorized = Array.isArray(roles) && roles.some((r: string) => allowedRoles.includes(r));

  if (!isAuthorized) {
    return <Navigate to={getFallbackRouteForAuthenticatedUser(roles)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
