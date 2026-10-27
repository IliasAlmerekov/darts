// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventSource } from "./useEventSource";

class MockEventSource {
  static CONNECTING = 0 as const;
  static OPEN = 1 as const;
  static CLOSED = 2 as const;
  static instances: MockEventSource[] = [];

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState: 0 | 1 | 2 = MockEventSource.CONNECTING;
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

  simulateError(readyState: 0 | 1 | 2 = MockEventSource.CONNECTING): void {
    this.readyState = readyState;
    this.onerror?.();
  }
}

interface StreamProps {
  url: string | null;
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
    const listeners = [{ event: "players", handler }] as const;
    renderHook(() => useEventSource("/stream", listeners));

    act(() => {
      MockEventSource.instances[0]?.emit("players", JSON.stringify({ players: [] }));
    });

    expect(MockEventSource.instances[0]?.withCredentials).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should expose an explicit connection error and reconnect after 1000ms when the stream fails", () => {
    const listeners = [{ event: "players", handler: vi.fn() }] as const;
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
    const listeners = [{ event: "players", handler: vi.fn() }] as const;
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

  it("should report a disconnected state from the first render with a new url", () => {
    const listeners = [{ event: "players", handler: vi.fn() }] as const;
    const renders: Array<{ url: string | null; result: ReturnType<typeof useEventSource> }> = [];
    const { rerender } = renderHook<ReturnType<typeof useEventSource>, StreamProps>(
      ({ url }) => {
        const result = useEventSource(url, listeners);
        renders.push({ url, result });
        return result;
      },
      { initialProps: { url: "/stream-a" } },
    );

    act(() => {
      MockEventSource.instances[0]?.simulateError();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
      MockEventSource.instances[1]?.simulateOpen();
    });
    expect(renders.at(-1)?.result).toEqual({ error: null, isConnected: true });

    rerender({ url: "/stream-b" });
    rerender({ url: null });

    const newUrlRenders = renders.filter(({ url }) => url !== "/stream-a");
    expect(newUrlRenders.length).toBeGreaterThan(0);
    for (const { result } of newUrlRenders) {
      expect(result).toEqual({ error: null, isConnected: false });
    }
    expect(MockEventSource.instances.map(({ url }) => url)).toEqual([
      "/stream-a",
      "/stream-a",
      "/stream-b",
    ]);
  });

  it("should report a disconnected state on every render after the url turns null and returns", () => {
    const listeners = [{ event: "players", handler: vi.fn() }] as const;
    const results: Array<ReturnType<typeof useEventSource>> = [];
    const { rerender } = renderHook<ReturnType<typeof useEventSource>, StreamProps>(
      ({ url }) => {
        const result = useEventSource(url, listeners);
        results.push(result);
        return result;
      },
      { initialProps: { url: "/stream" } },
    );

    act(() => {
      MockEventSource.instances[0]?.simulateOpen();
    });
    expect(results.at(-1)).toEqual({ error: null, isConnected: true });

    const rendersBeforeNull = results.length;
    rerender({ url: null });
    rerender({ url: "/stream" });

    for (const result of results.slice(rendersBeforeNull)) {
      expect(result).toEqual({ error: null, isConnected: false });
    }
  });

  it("should use the explicit credentials option and clean up listeners when unmounted", () => {
    const handler = vi.fn();
    const listeners = [{ event: "players", handler }] as const;
    const { unmount } = renderHook(() =>
      useEventSource("/secure-stream", listeners, { withCredentials: true }),
    );

    expect(MockEventSource.instances[0]?.withCredentials).toBe(true);

    unmount();

    expect(MockEventSource.instances[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("should cancel a pending reconnect when unmounted", () => {
    const listeners = [{ event: "players", handler: vi.fn() }] as const;
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

  describe("onClosed", () => {
    it("should call onClosed once and still schedule a reconnect when the error closes the source", () => {
      const onClosed = vi.fn();
      const listeners = [{ event: "players", handler: vi.fn() }] as const;
      renderHook(() => useEventSource("/stream", listeners, { onClosed }));

      act(() => {
        MockEventSource.instances[0]?.simulateError(MockEventSource.CLOSED);
      });

      expect(onClosed).toHaveBeenCalledTimes(1);
      expect(MockEventSource.instances).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(MockEventSource.instances).toHaveLength(2);
    });

    it("should not call onClosed when the error leaves the source connecting", () => {
      const onClosed = vi.fn();
      const listeners = [{ event: "players", handler: vi.fn() }] as const;
      renderHook(() => useEventSource("/stream", listeners, { onClosed }));

      act(() => {
        MockEventSource.instances[0]?.simulateError(MockEventSource.CONNECTING);
      });

      expect(onClosed).not.toHaveBeenCalled();
    });

    it("should keep the EventSource when onClosed changes identity on rerender", () => {
      const firstOnClosed = vi.fn();
      const secondOnClosed = vi.fn();
      const listeners = [{ event: "players", handler: vi.fn() }] as const;
      const { rerender } = renderHook(
        ({ onClosed }: { onClosed: () => void }) =>
          useEventSource("/stream", listeners, { onClosed }),
        { initialProps: { onClosed: firstOnClosed } },
      );

      rerender({ onClosed: secondOnClosed });

      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.instances[0]?.close).not.toHaveBeenCalled();

      act(() => {
        MockEventSource.instances[0]?.simulateError(MockEventSource.CLOSED);
      });

      expect(firstOnClosed).not.toHaveBeenCalled();
      expect(secondOnClosed).toHaveBeenCalledTimes(1);
    });

    it("should not reconnect after a closed error when the url turns null before the retry", () => {
      const listeners = [{ event: "players", handler: vi.fn() }] as const;
      const { rerender } = renderHook<ReturnType<typeof useEventSource>, StreamProps>(
        ({ url }) => useEventSource(url, listeners, { onClosed: vi.fn() }),
        { initialProps: { url: "/stream" } },
      );

      act(() => {
        MockEventSource.instances[0]?.simulateError(MockEventSource.CLOSED);
      });
      rerender({ url: null });
      act(() => {
        vi.advanceTimersByTime(30_000);
      });

      expect(MockEventSource.instances).toHaveLength(1);
    });
  });
});
