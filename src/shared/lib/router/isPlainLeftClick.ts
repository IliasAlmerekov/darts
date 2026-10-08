import type { MouseEvent } from "react";

/**
 * True for an unmodified primary-button click. Anything else (Ctrl/Cmd/Shift/Alt or another
 * button) should be left to the browser so links can open in a new tab or window.
 */
export function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
