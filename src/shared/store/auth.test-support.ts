import type { AuthenticatedUser } from "@/shared/api/auth";
import { authCheckedAtom, authErrorAtom, userAtom } from "./auth.state";

export function testOnlySetUser(value: AuthenticatedUser | null): void {
  userAtom.set(value);
}

export function testOnlySetAuthChecked(value: boolean): void {
  authCheckedAtom.set(value);
}

export function testOnlySetAuthError(value: string | null): void {
  authErrorAtom.set(value);
}
