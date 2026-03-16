import React, { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import styles from "@/app/ErrorBoundary.module.css";
import { clientLogger } from "@/shared/services/browser/clientLogger";

const DEFAULT_TITLE = "Something went wrong";
const DEFAULT_MESSAGE = "Please try refreshing the page.";

interface RouteErrorMetadata {
  data?: unknown;
  status: number;
  statusText: string;
}

interface NormalizedRouteError {
  error: Error;
  routeError: RouteErrorMetadata | null;
}

function normalizeRouteError(error: unknown): NormalizedRouteError {
  if (isRouteErrorResponse(error)) {
    return {
      error: new Error(error.statusText || `Route request failed with status ${error.status}`),
      routeError: {
        data: error.data,
        status: error.status,
        statusText: error.statusText,
      },
    };
  }

  if (error instanceof Error) {
    return { error, routeError: null };
  }

  return {
    error: new Error(typeof error === "string" ? error : "Unknown route error"),
    routeError: null,
  };
}

export default function ErrorBoundary(): React.JSX.Element {
  const routeError = useRouteError();

  useEffect(() => {
    const normalized = normalizeRouteError(routeError);

    clientLogger.error("route_error_boundary_crash", {
      context: normalized.routeError ?? undefined,
      error: normalized.error,
    });
  }, [routeError]);

  const handleReload = (): void => {
    window.location.reload();
  };

  return (
    <main className={styles.root} role="alert">
      <h1 className={styles.title}>{DEFAULT_TITLE}</h1>
      <p className={styles.message}>{DEFAULT_MESSAGE}</p>
      <button className={styles.button} type="button" onClick={handleReload}>
        Reload
      </button>
    </main>
  );
}
