// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./useWakeLock";

function setNavigatorWakeLock(request: (type?: WakeLockType) => Promise<WakeLockSentinel>): void {
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: {
      request,
    } satisfies Pick<WakeLock, "request">,
  });
}

let initialWakeLockDescriptor: PropertyDescriptor | undefined;
let hasOwnWakeLockDescriptor = false;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createWakeLockSentinel(release: () => Promise<void> = async () => {}): WakeLockSentinel {
  const eventTarget = new EventTarget();
  let released = false;

  return {
    onrelease: null,
    get released() {
      return released;
    },
    get type(): WakeLockType {
      return "screen";
    },
    async release() {
      await release();
      released = true;
    },
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
  } satisfies WakeLockSentinel;
}

function restoreNavigatorWakeLock(): void {
  if (hasOwnWakeLockDescriptor && initialWakeLockDescriptor) {
    Object.defineProperty(navigator, "wakeLock", initialWakeLockDescriptor);
    return;
  }

  Reflect.deleteProperty(navigator, "wakeLock");
}

describe("useWakeLock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasOwnWakeLockDescriptor = Object.prototype.hasOwnProperty.call(navigator, "wakeLock");
    initialWakeLockDescriptor = Object.getOwnPropertyDescriptor(navigator, "wakeLock");
    restoreNavigatorWakeLock();
  });

  afterEach(() => {
    restoreNavigatorWakeLock();
  });

  it("should not request wake lock when the API is unsupported", () => {
    expect("wakeLock" in navigator).toBe(false);
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });

  it("should request a screen wake lock when enabled", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const sentinel = createWakeLockSentinel(releaseMock);
    const requestMock = vi.fn().mockResolvedValue(sentinel);

    setNavigatorWakeLock(requestMock);
    renderHook(() => useWakeLock(true));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("screen");
      expect(requestMock).toHaveBeenCalledTimes(1);
    });
  });

  it("should not request wake lock when disabled in a supported browser", async () => {
    const requestMock = vi.fn().mockResolvedValue(createWakeLockSentinel());

    setNavigatorWakeLock(requestMock);
    renderHook(() => useWakeLock(false));
    await flushMicrotasks();

    expect(requestMock).not.toHaveBeenCalled();
  });

  it("should release the sentinel when disabled after acquisition", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const sentinel = createWakeLockSentinel(releaseMock);
    const requestMock = vi.fn().mockResolvedValue(sentinel);

    setNavigatorWakeLock(requestMock);

    const { rerender } = renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => useWakeLock(isEnabled),
      {
        initialProps: { isEnabled: true },
      },
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    rerender({ isEnabled: false });

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it("should release the sentinel when unmounted", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const sentinel = createWakeLockSentinel(releaseMock);
    const requestMock = vi.fn().mockResolvedValue(sentinel);

    setNavigatorWakeLock(requestMock);
    const { unmount } = renderHook(() => useWakeLock(true));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    unmount();

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it("should swallow wake-lock request rejection when the request is rejected", async () => {
    const requestMock = vi.fn().mockRejectedValue(new Error("denied"));

    setNavigatorWakeLock(requestMock);
    const { rerender } = renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => useWakeLock(isEnabled),
      {
        initialProps: { isEnabled: true },
      },
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    expect(() => rerender({ isEnabled: false })).not.toThrow();
  });

  it("should release a late sentinel when unmounted before the pending request resolves", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const sentinel = createWakeLockSentinel(releaseMock);
    const requestDeferred = createDeferred<WakeLockSentinel>();
    const requestMock = vi.fn().mockReturnValue(requestDeferred.promise);

    setNavigatorWakeLock(requestMock);
    const { unmount } = renderHook(() => useWakeLock(true));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    unmount();

    requestDeferred.resolve(sentinel);
    await flushMicrotasks();

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it("should release a late sentinel when toggled off before the pending request resolves", async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const sentinel = createWakeLockSentinel(releaseMock);
    const requestDeferred = createDeferred<WakeLockSentinel>();
    const requestMock = vi.fn().mockReturnValue(requestDeferred.promise);

    setNavigatorWakeLock(requestMock);
    const { rerender } = renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => useWakeLock(isEnabled),
      {
        initialProps: { isEnabled: true },
      },
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    rerender({ isEnabled: false });
    requestDeferred.resolve(sentinel);
    await flushMicrotasks();

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it("should swallow release rejection when disabled after a successful lock", async () => {
    const releaseMock = vi.fn().mockRejectedValue(new Error("release failed"));
    const sentinel = createWakeLockSentinel(releaseMock);
    const requestMock = vi.fn().mockResolvedValue(sentinel);

    setNavigatorWakeLock(requestMock);
    const { rerender } = renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => useWakeLock(isEnabled),
      {
        initialProps: { isEnabled: true },
      },
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    expect(() => rerender({ isEnabled: false })).not.toThrow();

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it("should swallow release rejection when unmounted after a successful lock", async () => {
    const releaseMock = vi.fn().mockRejectedValue(new Error("release failed"));
    const sentinel = createWakeLockSentinel(releaseMock);
    const requestMock = vi.fn().mockResolvedValue(sentinel);

    setNavigatorWakeLock(requestMock);
    const { unmount } = renderHook(() => useWakeLock(true));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith("screen");
    });

    expect(() => unmount()).not.toThrow();

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });
});
