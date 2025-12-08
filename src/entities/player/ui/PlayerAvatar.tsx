interface PlayerAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

export function PlayerAvatar({ name, size = "md" }: PlayerAvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <div className={`player-avatar player-avatar--${size}`}>{initials || "?"}</div>;
}
