import { Navigate, Outlet } from "react-router-dom";
import React from "react";
import StartPageSkeleton from "@/components/skeletons/StartPageSkeleton";
import LoginSuccessSkeleton from "@/components/skeletons/LoginSuccessSkeleton";
import UniversalSkeleton from "@/components/skeletons/UniversalSkeleton";
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
    return <Navigate to="/" />;
  }

  const roles = loggedInUser.roles;
  const isAuthorized = Array.isArray(roles) && roles.some((r: string) => allowedRoles.includes(r));

  if (!isAuthorized) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
