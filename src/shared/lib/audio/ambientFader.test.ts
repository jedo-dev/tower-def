import { describe, expect, it, vi } from 'vitest';
import {
  AmbientFadeConfig,
  computeFadeOutVolume,
  createAmbientFader,
  type FadeTimer,
  type FadeableAudio,
} from './ambientFader';
import { getAudioSettings, setAudioSettings } from './audioSettingsStore';

type ManualTimer = FadeTimer & {
  tick: (count?: number) => void;
  activeCount: () => number;
};

function createManualTimer(): ManualTimer {
  const callbacks = new Map<number, () => void>();
  let nextHandle = 1;
  return {
    setInterval: (callback) => {
      const handle = nextHandle;
      nextHandle += 1;
      callbacks.set(handle, callback);
      return handle;
    },
    clearInterval: (handle) => {
      callbacks.delete(handle);
    },
    tick: (count = 1) => {
      for (let index = 0; index < count; index += 1) {
        [...callbacks.values()].forEach((callback) => callback());
      }
    },
    activeCount: () => callbacks.size,
  };
}

type FakeAudio = FadeableAudio & { pauseCalls: number; playCalls: number };

function createFakeAudio(volume: number): FakeAudio {
  const audio: FakeAudio = {
    volume,
    currentTime: 12,
    pauseCalls: 0,
    playCalls: 0,
    pause: () => {
      audio.pauseCalls += 1;
    },
    play: () => {
      audio.playCalls += 1;
      return Promise.resolve();
    },
  };
  return audio;
}

const TARGET_VOLUME = 0.4;
const TOTAL_STEPS = Math.floor(
  AmbientFadeConfig.FADE_OUT_DURATION_MS / AmbientFadeConfig.FADE_STEP_MS,
);

function setup(target = TARGET_VOLUME) {
  let configured = target;
  const audio = createFakeAudio(target);
  const timer = createManualTimer();
  const fader = createAmbientFader({ audio, timer, getTargetVolume: () => configured });
  return {
    audio,
    timer,
    fader,
    setConfigured: (next: number) => {
      configured = next;
    },
  };
}

describe('computeFadeOutVolume', () => {
  it('interpolates linearly to zero and clamps', () => {
    expect(computeFadeOutVolume(0.4, 0, 4)).toBeCloseTo(0.4);
    expect(computeFadeOutVolume(0.4, 2, 4)).toBeCloseTo(0.2);
    expect(computeFadeOutVolume(0.4, 4, 4)).toBe(0);
    expect(computeFadeOutVolume(0.4, 6, 4)).toBe(0);
    expect(computeFadeOutVolume(0.4, 1, 0)).toBe(0);
  });
});

describe('createAmbientFader', () => {
  it('fades out, then pauses, rewinds and restores the target volume', () => {
    const { audio, timer, fader } = setup();
    fader.fadeOut();
    timer.tick(Math.floor(TOTAL_STEPS / 2));
    expect(audio.volume).toBeLessThan(TARGET_VOLUME);
    expect(audio.volume).toBeGreaterThan(0);
    expect(fader.isFading()).toBe(true);

    timer.tick(TOTAL_STEPS);
    expect(audio.pauseCalls).toBe(1);
    expect(audio.currentTime).toBe(0);
    expect(audio.volume).toBe(TARGET_VOLUME);
    expect(fader.isFading()).toBe(false);
    expect(timer.activeCount()).toBe(0);
  });

  it('restores the target volume when a fade-out is interrupted by play', () => {
    const { audio, timer, fader } = setup();
    fader.fadeOut();
    timer.tick(3);
    expect(audio.volume).toBeLessThan(TARGET_VOLUME);

    fader.play();
    expect(audio.volume).toBe(TARGET_VOLUME);
    expect(audio.playCalls).toBe(1);
    expect(fader.isFading()).toBe(false);

    timer.tick(TOTAL_STEPS);
    expect(audio.volume).toBe(TARGET_VOLUME);
    expect(audio.pauseCalls).toBe(0);
  });

  it('restores the target volume when a fade-out is cancelled', () => {
    const { audio, timer, fader } = setup();
    fader.fadeOut();
    timer.tick(4);
    fader.cancel();
    expect(audio.volume).toBe(TARGET_VOLUME);
    expect(timer.activeCount()).toBe(0);
  });

  it('never compounds attenuation across repeated navigation', () => {
    const { audio, timer, fader } = setup();
    for (let round = 0; round < 5; round += 1) {
      fader.fadeOut();
      timer.tick(2);
      fader.play();
      expect(audio.volume).toBe(TARGET_VOLUME);
    }
    expect(timer.activeCount()).toBe(0);
  });

  it('keeps a single timer when fade-out restarts mid-fade and ends at the target', () => {
    const { audio, timer, fader } = setup();
    fader.fadeOut();
    timer.tick(3);
    const lowered = audio.volume;
    fader.fadeOut();
    expect(timer.activeCount()).toBe(1);
    timer.tick(1);
    expect(audio.volume).toBeLessThan(lowered);

    timer.tick(TOTAL_STEPS);
    expect(audio.pauseCalls).toBe(1);
    expect(audio.volume).toBe(TARGET_VOLUME);
  });

  it('targets the volume configured at interruption time', () => {
    const { audio, timer, fader, setConfigured } = setup();
    fader.fadeOut();
    timer.tick(2);
    setConfigured(0.1);
    fader.play();
    expect(audio.volume).toBe(0.1);
  });

  it('reads the target from the audio settings store by default', () => {
    const previous = getAudioSettings().ambientVolume;
    setAudioSettings({ ambientVolume: 0.25 });
    try {
      const audio = createFakeAudio(0.25);
      const timer = createManualTimer();
      const fader = createAmbientFader({ audio, timer });
      fader.fadeOut();
      timer.tick(2);
      fader.cancel();
      expect(audio.volume).toBe(0.25);
    } finally {
      setAudioSettings({ ambientVolume: previous });
    }
  });

  it('swallows playback rejections', async () => {
    const audio = createFakeAudio(TARGET_VOLUME);
    audio.play = vi.fn(() => Promise.reject(new Error('autoplay blocked')));
    const fader = createAmbientFader({
      audio,
      timer: createManualTimer(),
      getTargetVolume: () => TARGET_VOLUME,
    });
    expect(() => fader.play()).not.toThrow();
    await Promise.resolve();
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
});
