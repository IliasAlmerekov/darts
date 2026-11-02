import { clientLogger } from "./clientLogger";

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
const HAVE_METADATA_READY_STATE = 1;

/** Device setting: a tablet keeps its own choice, so it lives in localStorage, not the game. */
const SOUND_ENABLED_STORAGE_KEY = "darts.soundEnabled";

function isStorageSecurityError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "SecurityError";
}

function parseSoundEnabled(stored: string | null): boolean {
  return stored !== "false";
}

function readSoundEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return parseSoundEnabled(window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY));
  } catch (error) {
    // Safari with storage blocked throws SecurityError; sound then stays on, as before.
    if (!isStorageSecurityError(error)) {
      clientLogger.error("sound-player.setting.read-failed", { error });
    }
    return true;
  }
}

let soundEnabled = readSoundEnabled();

// A game open in another tab of the same tablet follows the choice made on Settings.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SOUND_ENABLED_STORAGE_KEY) {
      soundEnabled = parseSoundEnabled(event.newValue);
    }
  });
}

/** Whether `playSound` plays anything on this device. On unless the user turned it off. */
export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/** Turns game sounds on or off on this device and remembers the choice. */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(enabled));
  } catch (error) {
    // The choice still holds until the page reloads.
    if (!isStorageSecurityError(error)) {
      clientLogger.error("sound-player.setting.write-failed", { error });
    }
  }
}

function logSoundWarning(
  event: string,
  soundType: SoundType,
  config: SoundConfig,
  error: unknown,
): void {
  clientLogger.warn(event, {
    context: {
      soundType,
      path: config.path,
      startTime: config.startTime,
    },
    error,
  });
}

function applyConfiguredStartTime(
  audio: HTMLAudioElement,
  soundType: SoundType,
  config: SoundConfig,
): void {
  const startTime = config.startTime;
  if (startTime === undefined) {
    return;
  }

  try {
    audio.currentTime = startTime;
  } catch (error) {
    logSoundWarning("sound-player.start-time.apply-failed", soundType, config, error);
  }
}

function configureAudioStartTime(
  audio: HTMLAudioElement,
  soundType: SoundType,
  config: SoundConfig,
): void {
  if (config.startTime === undefined) {
    return;
  }

  if (audio.readyState >= HAVE_METADATA_READY_STATE) {
    applyConfiguredStartTime(audio, soundType, config);
    return;
  }

  audio.addEventListener(
    "loadedmetadata",
    () => {
      applyConfiguredStartTime(audio, soundType, config);
    },
    { once: true },
  );
}

/**
 * Primes audio playback after a user gesture to satisfy browser autoplay policies.
 */
export function unlockSounds(): void {
  if (isSoundUnlocked || !soundEnabled) return;
  isSoundUnlocked = true;

  const config = SOUND_CONFIGS.throw;

  try {
    const audio = new Audio(config.path);
    audio.volume = 0;

    const result = audio.play();
    result
      .then(() => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          logSoundWarning("sound-player.unlock.rewind-failed", "throw", config, error);
        }
      })
      .catch((error: unknown) => {
        logSoundWarning("sound-player.unlock.playback-failed", "throw", config, error);
      });
  } catch (error) {
    logSoundWarning("sound-player.unlock.initialization-failed", "throw", config, error);
  }
}

/**
 * Plays a configured UI sound effect by type.
 */
export function playSound(soundType: SoundType): void {
  if (!soundEnabled) {
    return;
  }

  // Ensure we attempt to unlock in case the first sound is triggered from a user gesture.
  unlockSounds();

  const config = SOUND_CONFIGS[soundType];
  if (!config) {
    return;
  }

  try {
    const audio = new Audio(config.path);
    audio.volume = config.volume ?? 0.4;

    configureAudioStartTime(audio, soundType, config);

    audio.play().catch((error: unknown) => {
      logSoundWarning("sound-player.playback-failed", soundType, config, error);
    });
  } catch (error) {
    logSoundWarning("sound-player.initialization-failed", soundType, config, error);
  }
}
