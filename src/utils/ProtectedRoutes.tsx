import { Navigate, Outlet } from "react-router-dom";
import React from "react";
import StartPageSkeleton from "../components/start-page-skeleton/StartPageSkeleton";
import LoginSuccessSkeleton from "../components/login-success-skeleton/LoginSuccessSkeleton";
import UniversalSkeleton from "../components/universal-skeleton/UniversalSkeleton";
import { useAuthenticatedUser } from "../hooks/useAuthenticatedUser";

type ProtectedRoutesProps = {
  allowedRoles?: string[];
};

const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ allowedRoles = ["ROLE_ADMIN"] }) => {
  const { user: loggedInUser, loading: checking } = useAuthenticatedUser();

  if (checking) {
    if (location.pathname.includes("/start")) {
      return <StartPageSkeleton />;
    }
    if (location.pathname.includes("/joined")) {
      return <LoginSuccessSkeleton />;
    }
    return <UniversalSkeleton />;
  }

  if (!loggedInUser) {
    console.log("User not authenticated - redirecting to login");
    return <Navigate to="/" />;
  }

  const roles = loggedInUser.roles;
  const isAuthorized = Array.isArray(roles) && roles.some((r: string) => allowedRoles.includes(r));

  if (!isAuthorized) {
    console.log(
      "User not authorized for protected route - roles:",
      roles,
      "allowed:",
      allowedRoles,
    );
    return <Navigate to="/" />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
