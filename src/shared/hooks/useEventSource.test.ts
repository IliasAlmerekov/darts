// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEventSource } from "./useEventSource";

class MockEventSource {
  static instances: MockEventSource[] = [];

  onerror: (() => void) | null = null;
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  url: string;
  withCredentials: boolean;

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }
}

describe("useEventSource", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.clearAllMocks();
    vi.stubGlobal("EventSource", MockEventSource);
  });

  it("does not create EventSource when url is null", () => {
    renderHook(() => useEventSource(null, "message", vi.fn()));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("subscribes with default credentials and logs source errors", () => {
    const handler = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderHook(() => useEventSource("/stream", "throw", handler));
    MockEventSource.instances[0]?.onerror?.();

    expect(MockEventSource.instances[0]?.withCredentials).toBe(false);
    expect(MockEventSource.instances[0]?.addEventListener).toHaveBeenCalledWith("throw", handler);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[useEventSource] EventSource error");

    consoleErrorSpy.mockRestore();
  });

  it("uses explicit credentials option and cleans up listeners on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useEventSource("/secure-stream", "player-joined", handler, { withCredentials: true }),
    );

    expect(MockEventSource.instances[0]?.withCredentials).toBe(true);

    unmount();

    expect(MockEventSource.instances[0]?.removeEventListener).toHaveBeenCalledWith(
      "player-joined",
      handler,
    );
    expect(MockEventSource.instances[0]?.close).toHaveBeenCalledTimes(1);
  });
});
