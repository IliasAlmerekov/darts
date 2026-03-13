import { Navigate, Outlet, useLocation } from "react-router-dom";
import { StartPageSkeleton, LoginSuccessSkeleton, UniversalSkeleton } from "@/shared/ui/skeletons";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { ROUTES } from "@/lib/router/routes";
import type { Role } from "@/shared/api/auth";

type ProtectedRoutesProps = {
  allowedRoles?: Role[];
};

const ADMIN_ROLE: Role = "ROLE_ADMIN";
const PLAYER_ROLE: Role = "ROLE_PLAYER";
const DEFAULT_ALLOWED_ROLES: Role[] = [ADMIN_ROLE];

function getFallbackRouteForAuthenticatedUser(roles: Role[] | undefined): string {
  if (Array.isArray(roles) && roles.includes(ADMIN_ROLE)) {
    return ROUTES.start();
  }

  if (Array.isArray(roles) && roles.includes(PLAYER_ROLE)) {
    return ROUTES.joined;
  }

  return ROUTES.login;
}

function ProtectedRoutes({
  allowedRoles = DEFAULT_ALLOWED_ROLES,
}: ProtectedRoutesProps): JSX.Element {
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
  const isAuthorized = Array.isArray(roles) && roles.some((r) => allowedRoles.includes(r));

  if (!isAuthorized) {
    return <Navigate to={getFallbackRouteForAuthenticatedUser(roles)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoutes;
