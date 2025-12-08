export type SoundType = "throw" | "undo" | "error" | "win";

interface SoundConfig {
  path: string;
  volume?: number;
  startTime?: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  throw: {
    path: "/sounds/throw-sound.mp3",
    volume: 0.4,
    startTime: 2.3,
  },
  undo: {
    path: "/sounds/undo-sound.mp3",
    volume: 0.1,
    startTime: 0.2,
  },
  error: {
    path: "/sounds/error-sound.mp3",
    volume: 0.4,
  },
  win: {
    path: "/sounds/win-sound.mp3",
    volume: 0.4,
  },
};

export function playSound(soundType: SoundType): void {
  const config = SOUND_CONFIGS[soundType];
  if (!config) {
    return;
  }

  const audio = new Audio(config.path);
  audio.volume = config.volume ?? 0.4;

  if (config.startTime !== undefined) {
    audio.currentTime = config.startTime;
  }

  audio.play().catch(() => {});
}
