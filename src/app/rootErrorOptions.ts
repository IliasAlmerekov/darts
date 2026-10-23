import type { RootOptions } from "react-dom/client";
import type { ClientLogger } from "@/shared/services/browser/clientLogger";

export function createRootErrorOptions(logger: ClientLogger): RootOptions {
  return {
    onUncaughtError: (error, errorInfo): void => {
      logger.error("root.render.failed", {
        context: { componentStack: errorInfo.componentStack },
        error,
      });
    },
    onRecoverableError: (error, errorInfo): void => {
      // React 19 often wraps the original error and keeps it in `cause`.
      logger.warn("root.render.recovered", {
        context: {
          cause: error instanceof Error ? error.cause : undefined,
          componentStack: errorInfo.componentStack,
        },
        error,
      });
    },
  };
}
