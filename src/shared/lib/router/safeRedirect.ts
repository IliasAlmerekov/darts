// URL parsing drops tab, CR and LF, so "/\t/evil.example" becomes "//evil.example".
const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });

// Browsers read a backslash as a slash, so "/\evil.example" would leave the origin.
const isInternalPath = (path: string): boolean =>
  path.startsWith("/") &&
  !path.startsWith("//") &&
  !path.includes("\\") &&
  !hasControlCharacter(path);

/**
 * Returns the redirect as an in-app path, or null when it may leave the SPA.
 * Accepts internal paths and same-origin URLs.
 */
export function toSafeRedirectPath(redirect: string | null | undefined): string | null {
  if (!redirect) {
    return null;
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
      return null;
    }
  }

  return null;
}

/**
 * Keeps redirects inside the SPA and falls back when the redirect is unsafe or missing.
 */
export function resolveSafeRedirect(
  redirect: string | null | undefined,
  fallbackPath: string,
): string {
  return toSafeRedirectPath(redirect) ?? fallbackPath;
}
