import type { ReadableAtom } from "nanostores";
import type { AuthenticatedUser } from "@/shared/api/auth";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { authCheckedAtom, authErrorAtom, userAtom } from "./auth.state";

export const $user: ReadableAtom<AuthenticatedUser | null> = userAtom;
export const $authChecked: ReadableAtom<boolean> = authCheckedAtom;
export const $authError: ReadableAtom<string | null> = authErrorAtom;

type AuthInvalidationListener = () => void;

const authInvalidationListeners = new Set<AuthInvalidationListener>();

/**
 * Caches the current authenticated user result and marks auth as checked.
 */
export function setAuthenticatedUser(user: AuthenticatedUser | null): void {
  userAtom.set(user);
  authErrorAtom.set(null);
  authCheckedAtom.set(true);
}

/**
 * Stores an auth failure, clears the cached user, and marks auth as checked.
 */
export function setAuthFailed(error: string): void {
  userAtom.set(null);
  authErrorAtom.set(error);
  authCheckedAtom.set(true);
}

/**
 * Clears the cached auth error without mutating the authenticated user state.
 */
export function clearAuthError(): void {
  authErrorAtom.set(null);
}

export function registerAuthInvalidationListener(listener: AuthInvalidationListener): () => void {
  authInvalidationListeners.add(listener);

  return () => {
    authInvalidationListeners.delete(listener);
  };
}

function notifyAuthInvalidationListeners(): void {
  authInvalidationListeners.forEach((listener) => {
    try {
      listener();
    } catch (error: unknown) {
      clientLogger.error("auth_invalidation_listener_failed", {
        context: { listenerCount: authInvalidationListeners.size },
        error,
      });
    }
  });
}

/**
 * Invalidates cached auth state so the next consumer re-checks the session.
 */
export function invalidateAuthState(): void {
  userAtom.set(null);
  authErrorAtom.set(null);
  authCheckedAtom.set(false);
  notifyAuthInvalidationListeners();
}

/**
 * Resets auth state for tests and explicit session teardown flows.
 */
export function resetAuthStore(): void {
  userAtom.set(null);
  authErrorAtom.set(null);
  authCheckedAtom.set(false);
  authInvalidationListeners.clear();
}
