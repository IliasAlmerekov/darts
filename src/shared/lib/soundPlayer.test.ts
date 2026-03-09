// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AudioInstance = {
  src: string;
  volume: number;
  currentTime: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

const audioInstances: AudioInstance[] = [];

function createAudioMock(options?: {
  playImplementation?: () => Promise<void>;
  currentTimeSetter?: (value: number) => void;
}): typeof Audio {
  return function MockAudio(this: AudioInstance, src: string) {
    this.src = src;
    this.volume = 1;

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

    this.play = vi.fn(options?.playImplementation ?? (() => Promise.resolve()));
    this.pause = vi.fn();
    this.addEventListener = vi.fn();

    audioInstances.push(this);
  } as unknown as typeof Audio;
}

async function loadSoundPlayerModule() {
  vi.resetModules();
  return import("./soundPlayer");
}

describe("soundPlayer", () => {
  beforeEach(() => {
    audioInstances.length = 0;
  });

  afterEach(() => {
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

  it("plays configured throw audio with default unlock and configured start time", async () => {
    vi.stubGlobal("Audio", createAudioMock());
    const { playSound } = await loadSoundPlayerModule();

    playSound("throw");
    await Promise.resolve();

    expect(audioInstances).toHaveLength(2);
    expect(audioInstances[1]?.src).toBe("/sounds/throw-sound.mp3");
    expect(audioInstances[1]?.volume).toBe(0.4);
    expect(audioInstances[1]?.currentTime).toBe(2.3);
    expect(audioInstances[1]?.play).toHaveBeenCalledTimes(1);
  });

  it("falls back to loadedmetadata when currentTime assignment throws", async () => {
    vi.stubGlobal("Audio", function MockAudio(this: AudioInstance, src: string) {
      this.src = src;
      this.volume = 1;

      let internalCurrentTime = 0;
      let shouldThrow = src.includes("undo-sound");
      Object.defineProperty(this, "currentTime", {
        configurable: true,
        enumerable: true,
        get: () => internalCurrentTime,
        set: (value: number) => {
          if (shouldThrow) {
            shouldThrow = false;
            throw new Error("metadata not ready");
          }

          internalCurrentTime = value;
        },
      });

      this.play = vi.fn(() => Promise.resolve());
      this.pause = vi.fn();
      this.addEventListener = vi.fn();

      audioInstances.push(this);
    } as unknown as typeof Audio);
    const { playSound } = await loadSoundPlayerModule();

    playSound("undo");

    expect(audioInstances[1]?.addEventListener).toHaveBeenCalledTimes(1);
    const addEventListenerCall = audioInstances[1]?.addEventListener.mock.calls[0];
    expect(addEventListenerCall?.[0]).toBe("loadedmetadata");

    const listener = addEventListenerCall?.[1] as (() => void) | undefined;
    listener?.();

    expect(audioInstances[1]?.currentTime).toBe(0.2);
  });

  it("swallows playback rejections", async () => {
    vi.stubGlobal(
      "Audio",
      createAudioMock({
        playImplementation: () => Promise.reject(new Error("blocked")),
      }),
    );
    const { playSound } = await loadSoundPlayerModule();

    expect(() => playSound("error")).not.toThrow();
    await Promise.resolve();
  });
});
