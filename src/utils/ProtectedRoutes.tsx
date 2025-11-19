import { Navigate, Outlet } from "react-router-dom";
import React, { useState, useEffect } from "react";
import StartPageSkeleton from "../components/StartPageSkeleton/StartPageSkeleton";
import LoginSuccessSkeleton from "../components/LoginSuccessSkeleton/LoginSuccessSkeleton";
import UniversalSkeleton from "../components/Universalskeleton/UniversalSkeleton";

type ProtectedRoutesProps = {
  allowedRoles?: string[];
};

interface JoinedGameSuccessResponse {
  success: boolean;
  roles: string[];
  id: number;
  username: string;
  redirect: string;
}

const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ allowedRoles = ["ROLE_ADMIN"] }) => {
  const [loggedInUser, setLoggedInUser] = useState<JoinedGameSuccessResponse | null>(null);
  const [checking, setChecking] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch(`/api/login/success`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLoggedInUser(data.user ?? data);
        }
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (checking) {
    if (location.pathname.includes("/start")) {
      return <StartPageSkeleton />;
    }
    if (location.pathname.includes("/joined")) {
      return <LoginSuccessSkeleton />;
    }
    return <UniversalSkeleton />;
  }

  const roles = loggedInUser?.roles;
  const isAuthorized = Array.isArray(roles) && roles.some((r: string) => allowedRoles.includes(r));

  if (!isAuthorized) {
    console.debug(
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
