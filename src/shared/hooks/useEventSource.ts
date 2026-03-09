import { useEffect } from "react";

type EventHandler = (event: MessageEvent<string>) => void;

interface UseEventSourceOptions {
  withCredentials?: boolean;
}

/**
 * Subscribes to a server-sent events stream and cleans up on unmount.
 *
 * IMPORTANT: `handler` must be a stable reference (wrapped in `useCallback`)
 * at the call site. An unstable handler causes EventSource to be recreated
 * on every render, which leads to connection thrashing.
 */
export const useEventSource = (
  url: string | null,
  eventName: string,
  handler: EventHandler,
  options?: UseEventSourceOptions,
) => {
  useEffect(() => {
    if (!url) return;

    const source = new EventSource(url, {
      withCredentials: options?.withCredentials ?? false,
    });

    source.addEventListener(eventName, handler);

    source.onerror = () => {
      console.error("[useEventSource] EventSource error");
    };

    return () => {
      source.removeEventListener(eventName, handler);
      source.close();
    };
  }, [url, eventName, handler, options?.withCredentials]);
};
