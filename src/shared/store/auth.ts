import { atom } from "nanostores";
import type { AuthenticatedUser } from "@/shared/api/auth";
import { clientLogger } from "@/shared/lib/clientLogger";

export const $user = atom<AuthenticatedUser | null>(null);
export const $authChecked = atom<boolean>(false);
export const $authError = atom<string | null>(null);

type AuthInvalidationListener = () => void;

const authInvalidationListeners = new Set<AuthInvalidationListener>();

/**
 * Caches the current authenticated user result and marks auth as checked.
 */
export function setAuthenticatedUser(user: AuthenticatedUser | null): void {
  $user.set(user);
  $authError.set(null);
  $authChecked.set(true);
}

/**
 * Stores an auth failure, clears the cached user, and marks auth as checked.
 */
export function setAuthFailed(error: string): void {
  $user.set(null);
  $authError.set(error);
  $authChecked.set(true);
}

/**
 * Clears the cached auth error without mutating the authenticated user state.
 */
export function clearAuthError(): void {
  $authError.set(null);
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
      clientLogger.error("auth.invalidation-listener.failed", {
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
  $user.set(null);
  $authError.set(null);
  $authChecked.set(false);
  notifyAuthInvalidationListeners();
}

/**
 * Resets auth state for tests and explicit session teardown flows.
 */
export function resetAuthStore(): void {
  $user.set(null);
  $authError.set(null);
  $authChecked.set(false);
  authInvalidationListeners.clear();
}
