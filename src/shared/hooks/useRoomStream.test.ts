// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { parseRoomStreamEventData, useRoomStream } from "./useRoomStream";

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  url: string;
  withCredentials: boolean;
  private listeners: Map<string, (e: MessageEvent<string>) => void> = new Map();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (e: MessageEvent<string>) => void): void {
    this.listeners.set(type, handler);
  }

  removeEventListener(type: string, handler: (e: MessageEvent<string>) => void): void {
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

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("parseRoomStreamEventData (room feature)", () => {
  it("should parse payload when JSON is valid", () => {
    const parsed = parseRoomStreamEventData('{"type":"throw","value":20}');
    expect(parsed).toEqual({ type: "throw", value: 20 });
  });

  it("should return null when JSON is invalid", () => {
    const parsed = parseRoomStreamEventData("not-json");
    expect(parsed).toBeNull();
  });
});

describe("useRoomStream — connection lifecycle", () => {
  it("should set isConnected to true when EventSource opens", () => {
    const { result } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it("should set isConnected to false when EventSource errors", () => {
    const { result } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
    });

    act(() => {
      firstInstance.simulateError();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error?.message).toBe("[useEventSource] EventSource connection failed");
  });

  it("should not create EventSource when gameId is null", () => {
    renderHook(() => useRoomStream(null));

    expect(MockEventSource.instances.length).toBe(0);
  });

  it("should create EventSource with withCredentials: true", () => {
    const { result } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    expect(firstInstance.withCredentials).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe("useRoomStream — event delivery", () => {
  it("should deliver throw event when SSE emits throw type", () => {
    const { result } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
      firstInstance.emit("throw", JSON.stringify({ score: 20 }));
    });

    expect(result.current.event?.type).toBe("throw");
  });

  it("should deliver player-joined event", () => {
    const { result } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
      firstInstance.emit("player-joined", JSON.stringify({ id: 1 }));
    });

    expect(result.current.event?.type).toBe("player-joined");
  });

  it("should log raw payload and continue when SSE payload is invalid JSON", () => {
    const warnSpy = vi.spyOn(clientLogger, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
      firstInstance.emit("throw", "not-json");
      firstInstance.emit("throw", JSON.stringify({ score: 20 }));
    });

    expect(result.current.event).toEqual({
      type: "throw",
      data: { score: 20 },
    });
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith("room_stream_invalid_payload", {
      context: { type: "throw", raw: "not-json" },
      error: expect.any(SyntaxError),
    });
  });
});

describe("useRoomStream — reconnect backoff", () => {
  it("should close EventSource and schedule reconnect after 1000ms on onerror", () => {
    renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
      firstInstance.simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(MockEventSource.instances.length).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(MockEventSource.instances.length).toBe(2);
  });

  it("should close first EventSource before creating second", () => {
    renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
      firstInstance.simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(firstInstance.close).toHaveBeenCalled();
    expect(MockEventSource.instances.length).toBe(2);
  });

  it("should double retryDelay on each consecutive error", () => {
    renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    // First error — wait 1000ms for reconnect
    act(() => {
      firstInstance.simulateOpen();
      firstInstance.simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockEventSource.instances.length).toBe(2);

    const secondInstance = MockEventSource.instances[1];

    expect(secondInstance).toBeDefined();

    if (secondInstance === undefined) {
      throw new Error("Expected second EventSource instance");
    }

    // Second error — wait 2000ms for reconnect
    act(() => {
      secondInstance.simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(1999);
    });

    expect(MockEventSource.instances.length).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(MockEventSource.instances.length).toBe(3);

    const thirdInstance = MockEventSource.instances[2];

    expect(thirdInstance).toBeDefined();

    if (thirdInstance === undefined) {
      throw new Error("Expected third EventSource instance");
    }

    // Third error — wait 4000ms for reconnect
    act(() => {
      thirdInstance.simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(3999);
    });

    expect(MockEventSource.instances.length).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(MockEventSource.instances.length).toBe(4);
  });

  it("should cap retryDelay at 30000ms after many errors", () => {
    renderHook(() => useRoomStream(1));

    // Simulate many consecutive errors to push delay past cap
    // Delays: 1000 → 2000 → 4000 → 8000 → 16000 → 32000 (capped at 30000)
    const delays = [1000, 2000, 4000, 8000, 16000];
    let instanceIndex = 0;
    const firstInstance = MockEventSource.instances[instanceIndex];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
      firstInstance.simulateError();
    });

    for (const delay of delays) {
      act(() => {
        vi.advanceTimersByTime(delay);
      });
      instanceIndex++;
      const currentInstance = MockEventSource.instances[instanceIndex];

      expect(currentInstance).toBeDefined();

      if (currentInstance === undefined) {
        throw new Error(`Expected EventSource instance at index ${instanceIndex}`);
      }

      act(() => {
        currentInstance.simulateError();
      });
    }

    // Next delay should be capped at 30000, not 32000
    act(() => {
      vi.advanceTimersByTime(29999);
    });

    expect(MockEventSource.instances.length).toBe(instanceIndex + 1);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(MockEventSource.instances.length).toBe(instanceIndex + 2);
  });

  it("should reset retryDelay to 1000ms when reconnect succeeds after errors", () => {
    const { result } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    // First error → 1000ms
    act(() => {
      firstInstance.simulateOpen();
      firstInstance.simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const secondInstance = MockEventSource.instances[1];

    expect(secondInstance).toBeDefined();

    if (secondInstance === undefined) {
      throw new Error("Expected second EventSource instance");
    }

    // Second error → 2000ms
    act(() => {
      secondInstance.simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const thirdInstance = MockEventSource.instances[2];

    expect(thirdInstance).toBeDefined();

    if (thirdInstance === undefined) {
      throw new Error("Expected third EventSource instance");
    }

    // Third connection succeeds (open) → resets delay
    act(() => {
      thirdInstance.simulateOpen();
    });

    expect(result.current.error).toBeNull();

    // Fourth error → should be 1000ms again (reset after success)
    act(() => {
      thirdInstance.simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(MockEventSource.instances.length).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(MockEventSource.instances.length).toBe(4);
  });

  it("should expose explicit error until reconnect opens successfully", () => {
    const { result } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateError();
    });

    expect(result.current.error?.message).toBe("[useEventSource] EventSource connection failed");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const secondInstance = MockEventSource.instances[1];

    expect(secondInstance).toBeDefined();

    if (secondInstance === undefined) {
      throw new Error("Expected second EventSource instance");
    }

    act(() => {
      secondInstance.simulateOpen();
    });

    expect(result.current.error).toBeNull();
  });
});

describe("useRoomStream — cleanup", () => {
  it("should close EventSource on unmount", () => {
    const { unmount } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
    });

    unmount();

    expect(firstInstance.close).toHaveBeenCalled();
  });

  it("should cancel pending retry timer on unmount", () => {
    const { unmount } = renderHook(() => useRoomStream(1));
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
      firstInstance.simulateError();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(MockEventSource.instances.length).toBe(1);
  });

  it("should cancel pending retry and open new connection when gameId changes", () => {
    const { rerender } = renderHook(({ gameId }: { gameId: number }) => useRoomStream(gameId), {
      initialProps: { gameId: 1 },
    });
    const firstInstance = MockEventSource.instances[0];

    expect(firstInstance).toBeDefined();

    if (firstInstance === undefined) {
      throw new Error("Expected first EventSource instance");
    }

    act(() => {
      firstInstance.simulateOpen();
      firstInstance.simulateError();
    });

    // Before timer fires, change gameId → old timer should be cancelled
    rerender({ gameId: 2 });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should have: instance[0] (gameId=1, errored) and instance[1] (gameId=2, new connection)
    // The retry from instance[0]'s error should NOT have fired
    const urls = MockEventSource.instances.map((s) => s.url);
    const hasOldReconnect = urls.filter((u) => u.includes("/room/1/stream")).length > 1;
    const latestInstance = MockEventSource.instances[MockEventSource.instances.length - 1];

    expect(latestInstance).toBeDefined();

    if (latestInstance === undefined) {
      throw new Error("Expected latest EventSource instance");
    }

    expect(hasOldReconnect).toBe(false);
    expect(latestInstance.url).toContain("/room/2/stream");
  });

  it("should create new EventSource with updated gameId URL on rerender", () => {
    const { rerender } = renderHook(({ gameId }: { gameId: number }) => useRoomStream(gameId), {
      initialProps: { gameId: 1 },
    });

    rerender({ gameId: 2 });

    const secondInstance = MockEventSource.instances[1];

    expect(secondInstance).toBeDefined();

    if (secondInstance === undefined) {
      throw new Error("Expected second EventSource instance");
    }

    expect(secondInstance.url).toContain("/room/2/stream");
  });
});
