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

let isSoundUnlocked = false;

/**
 * Primes audio playback after a user gesture to satisfy browser autoplay policies.
 */
export function unlockSounds(): void {
  if (isSoundUnlocked) return;
  isSoundUnlocked = true;

  try {
    const audio = new Audio(SOUND_CONFIGS.throw.path);
    audio.volume = 0;

    const result = audio.play();
    result
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {});
  } catch {
    // Ignore
  }
}

/**
 * Plays a configured UI sound effect by type.
 */
export function playSound(soundType: SoundType): void {
  // Ensure we attempt to unlock in case the first sound is triggered from a user gesture.
  unlockSounds();

  const config = SOUND_CONFIGS[soundType];
  if (!config) {
    return;
  }

  const audio = new Audio(config.path);
  audio.volume = config.volume ?? 0.4;

  if (config.startTime !== undefined) {
    try {
      audio.currentTime = config.startTime;
    } catch {
      audio.addEventListener(
        "loadedmetadata",
        () => {
          try {
            audio.currentTime = config.startTime ?? 0;
          } catch {
            // Ignore
          }
        },
        { once: true },
      );
    }
  }

  audio.play().catch(() => {});
}
