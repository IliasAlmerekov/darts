import type { UserProps } from "./player";

export function buildUserProps(overrides: Partial<UserProps> = {}): UserProps {
  return {
    id: 1,
    name: "Player",
    ...overrides,
  };
}
