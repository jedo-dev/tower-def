/**
 * sfxr-style sound recipes: a recipe is plain data (layers of oscillators or
 * noise with envelopes, sweeps and filters) that `renderSfxRecipe` turns into
 * samples. Same recipe, same seed, same bytes: the generator is deterministic.
 */

/** Every generated clip is mono 16-bit PCM at this rate. */
export const SFX_SAMPLE_RATE = 22050;

export const SFX_BIT_DEPTH = 16;

/** Highest peak a clip may reach after normalization, about -0.4 dBFS. */
export const SFX_DEFAULT_PEAK = 0.95;

/**
 * RMS a clip is normalized towards, so a bony click and a drum land at a
 * similar loudness; the peak ceiling wins for very spiky sounds.
 */
export const SFX_DEFAULT_LOUDNESS = 0.2;

/** Fade applied to the last samples so no clip ends on a click. */
export const SFX_END_FADE_SEC = 0.004;

/**
 * - `noise`: sample-and-hold noise; `frequencyHz` is the hold rate, so a low
 *   value crunches (bone clicks) and a value at the sample rate is white noise.
 * - `fm`: a sine carrier modulated by a sine (`fm` field): bells and steel.
 */
export type SfxWaveform = 'sine' | 'triangle' | 'square' | 'saw' | 'noise' | 'fm';

/**
 * Attack ramps 0 -> 1, decay falls to `sustainLevel`, sustain holds until the
 * release, release falls to 0 at the end of the layer.
 */
export type SfxEnvelope = {
  attackSec: number;
  decaySec: number;
  sustainLevel: number;
  releaseSec: number;
};

export type SfxFilterType = 'lowpass' | 'highpass' | 'bandpass';

export type SfxFilter = {
  type: SfxFilterType;
  cutoffHz: number;
  /** Sweeps the cutoff exponentially over the layer. */
  cutoffEndHz?: number;
  /** Resonance; 0.707 is flat. */
  q?: number;
};

/**
 * One resonance of a vocal tract: a band-pass peak the layer's source is fed
 * through. `frequencyEndHz` glides it over the layer, like a vowel changing.
 */
export type SfxFormant = {
  frequencyHz: number;
  frequencyEndHz?: number;
  /** Resonance sharpness; around 5-10 for a voice. */
  q: number;
  gain: number;
};

export type SfxLayer = {
  waveform: SfxWaveform;
  /** Offset of the layer inside the clip. */
  startSec?: number;
  durationSec: number;
  frequencyHz: number;
  /** Sweeps the pitch exponentially towards this frequency. */
  frequencyEndHz?: number;
  /** Shape of the sweep in time; 1 is even, above 1 starts slow, below 1 starts fast. */
  sweepCurve?: number;
  /** Square duty cycle, 0.5 by default. */
  dutyCycle?: number;
  /**
   * Periodic pitch wobble; `depth` is a share of the frequency. `depthEnd`
   * widens or narrows it evenly over the layer (a singer's failing vibrato).
   */
  vibrato?: { rateHz: number; depth: number; depthEnd?: number };
  /**
   * Unsteady pitch: a smooth random drift that picks a new target `rateHz`
   * times a second, at most `depth` (a share of the frequency) away. Seeded,
   * so it stays deterministic. Gives a tired or hoarse voice its wobble.
   */
  jitter?: { rateHz: number; depth: number };
  /** Periodic volume wobble; `depth` 0..1. */
  tremolo?: { rateHz: number; depth: number };
  /** Modulator for `fm`: frequency ratio and modulation index (decays to `indexEnd`). */
  fm?: { ratio: number; index: number; indexEnd?: number };
  envelope: SfxEnvelope;
  gain: number;
  filters?: SfxFilter[];
  /**
   * Parallel formant bank applied after `drive` and before `filters`: the
   * source is replaced by the sum of its band-passed copies, so a saw reads
   * as a sung or spoken vowel.
   */
  formants?: SfxFormant[];
  /** Soft saturation; 0 is clean, 3 is gritty. */
  drive?: number;
};

export type SfxEcho = {
  delaySec: number;
  feedback: number;
  /** Share of the delayed signal mixed in. */
  mix: number;
};

export type SfxRecipe = {
  /** Seeds the noise; change it to get a different take of the same recipe. */
  seed: number;
  layers: SfxLayer[];
  echo?: SfxEcho;
  /** Silence added after the last layer so an echo can ring out. */
  tailSec?: number;
  /** Peak ceiling; `SFX_DEFAULT_PEAK` when omitted. */
  peak?: number;
  /** Target RMS; `SFX_DEFAULT_LOUDNESS` when omitted. Lower it for quiet, frequent cues. */
  loudness?: number;
};
