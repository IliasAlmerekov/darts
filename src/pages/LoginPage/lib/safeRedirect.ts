const isInternalPath = (path: string): boolean => path.startsWith("/") && !path.startsWith("//");

/**
 * Keeps login redirects inside the SPA and only accepts internal paths or same-origin URLs.
 */
export function resolveSafeLoginRedirect(
  redirect: string | null | undefined,
  fallbackPath: string,
): string {
  if (!redirect) {
    return fallbackPath;
  }

  if (isInternalPath(redirect)) {
    return redirect;
  }

  if (/^https?:\/\//i.test(redirect)) {
    try {
      const normalizedUrl = new URL(redirect, window.location.origin);
      const normalizedPath = `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;

      if (
        normalizedUrl.origin === window.location.origin &&
        isInternalPath(normalizedUrl.pathname)
      ) {
        return normalizedPath;
      }
    } catch {
      return fallbackPath;
    }
  }

  return fallbackPath;
}
