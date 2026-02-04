import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

const DEFAULT_TITLE = "Something went wrong";
const DEFAULT_MESSAGE = "Please try refreshing the page.";

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, info);
      return;
    }

    console.error("Unhandled application error:", error, info);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.fallbackTitle ?? DEFAULT_TITLE;
    const message = this.props.fallbackMessage ?? DEFAULT_MESSAGE;

    return (
      <main className="app-error" role="alert">
        <h1 className="app-error__title">{title}</h1>
        <p className="app-error__message">{message}</p>
        <button className="app-error__button" type="button" onClick={this.handleReload}>
          Reload
        </button>
      </main>
    );
  }
}

export default ErrorBoundary;
