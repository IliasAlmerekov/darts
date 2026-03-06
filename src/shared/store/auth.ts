import { atom } from "nanostores";
import type { AuthenticatedUser } from "@/shared/api/auth";

export const $user = atom<AuthenticatedUser | null>(null);
export const $authChecked = atom<boolean>(false);
export const $authError = atom<string | null>(null);

/**
 * Caches the current authenticated user result and marks auth as checked.
 */
export function setAuthenticatedUser(user: AuthenticatedUser | null): void {
  $user.set(user);
  $authError.set(null);
  $authChecked.set(true);
}

/**
 * Stores an auth error and marks auth as checked to stop indefinite loading.
 */
export function setAuthError(error: string | null): void {
  $user.set(null);
  $authError.set(error);
  $authChecked.set(true);
}

/**
 * Invalidates cached auth state so the next consumer re-checks the session.
 */
export function invalidateAuthState(): void {
  $user.set(null);
  $authError.set(null);
  $authChecked.set(false);
}

/**
 * Resets auth state for tests and explicit session teardown flows.
 */
export function resetAuthStore(): void {
  invalidateAuthState();
}
