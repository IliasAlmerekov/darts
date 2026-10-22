import React, { Suspense, lazy, useEffect, useState } from "react";
import {
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useNavigate,
} from "react-router-dom";
import styles from "@/app/App.module.css";
import "@/app/styles/index.css";
import ErrorBoundary from "@/app/ErrorBoundary";
import ScrollToTop from "@/app/ScrollToTop";
import AdminLayoutRoute from "@/app/routes/AdminLayoutRoute";
import NotFoundPage from "@/app/routes/NotFoundPage";
import ProtectedRoutes from "@/app/ProtectedRoutes";
import TabletGameGate from "@/app/routes/TabletGameGate";
import { QueryClientProvider } from "@tanstack/react-query";
import { scheduleSelectiveRouteWarmUp } from "@/app/routeWarmup";
import { useStatisticsPrefetch } from "@/app/useStatisticsPrefetch";
import { gameDetailLoader } from "@/pages/GameDetailPage/useGameDetailPage";
import { startPageLoader } from "@/pages/StartPage/startPageLoader";
import { gameSummaryLoader } from "@/pages/GameSummaryPage/useGameSummaryPage";
import { gamesOverviewLoader } from "@/pages/GamesOverviewPage/useGamesOverview";
import { clearUnauthorizedHandler, setUnauthorizedHandler } from "@/shared/api";
import { ROUTES } from "@/lib/router/routes";
import { clearClientSession } from "@/shared/api/auth";
import { queryClient } from "@/shared/query/queryClient";
import { tabletGameLoader } from "@/shared/query/tabletGameLoader";
import { UniversalSkeleton } from "@/shared/ui/skeletons";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const StartPage = lazy(() => import("@/pages/StartPage/StartPage"));
const GamePage = lazy(() => import("@/pages/GamePage"));
const GameSummaryPage = lazy(() => import("@/pages/GameSummaryPage"));
const GameDetailPage = lazy(() => import("@/pages/GameDetailPage"));
const GamesOverview = lazy(() => import("@/pages/GamesOverviewPage/GamesOverview"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const Statistics = lazy(() => import("@/pages/StatisticsPage"));
const JoinedGamePage = lazy(() => import("@/pages/JoinedGamePage"));
const PlayerProfile = lazy(() => import("@/pages/PlayerProfilePage"));

function withSuspense(element: React.ReactNode): React.JSX.Element {
  return <Suspense fallback={<UniversalSkeleton />}>{element}</Suspense>;
}

/** An admin page that follows the tablet game; its route loader reads the tablet game. */
function withTabletGame(element: React.ReactNode): React.JSX.Element {
  return withSuspense(<TabletGameGate>{element}</TabletGameGate>);
}

function AppShell(): React.JSX.Element {
  return (
    <>
      <UnauthorizedNavigationBridge />
      <ScrollToTop />
      <Outlet />
    </>
  );
}

function StatisticsPrefetch(): null {
  useStatisticsPrefetch();
  return null;
}

function UnauthorizedNavigationBridge(): null {
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearClientSession();
      navigate(ROUTES.login, { state: { from: window.location.pathname }, replace: true });
    });

    return () => {
      clearUnauthorizedHandler();
    };
  }, [navigate]);

  return null;
}

function createAppRouter(): ReturnType<typeof createBrowserRouter> {
  return createBrowserRouter(
    createRoutesFromElements(
      <Route element={<AppShell />} errorElement={<ErrorBoundary />}>
        <Route
          path={ROUTES.login}
          element={withSuspense(<LoginPage />)}
          errorElement={<ErrorBoundary />}
        />
        <Route
          path={ROUTES.register}
          element={withSuspense(<RegisterPage />)}
          errorElement={<ErrorBoundary />}
        />

        <Route
          element={<ProtectedRoutes allowedRoles={["ROLE_ADMIN"]} />}
          errorElement={<ErrorBoundary />}
        >
          <Route
            path={ROUTES.gamePattern}
            element={withTabletGame(<GamePage />)}
            loader={tabletGameLoader("game")}
            hydrateFallbackElement={<UniversalSkeleton />}
            errorElement={<ErrorBoundary />}
          />
          <Route
            path={ROUTES.summaryPattern}
            element={withTabletGame(<GameSummaryPage />)}
            loader={gameSummaryLoader}
            hydrateFallbackElement={<UniversalSkeleton />}
            errorElement={<ErrorBoundary />}
          />
          <Route element={<AdminLayoutRoute />} errorElement={<ErrorBoundary />}>
            <Route
              path={`${ROUTES.start()}/:id?`}
              element={withTabletGame(<StartPage />)}
              loader={startPageLoader}
              hydrateFallbackElement={<UniversalSkeleton />}
              errorElement={<ErrorBoundary />}
            />
            <Route
              path={ROUTES.detailsPattern}
              element={withSuspense(<GameDetailPage />)}
              loader={gameDetailLoader}
              errorElement={<ErrorBoundary />}
            />
            <Route
              path={ROUTES.gamesOverview}
              element={withSuspense(<GamesOverview />)}
              loader={gamesOverviewLoader}
              errorElement={<ErrorBoundary />}
            />
            <Route
              path={`${ROUTES.settings()}/:id?`}
              element={withTabletGame(<SettingsPage />)}
              loader={tabletGameLoader("settings")}
              hydrateFallbackElement={<UniversalSkeleton />}
              errorElement={<ErrorBoundary />}
            />
            <Route
              path={ROUTES.statistics}
              element={withSuspense(<Statistics />)}
              errorElement={<ErrorBoundary />}
            />
          </Route>
        </Route>

        <Route
          element={<ProtectedRoutes allowedRoles={["ROLE_PLAYER"]} />}
          errorElement={<ErrorBoundary />}
        >
          <Route
            path={ROUTES.joined}
            element={withSuspense(<JoinedGamePage />)}
            errorElement={<ErrorBoundary />}
          />
          <Route
            path={ROUTES.playerProfile}
            element={withSuspense(<PlayerProfile />)}
            errorElement={<ErrorBoundary />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} errorElement={<ErrorBoundary />} />
      </Route>,
    ),
  );
}

function App(): React.JSX.Element {
  const [router] = useState(createAppRouter);

  useEffect(() => {
    const stopRouteWarmUp = scheduleSelectiveRouteWarmUp();

    return () => {
      stopRouteWarmUp();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatisticsPrefetch />
      <div className={styles.root}>
        <RouterProvider router={router} />
      </div>
    </QueryClientProvider>
  );
}

export default App;
