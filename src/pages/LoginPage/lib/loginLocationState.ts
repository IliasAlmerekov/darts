/** Location state the protected routes pass to the login page. */
interface LoginLocationState {
  from?: string;
}

export function isLoginLocationState(s: unknown): s is LoginLocationState {
  if (typeof s !== "object" || s === null) {
    return false;
  }
  if ("from" in s) {
    const record = s as Record<string, unknown>;
    return typeof record["from"] === "string";
  }
  return true;
}
