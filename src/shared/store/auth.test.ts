// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  $authChecked,
  $authError,
  $user,
  clearAuthError,
  invalidateAuthState,
  registerAuthInvalidationListener,
  resetAuthStore,
  setAuthenticatedUser,
  setAuthFailed,
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

  it("should clear the cached user when auth fails", () => {
    setAuthenticatedUser({
      success: true,
      roles: ["ROLE_USER"],
      id: 5,
      redirect: "/start",
    });

    setAuthFailed("Network request failed");

    expect($user.get()).toBeNull();
    expect($authChecked.get()).toBe(true);
    expect($authError.get()).toBe("Network request failed");
  });

  it("should clear auth error without logging out the current user", () => {
    setAuthenticatedUser({
      success: true,
      roles: ["ROLE_USER"],
      id: 9,
      redirect: "/start",
    });
    setAuthFailed("Network request failed");
    setAuthenticatedUser({
      success: true,
      roles: ["ROLE_USER"],
      id: 9,
      redirect: "/start",
    });

    clearAuthError();

    expect($user.get()).toMatchObject({ id: 9 });
    expect($authError.get()).toBeNull();
    expect($authChecked.get()).toBe(true);
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

  it("should set $user to null when setAuthFailed is called", () => {
    setAuthFailed("some error");

    expect($user.get()).toBeNull();
  });

  it("should call all registered listeners when invalidateAuthState fires", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    registerAuthInvalidationListener(listener1);
    registerAuthInvalidationListener(listener2);

    invalidateAuthState();

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it("should execute remaining listeners when one throws", () => {
    const throwing = vi.fn(() => {
      throw new Error("boom");
    });
    const surviving = vi.fn();
    registerAuthInvalidationListener(throwing);
    registerAuthInvalidationListener(surviving);

    invalidateAuthState();

    expect(throwing).toHaveBeenCalledTimes(1);
    expect(surviving).toHaveBeenCalledTimes(1);
  });

  it("should not call listener after resetAuthStore clears it", () => {
    const listener = vi.fn();
    registerAuthInvalidationListener(listener);

    resetAuthStore();

    expect(listener).not.toHaveBeenCalled();
  });
});
