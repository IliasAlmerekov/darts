import type { ErrorInfo, ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";
import styles from "@/app/ErrorBoundary.module.css";
import { clientLogger } from "@/shared/services/browser/clientLogger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  fallbackTitle?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorFallbackProps {
  message: string;
  resetErrorBoundary: () => void;
  title: string;
}

const DEFAULT_TITLE = "Something went wrong";
const DEFAULT_MESSAGE = "Please try refreshing the page.";

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : "Unknown error");
}

function ErrorFallback({
  message,
  resetErrorBoundary,
  title,
}: ErrorFallbackProps): React.JSX.Element {
  const handleReload = (): void => {
    resetErrorBoundary();
    window.location.reload();
  };

  return (
    <main className={styles.root} role="alert">
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      <button className={styles.button} type="button" onClick={handleReload}>
        Reload
      </button>
    </main>
  );
}

function ErrorBoundary({
  children,
  fallbackMessage,
  fallbackTitle,
  onError,
}: ErrorBoundaryProps): React.JSX.Element {
  const title = fallbackTitle ?? DEFAULT_TITLE;
  const message = fallbackMessage ?? DEFAULT_MESSAGE;

  const handleError = (error: unknown, info: ErrorInfo): void => {
    const normalizedError = toError(error);

    if (onError) {
      onError(normalizedError, info);
      return;
    }

    clientLogger.error("ui.error-boundary.crash", {
      context: { componentStack: info.componentStack },
      error: normalizedError,
    });
  };

  const renderFallback = ({ resetErrorBoundary }: FallbackProps): React.JSX.Element => (
    <ErrorFallback message={message} resetErrorBoundary={resetErrorBoundary} title={title} />
  );

  return (
    <ReactErrorBoundary fallbackRender={renderFallback} onError={handleError}>
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;
