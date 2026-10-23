import type { RootOptions } from "react-dom/client";
import type { ClientLogger } from "@/shared/services/browser/clientLogger";

type RootErrorOptions = Required<Pick<RootOptions, "onUncaughtError" | "onRecoverableError">>;

export function createRootErrorOptions(logger: ClientLogger): RootErrorOptions {
  return {
    onUncaughtError: (error, errorInfo): void => {
      logger.error("root.render.failed", {
        context: { componentStack: errorInfo.componentStack },
        error,
      });
    },
    onRecoverableError: (error, errorInfo): void => {
      // React 19 often wraps the original error and keeps it in `cause`.
      const cause = error instanceof Error ? error.cause : undefined;

      logger.warn("root.render.recovered", {
        context: {
          ...(cause !== undefined ? { cause } : {}),
          componentStack: errorInfo.componentStack,
        },
        error,
      });
    },
  };
}
