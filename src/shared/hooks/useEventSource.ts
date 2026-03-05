import { useEffect } from "react";

type EventHandler = (event: MessageEvent<string>) => void;

interface UseEventSourceOptions {
  withCredentials?: boolean;
}

/**
 * Subscribes to a server-sent events stream and cleans up on unmount.
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
