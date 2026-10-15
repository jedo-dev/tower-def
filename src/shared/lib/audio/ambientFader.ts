// Fades a looping ambient track in and out without ever leaving its volume
// stuck at an intermediate value. Every interruption (a new fade, a resume, a
// cancel) snaps the volume back to the configured target, so a route change
// mid-fade cannot permanently lower the ambient loudness.

import { getEffectiveAmbientVolume } from './audioSettingsStore';

export enum AmbientFadeConfig {
  FADE_OUT_DURATION_MS = 220,
  FADE_STEP_MS = 20,
}

/** The subset of HTMLAudioElement the fader drives. */
export type FadeableAudio = {
  volume: number;
  currentTime: number;
  pause: () => void;
  play: () => Promise<void>;
};

/** Injectable interval timer so fades can be tested without real time. */
export type FadeTimer = {
  setInterval: (callback: () => void, intervalMs: number) => number;
  clearInterval: (handle: number) => void;
};

export type AmbientFaderOptions = {
  audio: FadeableAudio;
  /** Configured loudness the track returns to after any fade or interruption. */
  getTargetVolume?: () => number;
  timer?: FadeTimer;
  fadeOutDurationMs?: number;
  stepMs?: number;
};

export type AmbientFader = {
  /** Cancels any fade, restores the target volume and starts playback. */
  play: () => void;
  /** Fades to silence, then pauses, rewinds and restores the target volume. */
  fadeOut: () => void;
  /** Cancels any running fade and restores the target volume. */
  cancel: () => void;
  isFading: () => boolean;
};

const browserTimer: FadeTimer = {
  setInterval: (callback, intervalMs) => window.setInterval(callback, intervalMs),
  clearInterval: (handle) => window.clearInterval(handle),
};

function readConfiguredAmbientVolume(): number {
  return getEffectiveAmbientVolume();
}

/** Volume for a fade-out step: linear from `startVolume` to 0 over `totalSteps`. */
export function computeFadeOutVolume(
  startVolume: number,
  step: number,
  totalSteps: number,
): number {
  if (totalSteps <= 0) {
    return 0;
  }
  return Math.max(0, startVolume * (1 - step / totalSteps));
}

export function createAmbientFader(options: AmbientFaderOptions): AmbientFader {
  const {
    audio,
    getTargetVolume = readConfiguredAmbientVolume,
    timer = browserTimer,
    fadeOutDurationMs = AmbientFadeConfig.FADE_OUT_DURATION_MS,
    stepMs = AmbientFadeConfig.FADE_STEP_MS,
  } = options;
  let activeTimer: number | null = null;

  const stopTimer = (): void => {
    if (activeTimer !== null) {
      timer.clearInterval(activeTimer);
      activeTimer = null;
    }
  };

  const cancel = (): void => {
    stopTimer();
    audio.volume = getTargetVolume();
  };

  const play = (): void => {
    cancel();
    void audio.play().catch(() => undefined);
  };

  const fadeOut = (): void => {
    stopTimer();
    // A fade that interrupts another fade continues from the current (already
    // lowered) volume; it never starts above the configured target.
    const startVolume = Math.min(audio.volume, getTargetVolume());
    const totalSteps = Math.max(1, Math.floor(fadeOutDurationMs / stepMs));
    let step = 0;
    activeTimer = timer.setInterval(() => {
      step += 1;
      audio.volume = computeFadeOutVolume(startVolume, step, totalSteps);
      if (step >= totalSteps) {
        stopTimer();
        audio.pause();
        audio.currentTime = 0;
        audio.volume = getTargetVolume();
      }
    }, stepMs);
  };

  return {
    play,
    fadeOut,
    cancel,
    isFading: () => activeTimer !== null,
  };
}
