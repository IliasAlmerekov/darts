import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "@/app/styles/index.css";
import { GameFlowPortProvider } from "@/shared/providers/GameFlowPortProvider";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <GameFlowPortProvider>
      <App />
    </GameFlowPortProvider>
  </React.StrictMode>,
);
