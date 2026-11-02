import { clientLogger } from "./clientLogger";

export type SoundType = "start" | "throw" | "undo" | "error" | "win";

interface SoundConfig {
  path: string;
  volume?: number;
  startTime?: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  start: {
    path: "/sounds/start-round-sound.mp3",
    volume: 0.4,
  },
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
const soundEnabledListeners = new Set<() => void>();

function updateSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  soundEnabledListeners.forEach((listener) => listener());
}

// A game open in another tab of the same tablet follows the choice made on Settings.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SOUND_ENABLED_STORAGE_KEY) {
      updateSoundEnabled(parseSoundEnabled(event.newValue));
    }
  });
}

/** Calls `listener` after every sound on/off change; returns the unsubscribe function. */
export function subscribeSoundEnabled(listener: () => void): () => void {
  soundEnabledListeners.add(listener);
  return () => {
    soundEnabledListeners.delete(listener);
  };
}

/** Whether `playSound` plays anything on this device. On unless the user turned it off. */
export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/** Turns game sounds on or off on this device and remembers the choice. */
export function setSoundEnabled(enabled: boolean): void {
  updateSoundEnabled(enabled);
  try {
    window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(enabled));
  } catch (error) {
    // The choice still holds until the page reloads.
    if (!isStorageSecurityError(error)) {
      clientLogger.error("sound-player.setting.write-failed", { error });
    }
  }
}

/**
 * Audio elements kept per sound. WebKit on iPad slows down with every element it keeps, so a
 * new `Audio` per throw made taps late by the middle of a game (#432). Three per sound let
 * the throws of one turn overlap; the fourth play restarts the oldest from its start.
 */
const AUDIO_POOL_SIZE = 3;

interface AudioPool {
  elements: HTMLAudioElement[];
  plays: number;
}

const audioPools = new Map<SoundType, AudioPool>();

/** Pooled elements with a start time waiting for `loadedmetadata`. */
const audiosAwaitingMetadata = new WeakSet<HTMLAudioElement>();

function takePooledAudio(soundType: SoundType, config: SoundConfig): HTMLAudioElement {
  let pool = audioPools.get(soundType);
  if (pool === undefined) {
    pool = { elements: [], plays: 0 };
    audioPools.set(soundType, pool);
  }

  const index = pool.plays % AUDIO_POOL_SIZE;
  pool.plays += 1;

  const pooled = pool.elements[index];
  if (pooled !== undefined) {
    // A file that failed to load, say while the tablet was offline, leaves the element
    // rejecting every play() until load() fetches the file again.
    if (pooled.error !== null) {
      pooled.load();
    }
    return pooled;
  }

  const audio = new Audio(config.path);
  pool.elements[index] = audio;
  return audio;
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

function applyStartTime(
  audio: HTMLAudioElement,
  startTime: number,
  soundType: SoundType,
  config: SoundConfig,
): void {
  try {
    audio.currentTime = startTime;
  } catch (error) {
    logSoundWarning("sound-player.start-time.apply-failed", soundType, config, error);
  }
}

/**
 * Moves the audio to the configured start, or to 0. A pooled element may still be playing
 * from its last use, and `play()` alone would leave it running instead of starting over.
 */
function configureAudioStartTime(
  audio: HTMLAudioElement,
  soundType: SoundType,
  config: SoundConfig,
): void {
  const startTime = config.startTime ?? 0;

  if (audio.readyState >= HAVE_METADATA_READY_STATE) {
    applyStartTime(audio, startTime, soundType, config);
    return;
  }

  // Not loaded yet, so it has never played: without a configured start it begins at 0.
  if (config.startTime === undefined) {
    return;
  }

  // A file that never loads would otherwise collect one listener per replay.
  if (audiosAwaitingMetadata.has(audio)) {
    return;
  }

  audiosAwaitingMetadata.add(audio);
  audio.addEventListener(
    "loadedmetadata",
    () => {
      audiosAwaitingMetadata.delete(audio);
      applyStartTime(audio, startTime, soundType, config);
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
    const audio = takePooledAudio(soundType, config);
    audio.volume = config.volume ?? 0.4;

    configureAudioStartTime(audio, soundType, config);

    audio.play().catch((error: unknown) => {
      logSoundWarning("sound-player.playback-failed", soundType, config, error);
    });
  } catch (error) {
    logSoundWarning("sound-player.initialization-failed", soundType, config, error);
  }
}
