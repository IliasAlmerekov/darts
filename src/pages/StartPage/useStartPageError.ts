import { useCallback, useState } from "react";

export type SetStartPageError = (message: string | null) => void;

export interface UseStartPageErrorResult {
  pageError: string | null;
  setPageError: SetStartPageError;
  clearPageError: () => void;
}

/**
 * Manages page-level error state shared across StartPage flows.
 */
export function useStartPageError(): UseStartPageErrorResult {
  const [pageError, setPageErrorState] = useState<string | null>(null);

  const setPageError = useCallback<SetStartPageError>((message) => {
    setPageErrorState(message);
  }, []);

  const clearPageError = useCallback((): void => {
    setPageErrorState(null);
  }, []);

  return {
    pageError,
    setPageError,
    clearPageError,
  };
}
