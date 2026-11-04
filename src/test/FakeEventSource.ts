import { vi } from "vitest";

export class FakeEventSource {
  static CONNECTING = 0 as const;
  static OPEN = 1 as const;
  static CLOSED = 2 as const;
  static instances: FakeEventSource[] = [];
  static last: FakeEventSource | null = null;
  static urls: string[] = [];

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState: 0 | 1 | 2 = FakeEventSource.CONNECTING;
  readonly url: string;
  readonly withCredentials: boolean;
  private listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();
  close = vi.fn(() => {
    this.readyState = FakeEventSource.CLOSED;
  });

  constructor(url: string | URL, options?: EventSourceInit) {
    this.url = String(url);
    this.withCredentials = options?.withCredentials ?? false;
    FakeEventSource.instances.push(this);
    FakeEventSource.last = this;
    FakeEventSource.urls.push(this.url);
  }

  addEventListener(type: string, handler: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }

  removeEventListener(type: string, handler: (event: MessageEvent<string>) => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== handler),
    );
  }

  dispatch(type: string, data: string): void {
    for (const handler of this.listeners.get(type) ?? []) handler(new MessageEvent(type, { data }));
  }

  emit(type: string, data: string): void {
    this.dispatch(type, data);
  }
  simulateOpen(): void {
    this.onopen?.();
  }
  simulateError(state: 0 | 1 | 2 = FakeEventSource.CONNECTING): void {
    this.readyState = state;
    this.onerror?.();
  }
  fail(state: 0 | 1 | 2): void {
    this.simulateError(state);
  }
}
