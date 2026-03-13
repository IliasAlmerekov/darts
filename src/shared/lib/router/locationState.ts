export function parseLocationState<T>(state: unknown, validate: (s: unknown) => s is T): T | null {
  return validate(state) ? state : null;
}
