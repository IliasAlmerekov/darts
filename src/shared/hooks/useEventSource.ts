import { useEffect, useRef, useState } from "react";

type EventHandler = (event: MessageEvent<string>) => void;

const DEFAULT_INITIAL_RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000;
const EVENT_SOURCE_CONNECTION_ERROR_MESSAGE = "[useEventSource] EventSource connection failed";

export interface EventSourceListener {
  event: string;
  handler: EventHandler;
}

interface UseEventSourceOptions {
  initialRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  withCredentials?: boolean;
  onClosed?: (() => void) | undefined;
}

interface UseEventSourceResult {
  error: Error | null;
  isConnected: boolean;
}

interface ConnectionState extends UseEventSourceResult {
  url: string | null;
}

const DISCONNECTED: ConnectionState = { error: null, isConnected: false, url: null };

/**
 * Subscribes to a server-sent events stream, reconnects with exponential backoff,
 * and cleans up on unmount.
 *
 * IMPORTANT: `listeners` must be a stable reference (wrapped in `useMemo`)
 * at the call site. Unstable listeners cause EventSource to be recreated
 * on every render, which leads to connection thrashing.
 *
 * `onClosed` runs when an `error` leaves the source in `EventSource.CLOSED`, for example
 * after the server answers 204 or 5xx. It only reports: the backoff reconnect runs either way.
 * It is read through a ref, so a new function identity does not recreate the EventSource.
 */
export const useEventSource = (
  url: string | null,
  listeners: readonly EventSourceListener[],
  options?: UseEventSourceOptions,
): UseEventSourceResult => {
  const [connection, setConnection] = useState<ConnectionState>(DISCONNECTED);
  const onClosedRef = useRef(options?.onClosed);

  useEffect(() => {
    onClosedRef.current = options?.onClosed;
  });

  useEffect(() => {
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

        setConnection({ error: null, isConnected: true, url });
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

        // Read before dispose(): close() sets the state to CLOSED for every error.
        const isClosed = source.readyState === EventSource.CLOSED;

        setConnection({
          error: new Error(EVENT_SOURCE_CONNECTION_ERROR_MESSAGE),
          isConnected: false,
          url,
        });
        dispose();
        clearRetryTimer();

        retryTimerId = setTimeout(() => {
          retryDelayMs = Math.min(retryDelayMs * 2, maxRetryDelayMs);
          connect();
        }, retryDelayMs);

        if (isClosed) {
          onClosedRef.current?.();
        }
      };
    };

    connect();

    return () => {
      isDisposed = true;
      clearRetryTimer();
      cleanupSource?.();
      setConnection(DISCONNECTED);
    };
  }, [
    listeners,
    options?.initialRetryDelayMs,
    options?.maxRetryDelayMs,
    options?.withCredentials,
    url,
  ]);

  // Until the effect for a new url runs, the state still describes the previous connection.
  return connection.url === url
    ? { error: connection.error, isConnected: connection.isConnected }
    : { error: null, isConnected: false };
};
