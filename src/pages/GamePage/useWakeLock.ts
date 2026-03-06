import { useEffect, useRef } from "react";

export function useWakeLock(isEnabled: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let isDisposed = false;

    const releaseSentinel = async (): Promise<void> => {
      const sentinel = sentinelRef.current;
      if (!sentinel) {
        return;
      }

      sentinelRef.current = null;

      try {
        await sentinel.release();
      } catch {
        // Wake lock release failure is intentionally non-blocking for UX.
      }
    };

    if (!isEnabled) {
      void releaseSentinel();
      return;
    }

    if (!("wakeLock" in navigator)) {
      return;
    }

    const acquireWakeLock = async (): Promise<void> => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");

        if (isDisposed) {
          try {
            await sentinel.release();
          } catch {
            // Wake lock release failure is intentionally non-blocking for UX.
          }
          return;
        }

        sentinelRef.current = sentinel;
      } catch {
        // Unsupported/rejected wake-lock requests are intentionally ignored.
      }
    };

    void acquireWakeLock();

    return () => {
      isDisposed = true;
      void releaseSentinel();
    };
  }, [isEnabled]);
}
