import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@/app/styles/index.css";
import ErrorBoundary from "@/app/ErrorBoundary";
import { Game } from "@/features/game";
import { GameDetailPage, GamesOverview, Statistics } from "@/features/statistics";
import { Settings } from "@/features/settings";
import { PlayerProfile } from "@/features/player";
import { ProtectedRoutes, LoginPage, RegistrationPage } from "@/features/auth";
import { StartPage } from "@/features/start";
import { JoinedGamePage } from "@/features/joined-game";
import { GameSummaryPage } from "@/features/game-summary";

function App(): React.JSX.Element {
  return (
    <div className="app">
      <ErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  );
}

export default App;
