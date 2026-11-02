// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientLogger } from "./clientLogger";

vi.mock("./clientLogger", () => ({
  clientLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

type AudioInstance = {
  src: string;
  volume: number;
  currentTime: number;
  readyState: number;
  error: { code: number } | null;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

type AudioConstructor = new (src?: string) => AudioInstance;

const audioInstances: AudioInstance[] = [];

function createAudioMock(options?: {
  playImplementation?: () => Promise<void>;
  currentTimeSetter?: (value: number) => void;
  readyState?: number;
}): AudioConstructor {
  return class MockAudio implements AudioInstance {
    src: string;
    volume: number;
    declare currentTime: number;
    readyState: number;
    error: { code: number } | null = null;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;

    constructor(src = "") {
      this.src = src;
      this.volume = 1;
      this.readyState = options?.readyState ?? 0;

      let internalCurrentTime = 0;
      Object.defineProperty(this, "currentTime", {
        configurable: true,
        enumerable: true,
        get: () => internalCurrentTime,
        set: (value: number) => {
          options?.currentTimeSetter?.(value);
          internalCurrentTime = value;
        },
      });

      // Like a browser: an element whose file failed to load rejects every play until load().
      this.play = vi.fn(() =>
        this.error !== null
          ? Promise.reject(new DOMException("failed to load", "NotSupportedError"))
          : (options?.playImplementation ?? (() => Promise.resolve()))(),
      );
      this.pause = vi.fn();
      this.load = vi.fn(() => {
        this.error = null;
        this.readyState = 0;
      });
      this.addEventListener = vi.fn();

      audioInstances.push(this);
    }
  };
}

async function loadSoundPlayerModule() {
  vi.resetModules();
  return import("./soundPlayer");
}

describe("soundPlayer", () => {
  beforeEach(() => {
    audioInstances.length = 0;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.mocked(clientLogger.warn).mockReset();
    vi.mocked(clientLogger.error).mockReset();
    vi.unstubAllGlobals();
  });

  it("unlocks sounds only once and rewinds the priming audio", async () => {
    vi.stubGlobal("Audio", createAudioMock());
    const { unlockSounds } = await loadSoundPlayerModule();

    unlockSounds();
    await Promise.resolve();
    unlockSounds();

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.src).toBe("/sounds/throw-sound.mp3");
    expect(audioInstances[0]?.volume).toBe(0);
    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);
    expect(audioInstances[0]?.currentTime).toBe(0);
  });

  it("plays configured throw audio after metadata loads", async () => {
    vi.stubGlobal("Audio", createAudioMock());
    const { playSound } = await loadSoundPlayerModule();

    playSound("throw");
    await Promise.resolve();

    expect(audioInstances).toHaveLength(2);
    expect(audioInstances[1]?.src).toBe("/sounds/throw-sound.mp3");
    expect(audioInstances[1]?.volume).toBe(0.4);
    expect(audioInstances[1]?.currentTime).toBe(0);
    expect(audioInstances[1]?.addEventListener).toHaveBeenCalledTimes(1);
    const addEventListenerCall = audioInstances[1]?.addEventListener.mock.calls[0];
    expect(addEventListenerCall?.[0]).toBe("loadedmetadata");

    const listener = addEventListenerCall?.[1] as (() => void) | undefined;
    listener?.();

    expect(audioInstances[1]?.currentTime).toBe(2.3);
    expect(audioInstances[1]?.play).toHaveBeenCalledTimes(1);
  });

  it("applies start time immediately when metadata is already available", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { playSound } = await loadSoundPlayerModule();

    playSound("throw");

    expect(audioInstances[1]?.addEventListener).not.toHaveBeenCalled();
    expect(audioInstances[1]?.currentTime).toBe(2.3);
  });

  it("logs playback rejections instead of swallowing them silently", async () => {
    vi.stubGlobal(
      "Audio",
      createAudioMock({
        playImplementation: () => Promise.reject(new Error("blocked")),
      }),
    );
    const { playSound } = await loadSoundPlayerModule();

    expect(() => playSound("error")).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(clientLogger.warn).toHaveBeenCalledWith("sound-player.unlock.playback-failed", {
      context: {
        soundType: "throw",
        path: "/sounds/throw-sound.mp3",
        startTime: 2.3,
      },
      error: expect.any(Error),
    });
    expect(clientLogger.warn).toHaveBeenCalledWith("sound-player.playback-failed", {
      context: {
        soundType: "error",
        path: "/sounds/error-sound.mp3",
        startTime: undefined,
      },
      error: expect.any(Error),
    });
  });

  it("logs currentTime assignment failures after metadata loads", async () => {
    vi.stubGlobal(
      "Audio",
      createAudioMock({
        currentTimeSetter: (value) => {
          if (value === 0.2) {
            throw new Error("seek failed");
          }
        },
      }),
    );
    const { playSound } = await loadSoundPlayerModule();

    playSound("undo");

    const addEventListenerCall = audioInstances[1]?.addEventListener.mock.calls[0];
    const listener = addEventListenerCall?.[1] as (() => void) | undefined;
    listener?.();

    expect(clientLogger.warn).toHaveBeenCalledWith("sound-player.start-time.apply-failed", {
      context: {
        soundType: "undo",
        path: "/sounds/undo-sound.mp3",
        startTime: 0.2,
      },
      error: expect.any(Error),
    });
  });

  it("plays sounds by default", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { isSoundEnabled, playSound } = await loadSoundPlayerModule();

    playSound("throw");

    expect(isSoundEnabled()).toBe(true);
    expect(audioInstances.at(-1)?.play).toHaveBeenCalledTimes(1);
  });

  it("plays nothing once sound is turned off, and keeps that after a reload", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const first = await loadSoundPlayerModule();
    first.setSoundEnabled(false);

    const reloaded = await loadSoundPlayerModule();
    reloaded.playSound("throw");
    reloaded.playSound("win");

    expect(reloaded.isSoundEnabled()).toBe(false);
    expect(audioInstances).toHaveLength(0);
  });

  it("plays again after sound is turned back on", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { playSound, setSoundEnabled } = await loadSoundPlayerModule();
    setSoundEnabled(false);
    setSoundEnabled(true);

    playSound("undo");

    expect(audioInstances.at(-1)?.src).toBe("/sounds/undo-sound.mp3");
    expect(audioInstances.at(-1)?.play).toHaveBeenCalledTimes(1);
  });

  it("keeps sound on when the device storage cannot be read", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    const { isSoundEnabled } = await loadSoundPlayerModule();

    expect(isSoundEnabled()).toBe(true);
    getItem.mockRestore();
  });

  it("does not prime audio while sound is off, and primes it once sound is back on", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { setSoundEnabled, unlockSounds } = await loadSoundPlayerModule();
    setSoundEnabled(false);

    unlockSounds();
    expect(audioInstances).toHaveLength(0);

    setSoundEnabled(true);
    unlockSounds();
    expect(audioInstances).toHaveLength(1);
  });

  it("logs an unexpected storage read failure and keeps sound on", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage broken");
    });
    const { isSoundEnabled } = await loadSoundPlayerModule();
    getItem.mockRestore();

    expect(isSoundEnabled()).toBe(true);
    expect(clientLogger.error).toHaveBeenCalledWith("sound-player.setting.read-failed", {
      error: expect.any(Error),
    });
  });

  it("keeps sound off until a reload and logs when the choice cannot be saved", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { isSoundEnabled, setSoundEnabled } = await loadSoundPlayerModule();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    setSoundEnabled(false);
    setItem.mockRestore();

    expect(isSoundEnabled()).toBe(false);
    expect(clientLogger.error).toHaveBeenCalledWith("sound-player.setting.write-failed", {
      error: expect.any(Error),
    });
  });

  it("tells subscribers when sound is turned on or off, here or in another tab", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { isSoundEnabled, setSoundEnabled, subscribeSoundEnabled } =
      await loadSoundPlayerModule();
    const seen: boolean[] = [];
    const unsubscribe = subscribeSoundEnabled(() => seen.push(isSoundEnabled()));

    setSoundEnabled(false);
    window.dispatchEvent(
      new StorageEvent("storage", { key: "darts.soundEnabled", newValue: "true" }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: "other.key", newValue: "x" }));
    expect(seen).toEqual([false, true]);

    unsubscribe();
    setSoundEnabled(false);
    expect(seen).toEqual([false, true]);
  });

  it("follows a choice made in another tab of the same device", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { isSoundEnabled } = await loadSoundPlayerModule();

    window.dispatchEvent(
      new StorageEvent("storage", { key: "darts.soundEnabled", newValue: "false" }),
    );
    expect(isSoundEnabled()).toBe(false);

    window.dispatchEvent(
      new StorageEvent("storage", { key: "darts.soundEnabled", newValue: null }),
    );
    expect(isSoundEnabled()).toBe(true);
  });

  it("reuses a fixed set of audio elements, so a long game does not pile them up", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { playSound } = await loadSoundPlayerModule();

    for (let i = 0; i < 10; i += 1) {
      playSound("throw");
    }

    const throwAudios = audioInstances.slice(1);
    expect(throwAudios).toHaveLength(3);
    const plays = throwAudios.reduce((sum, audio) => sum + audio.play.mock.calls.length, 0);
    expect(plays).toBe(10);
    expect(throwAudios.every((audio) => audio.currentTime === 2.3)).toBe(true);
  });

  it("reloads a pooled audio element whose file failed to load, so it plays again", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { playSound } = await loadSoundPlayerModule();

    playSound("win");
    const failed = audioInstances.find((audio) => audio.src === "/sounds/win-sound.mp3");
    if (failed === undefined) throw new Error("win audio missing");
    // The tablet was offline, so the browser could not fetch the file (MEDIA_ERR_SRC_NOT_SUPPORTED).
    failed.error = { code: 4 };

    // Three more plays bring the pool of three back round to the failed element.
    playSound("win");
    playSound("win");
    playSound("win");
    await Promise.resolve();
    await Promise.resolve();

    const winAudios = audioInstances.filter((audio) => audio.src === "/sounds/win-sound.mp3");
    expect(winAudios).toHaveLength(3);
    expect(failed.play).toHaveBeenCalledTimes(2);
    expect(clientLogger.warn).not.toHaveBeenCalledWith(
      "sound-player.playback-failed",
      expect.anything(),
    );
  });

  it("waits for metadata once per element, however often a sound that has not loaded is replayed", async () => {
    vi.stubGlobal("Audio", createAudioMock());
    const { playSound } = await loadSoundPlayerModule();
    const metadataWaits = (audio: AudioInstance | undefined) =>
      audio?.addEventListener.mock.calls.filter(([type]) => type === "loadedmetadata") ?? [];

    // Seven throws play the first pooled element three times while its file never loads.
    for (let i = 0; i < 7; i += 1) {
      playSound("throw");
    }
    const first = audioInstances[1];
    expect(metadataWaits(first)).toHaveLength(1);

    // Metadata arrives and the start time is applied.
    if (first === undefined) throw new Error("throw audio missing");
    const onMetadata: unknown = metadataWaits(first)[0]?.[1];
    if (typeof onMetadata !== "function") throw new Error("metadata listener missing");
    first.readyState = 1;
    onMetadata();
    expect(first.currentTime).toBe(2.3);

    // The file later fails; three throws later the reuse reloads it and waits for metadata again.
    first.error = { code: 4 };
    playSound("throw");
    playSound("throw");
    playSound("throw");
    expect(first.readyState).toBe(0);
    expect(metadataWaits(first)).toHaveLength(2);
  });

  it("rewinds a reused audio element that has no configured start time", async () => {
    vi.stubGlobal("Audio", createAudioMock({ readyState: 1 }));
    const { playSound } = await loadSoundPlayerModule();

    playSound("error");
    const first = audioInstances[1];
    if (first) first.currentTime = 1.5;
    playSound("error");
    playSound("error");
    playSound("error");

    expect(audioInstances.slice(1)).toHaveLength(3);
    expect(first?.currentTime).toBe(0);
    expect(first?.play).toHaveBeenCalledTimes(2);
    expect(first?.load).not.toHaveBeenCalled();
  });
});
