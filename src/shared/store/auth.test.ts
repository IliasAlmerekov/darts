// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  $authChecked,
  $authError,
  $user,
  invalidateAuthState,
  registerAuthInvalidationListener,
  resetAuthStore,
  setAuthenticatedUser,
  setAuthError,
} from "./auth";

describe("auth store", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("should cache authenticated user and mark auth as checked", () => {
    setAuthenticatedUser({
      success: true,
      roles: ["ROLE_USER"],
      id: 5,
      redirect: "/start",
    });

    expect($user.get()).toMatchObject({ id: 5 });
    expect($authChecked.get()).toBe(true);
    expect($authError.get()).toBeNull();
  });

  it("should cache auth error without leaving stale user data", () => {
    setAuthenticatedUser({
      success: true,
      roles: ["ROLE_USER"],
      id: 5,
      redirect: "/start",
    });

    setAuthError("Network request failed");

    expect($user.get()).toBeNull();
    expect($authChecked.get()).toBe(true);
    expect($authError.get()).toBe("Network request failed");
  });

  it("should invalidate cached auth state", () => {
    setAuthenticatedUser({
      success: true,
      roles: ["ROLE_USER"],
      id: 5,
      redirect: "/start",
    });

    invalidateAuthState();

    expect($user.get()).toBeNull();
    expect($authChecked.get()).toBe(false);
    expect($authError.get()).toBeNull();
  });

  it("should notify auth invalidation listeners and allow unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = registerAuthInvalidationListener(listener);

    invalidateAuthState();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    invalidateAuthState();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should clear auth invalidation listeners without notifying them when resetting the auth store", () => {
    const listener = vi.fn();

    registerAuthInvalidationListener(listener);

    resetAuthStore();
    expect(listener).not.toHaveBeenCalled();

    invalidateAuthState();
    expect(listener).not.toHaveBeenCalled();
  });
});
