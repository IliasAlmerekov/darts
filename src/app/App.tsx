import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import "@/app/styles/index.css";
import ErrorBoundary from "@/app/ErrorBoundary";
import ScrollToTop from "@/app/ScrollToTop";
import NotFoundPage from "@/app/routes/NotFoundPage";
import ProtectedRoutes from "@/app/ProtectedRoutes";
import { clearUnauthorizedHandler, setUnauthorizedHandler } from "@/shared/api";
import { ROUTES } from "@/lib/routes";
import { invalidateAuthState } from "@/shared/store/auth";
import { resetRoomStore } from "@/shared/store/game-session";
import { resetGameStore } from "@/shared/store/game-state";
import { UniversalSkeleton } from "@/shared/ui/skeletons";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const StartPage = lazy(() => import("@/pages/StartPage"));
const GamePage = lazy(() => import("@/pages/GamePage"));
const GameSummaryPage = lazy(() => import("@/pages/GameSummaryPage"));
const GameDetailPage = lazy(() => import("@/pages/GameDetailPage"));
const GamesOverview = lazy(() => import("@/pages/GamesOverviewPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const Statistics = lazy(() => import("@/pages/StatisticsPage"));
const JoinedGamePage = lazy(() => import("@/pages/JoinedGamePage"));
const PlayerProfile = lazy(() => import("@/pages/PlayerProfilePage"));

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function UnauthorizedNavigationBridge(): null {
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      invalidateAuthState();
      resetRoomStore();
      resetGameStore();
      navigate(ROUTES.login, { state: { from: window.location.pathname }, replace: true });
    });

    return () => {
      clearUnauthorizedHandler();
    };
  }, [navigate]);

  return null;
}

function App(): React.JSX.Element {
  useEffect(() => {
    const windowWithIdleCallback = window as WindowWithIdleCallback;
    const warmUpRoutes = () => {
      void import("@/pages/StartPage");
      void import("@/pages/GamePage");
      void import("@/pages/GameSummaryPage");
      void import("@/pages/SettingsPage");
      void import("@/pages/StatisticsPage");
      void import("@/pages/JoinedGamePage");
      void import("@/pages/PlayerProfilePage");
    };

    if (windowWithIdleCallback.requestIdleCallback && windowWithIdleCallback.cancelIdleCallback) {
      const idleCallbackId = windowWithIdleCallback.requestIdleCallback(() => {
        warmUpRoutes();
      });
      return () => {
        windowWithIdleCallback.cancelIdleCallback?.(idleCallbackId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      warmUpRoutes();
    }, 300);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="app">
      <ErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <UnauthorizedNavigationBridge />
          <ScrollToTop />
          <Suspense fallback={<UniversalSkeleton />}>
            <Routes>
              <Route path={ROUTES.login} element={<LoginPage />} />
              <Route path={ROUTES.register} element={<RegisterPage />} />

              <Route element={<ProtectedRoutes allowedRoles={["ROLE_ADMIN"]} />}>
                <Route path={`${ROUTES.start()}/:id?`} element={<StartPage />} />
                <Route path={ROUTES.gamePattern} element={<GamePage />} />
                <Route path={ROUTES.summaryPattern} element={<GameSummaryPage />} />
                <Route path={ROUTES.detailsPattern} element={<GameDetailPage />} />
                <Route path={ROUTES.gamesOverview} element={<GamesOverview />} />
                <Route path={ROUTES.settings()} element={<SettingsPage />} />
                <Route path={`${ROUTES.settings()}/:id`} element={<SettingsPage />} />
                <Route path={ROUTES.statistics} element={<Statistics />} />
              </Route>

              <Route element={<ProtectedRoutes allowedRoles={["ROLE_PLAYER"]} />}>
                <Route path={ROUTES.joined} element={<JoinedGamePage />} />
                <Route path={ROUTES.playerProfile} element={<PlayerProfile />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  );
}

export default App;
