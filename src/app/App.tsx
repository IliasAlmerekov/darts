import React, { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@/app/styles/index.css";
import ErrorBoundary from "@/app/ErrorBoundary";
import ScrollToTop from "@/app/ScrollToTop";
import NotFoundPage from "@/app/routes/NotFoundPage";
import { LoginPage, ProtectedRoutes, RegistrationPage } from "@/features/auth";

const StartPage = lazy(() => import("@/features/start").then((module) => ({ default: module.StartPage })));
const Game = lazy(() => import("@/features/game").then((module) => ({ default: module.Game })));
const GameSummaryPage = lazy(() =>
  import("@/features/game-summary").then((module) => ({ default: module.GameSummaryPage })),
);
const GameDetailPage = lazy(() =>
  import("@/features/statistics").then((module) => ({ default: module.GameDetailPage })),
);
const GamesOverview = lazy(() =>
  import("@/features/statistics").then((module) => ({ default: module.GamesOverview })),
);
const Settings = lazy(() =>
  import("@/features/settings").then((module) => ({ default: module.Settings })),
);
const Statistics = lazy(() =>
  import("@/features/statistics").then((module) => ({ default: module.Statistics })),
);
const JoinedGamePage = lazy(() =>
  import("@/features/joined-game").then((module) => ({ default: module.JoinedGamePage })),
);
const PlayerProfile = lazy(() =>
  import("@/features/player").then((module) => ({ default: module.PlayerProfile })),
);

function App(): React.JSX.Element {
  return (
    <div className="app">
      <ErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Suspense fallback={<div className="page-loader">Loading page…</div>}>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} />

              <Route element={<ProtectedRoutes allowedRoles={["ROLE_ADMIN"]} />}>
                <Route path="/start" element={<StartPage />} />
                <Route path="/start/:id" element={<StartPage />} />
                <Route path="/game/:id" element={<Game />} />
                <Route path="/summary/:id" element={<GameSummaryPage />} />
                <Route path="/details/:id" element={<GameDetailPage />} />
                <Route path="/gamesoverview" element={<GamesOverview />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/:id" element={<Settings />} />
                <Route path="/statistics" element={<Statistics />} />
              </Route>

              <Route element={<ProtectedRoutes allowedRoles={["ROLE_PLAYER"]} />}>
                <Route path="/joined" element={<JoinedGamePage />} />
                <Route path="/playerprofile" element={<PlayerProfile />} />
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
