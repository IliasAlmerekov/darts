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
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
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
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
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

      this.play = vi.fn(options?.playImplementation ?? (() => Promise.resolve()));
      this.pause = vi.fn();
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
});
