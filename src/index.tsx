import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { createRootErrorOptions } from "./app/rootErrorOptions";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import "@/app/styles/index.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
  createRootErrorOptions(clientLogger),
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
