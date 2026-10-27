export const POINTS_OPTIONS = [
  { label: "101", id: 101 },
  { label: "201", id: 201 },
  { label: "301", id: 301 },
  { label: "401", id: 401 },
  { label: "501", id: 501 },
] as const;

type StartScore = (typeof POINTS_OPTIONS)[number]["id"];

export function isStartScore(id: string | number): id is StartScore {
  return POINTS_OPTIONS.some((option) => option.id === id);
}
