import { useEffect, useState } from "react";

type EventHandler = (event: MessageEvent<string>) => void;

const DEFAULT_INITIAL_RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000;
const EVENT_SOURCE_CONNECTION_ERROR_MESSAGE = "[useEventSource] EventSource connection failed";

export interface EventSourceListener {
  event: string;
  handler: EventHandler;
}

export interface UseEventSourceOptions {
  initialRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  withCredentials?: boolean;
}

export interface UseEventSourceResult {
  error: Error | null;
  isConnected: boolean;
}

/**
 * Subscribes to a server-sent events stream, reconnects with exponential backoff,
 * and cleans up on unmount.
 *
 * IMPORTANT: `listeners` must be a stable reference (wrapped in `useMemo`)
 * at the call site. Unstable listeners cause EventSource to be recreated
 * on every render, which leads to connection thrashing.
 */
export const useEventSource = (
  url: string | null,
  listeners: readonly EventSourceListener[],
  options?: UseEventSourceOptions,
): UseEventSourceResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsConnected(false);
    setError(null);

    if (!url) {
      return;
    }

    const initialRetryDelayMs = options?.initialRetryDelayMs ?? DEFAULT_INITIAL_RETRY_DELAY_MS;
    const maxRetryDelayMs = options?.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
    let retryDelayMs = initialRetryDelayMs;
    let retryTimerId: ReturnType<typeof setTimeout> | null = null;
    let cleanupSource: (() => void) | null = null;
    let isDisposed = false;

    const clearRetryTimer = (): void => {
      if (retryTimerId !== null) {
        clearTimeout(retryTimerId);
        retryTimerId = null;
      }
    };

    const connect = (): void => {
      if (isDisposed) {
        return;
      }

      const source = new EventSource(url, {
        withCredentials: options?.withCredentials ?? false,
      });

      source.onopen = () => {
        if (isDisposed) {
          source.close();
          return;
        }

        setIsConnected(true);
        setError(null);
        retryDelayMs = initialRetryDelayMs;
      };

      for (const { event, handler } of listeners) {
        source.addEventListener(event, handler);
      }

      const dispose = (): void => {
        for (const { event, handler } of listeners) {
          source.removeEventListener(event, handler);
        }

        source.onopen = null;
        source.onerror = null;
        source.close();
      };

      cleanupSource = dispose;

      source.onerror = () => {
        if (isDisposed) {
          return;
        }

        setIsConnected(false);
        setError(new Error(EVENT_SOURCE_CONNECTION_ERROR_MESSAGE));
        dispose();
        clearRetryTimer();

        retryTimerId = setTimeout(() => {
          retryDelayMs = Math.min(retryDelayMs * 2, maxRetryDelayMs);
          connect();
        }, retryDelayMs);
      };
    };

    connect();

    return () => {
      isDisposed = true;
      clearRetryTimer();
      cleanupSource?.();
    };
  }, [
    listeners,
    options?.initialRetryDelayMs,
    options?.maxRetryDelayMs,
    options?.withCredentials,
    url,
  ]);

  return { error, isConnected };
};
