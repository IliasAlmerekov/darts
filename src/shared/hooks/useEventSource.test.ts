// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventSource } from "./useEventSource";

class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  url: string;
  withCredentials: boolean;
  private listeners: Map<string, (event: MessageEvent<string>) => void> = new Map();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, handler);
  }

  removeEventListener(type: string, handler: (event: MessageEvent<string>) => void): void {
    if (this.listeners.get(type) === handler) {
      this.listeners.delete(type);
    }
  }

  emit(type: string, data: string): void {
    const handler = this.listeners.get(type);
    handler?.(new MessageEvent(type, { data }));
  }

  simulateOpen(): void {
    this.onopen?.();
  }

  simulateError(): void {
    this.onerror?.();
  }
}

describe("useEventSource", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.clearAllMocks();
    vi.stubGlobal("EventSource", MockEventSource);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("should not create EventSource when url is null", () => {
    const listeners = [{ event: "message", handler: vi.fn() }] as const;
    const { result } = renderHook(() => useEventSource(null, listeners));

    expect(MockEventSource.instances).toHaveLength(0);
    expect(result.current).toEqual({ error: null, isConnected: false });
  });

  it("should subscribe with default credentials and forward matching events when initialized", () => {
    const handler = vi.fn();
    const listeners = [{ event: "throw", handler }] as const;
    renderHook(() => useEventSource("/stream", listeners));

    act(() => {
      MockEventSource.instances[0]?.emit("throw", JSON.stringify({ score: 20 }));
    });

    expect(MockEventSource.instances[0]?.withCredentials).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should expose an explicit connection error and reconnect after 1000ms when the stream fails", () => {
    const listeners = [{ event: "throw", handler: vi.fn() }] as const;
    const { result } = renderHook(() =>
      useEventSource("/stream", listeners, { withCredentials: true }),
    );

    act(() => {
      MockEventSource.instances[0]?.simulateOpen();
    });

    expect(result.current).toEqual({ error: null, isConnected: true });

    act(() => {
      MockEventSource.instances[0]?.simulateError();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error?.message).toBe("[useEventSource] EventSource connection failed");
    expect(MockEventSource.instances[0]?.close).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it("should reset the explicit error when reconnect succeeds", () => {
    const listeners = [{ event: "throw", handler: vi.fn() }] as const;
    const { result } = renderHook(() => useEventSource("/stream", listeners));

    act(() => {
      MockEventSource.instances[0]?.simulateError();
    });

    expect(result.current.error?.message).toBe("[useEventSource] EventSource connection failed");

    act(() => {
      vi.advanceTimersByTime(1000);
      MockEventSource.instances[1]?.simulateOpen();
    });

    expect(result.current).toEqual({ error: null, isConnected: true });
  });

  it("should use the explicit credentials option and clean up listeners when unmounted", () => {
    const handler = vi.fn();
    const listeners = [{ event: "player-joined", handler }] as const;
    const { unmount } = renderHook(() =>
      useEventSource("/secure-stream", listeners, { withCredentials: true }),
    );

    expect(MockEventSource.instances[0]?.withCredentials).toBe(true);

    unmount();

    expect(MockEventSource.instances[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("should cancel a pending reconnect when unmounted", () => {
    const listeners = [{ event: "throw", handler: vi.fn() }] as const;
    const { unmount } = renderHook(() => useEventSource("/stream", listeners));

    act(() => {
      MockEventSource.instances[0]?.simulateError();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(MockEventSource.instances).toHaveLength(1);
  });
});
