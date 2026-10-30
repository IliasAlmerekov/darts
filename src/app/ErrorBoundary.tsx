import React, { useEffect, useRef } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import styles from "@/app/ErrorBoundary.module.css";
import NotFoundPage from "@/app/routes/NotFoundPage";
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

function isNotFoundRouteError(error: unknown): boolean {
  return isRouteErrorResponse(error) && error.status === 404;
}

export default function ErrorBoundary(): React.JSX.Element {
  const routeError = useRouteError();
  const isNotFound = isNotFoundRouteError(routeError);
  // StrictMode runs the effect twice in development; the ref outlives that re-run, so one
  // error object is logged once while a different error is still logged.
  // The box tells "nothing logged yet" apart from a logged `null` or `undefined` error.
  const lastLoggedErrorRef = useRef<{ error: unknown } | null>(null);

  useEffect(() => {
    // A 404 is an expected answer, not a crash.
    if (isNotFound) return;
    if (lastLoggedErrorRef.current?.error === routeError) return;
    lastLoggedErrorRef.current = { error: routeError };

    const normalized = normalizeRouteError(routeError);

    clientLogger.error("route_error_boundary_crash", {
      context: normalized.routeError ?? undefined,
      error: normalized.error,
    });
  }, [routeError, isNotFound]);

  const handleReload = (): void => {
    window.location.reload();
  };

  if (isNotFound) {
    return <NotFoundPage />;
  }

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
