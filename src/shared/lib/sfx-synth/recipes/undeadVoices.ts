import type { SfxLayer } from '../sfxRecipe.types';
import {
  WHITE,
  bandpass,
  bell,
  burst,
  highpass,
  hit,
  lowpass,
  shaped,
  swell,
  thump,
} from './recipeKit';

/**
 * Sound vocabulary of the undead: bones, wet flesh, chitin, stone, chains,
 * whispers, wails and ice. Each helper returns plain layer data for the
 * undead recipe files.
 */

/** A dry bone click: crunchy held noise at a few kHz. */
export function boneClick(startSec: number, holdHz: number, gain: number): SfxLayer {
  return burst(startSec, 0.025, gain, [highpass(700)], holdHz);
}

/** Necrotic hiss: thin, airy noise that trails a shot. */
export function hiss(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(0.02, durationSec * 0.7, 0, 0.03),
    gain,
    filters: [highpass(3500)],
  };
}

/** Dry rattle: a run of unevenly spaced bone clicks that fades out. */
export function rattle(
  startSec: number,
  count: number,
  spacingSec: number,
  holdHz: number,
  gain: number,
): SfxLayer[] {
  return Array.from({ length: count }, (_, index) =>
    boneClick(
      startSec + spacingSec * index + (index % 2) * spacingSec * 0.3,
      holdHz + ((index * 3) % 5) * 220,
      gain * (1 - (index * 0.5) / count),
    ),
  );
}

/** Hungry snarl: a driven saw fluttering in the throat, through a vowel band. */
export function snarl(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
  bandHz = 850,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    drive: 2.5,
    tremolo: { rateHz: 32, depth: 0.5 },
    envelope: shaped(0.01, durationSec * 0.6, 0.4, durationSec * 0.3),
    gain,
    filters: [bandpass(bandHz, undefined, 2)],
  };
}

/** Wet tearing: crunchy, flickering low-mid noise. */
export function wetTear(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 5000,
    tremolo: { rateHz: 45, depth: 0.7 },
    envelope: shaped(0.005, durationSec * 0.5, 0.3, durationSec * 0.4),
    gain,
    filters: [bandpass(900, 500, 1.4)],
  };
}

/** Chitin tick: a hard, very short high click with a hollow shell tone. */
export function chitinClick(startSec: number, gain: number, toneHz = 1900): SfxLayer[] {
  return [
    burst(startSec, 0.012, gain, [highpass(2500)], 9000),
    {
      waveform: 'square',
      startSec,
      durationSec: 0.016,
      frequencyHz: toneHz,
      frequencyEndHz: toneHz * 0.7,
      envelope: hit(0.013),
      gain: gain * 0.4,
      filters: [bandpass(toneHz, undefined, 4)],
    },
  ];
}

/** Web hiss: a thin, sticky fizz. */
export function webHiss(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    tremolo: { rateHz: 60, depth: 0.4 },
    envelope: shaped(0.02, durationSec * 0.5, 0.4, durationSec * 0.4),
    gain,
    filters: [bandpass(5200, 4000, 3)],
  };
}

/** Stone scrape: gravelly noise dragged across stone. */
export function stoneScrape(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 1400,
    tremolo: { rateHz: 23, depth: 0.4 },
    envelope: shaped(0.02, durationSec * 0.4, 0.5, durationSec * 0.4),
    gain,
    filters: [bandpass(700, 450, 1.5)],
  };
}

/** Leathery wingbeat: a soft whoomp of pushed air with a low body. */
export function wingbeat(startSec: number, gain: number, bandHz = 500): SfxLayer[] {
  return [
    {
      waveform: 'noise',
      startSec,
      durationSec: 0.1,
      frequencyHz: WHITE,
      envelope: shaped(0.035, 0.05, 0, 0.015),
      gain,
      filters: [bandpass(bandHz, bandHz * 0.52, 1.2)],
    },
    thump(startSec + 0.03, 70, 50, 0.07, gain * 0.4),
  ];
}

/** Chain clink: an inharmonic iron tick. */
export function chainClink(startSec: number, frequencyHz: number, gain: number): SfxLayer {
  return bell(frequencyHz, startSec, 0.07, gain, { ratio: 2.76, index: 2.2 });
}

/** Gurgle: a low, wobbling bubble voice. */
export function gurgle(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'sine',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    drive: 1.2,
    vibrato: { rateHz: 19, depth: 0.25 },
    tremolo: { rateHz: 11, depth: 0.6 },
    envelope: shaped(0.02, durationSec * 0.5, 0.5, durationSec * 0.3),
    gain,
    filters: [lowpass(700)],
  };
}

/** Bellow: a huge, slow-quavering driven throat. */
export function bellow(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    drive: 2.8,
    vibrato: { rateHz: 6, depth: 0.05 },
    envelope: shaped(0.03, durationSec * 0.5, 0.5, durationSec * 0.35),
    gain,
    filters: [bandpass(420, 300, 1.6)],
  };
}

/** Whisper: breathy noise in a narrow formant, pulsing like syllables. */
export function whisper(
  startSec: number,
  durationSec: number,
  formantHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    tremolo: { rateHz: 8, depth: 0.8 },
    envelope: shaped(0.04, durationSec * 0.5, 0.6, durationSec * 0.3),
    gain,
    filters: [bandpass(formantHz, formantHz * 1.3, 4), highpass(900)],
  };
}

/** Chant: a soft hummed note under a whisper. */
export function chant(
  startSec: number,
  durationSec: number,
  frequencyHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'triangle',
    startSec,
    durationSec,
    frequencyHz,
    vibrato: { rateHz: 5, depth: 0.015 },
    envelope: swell(0.05, durationSec * 0.4),
    gain,
    filters: [lowpass(900)],
  };
}

/** Staff tap: hard wood on stone. */
export function staffTap(startSec: number, gain: number): SfxLayer[] {
  return [
    thump(startSec, 420, 260, 0.05, gain),
    burst(startSec, 0.02, gain * 0.6, [bandpass(1400, undefined, 3)], 8000),
  ];
}

/** Wail: a high, airy voice with a slow quaver. */
export function wail(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'sine',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    vibrato: { rateHz: 5.5, depth: 0.035 },
    envelope: shaped(durationSec * 0.2, durationSec * 0.4, 0.6, durationSec * 0.3),
    gain,
    filters: [lowpass(3500)],
  };
}

/** Airy breath: soft wind around a centre band. */
export function airyBreath(
  startSec: number,
  durationSec: number,
  centerHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(durationSec * 0.3, durationSec * 0.3, 0.5, durationSec * 0.3),
    gain,
    filters: [bandpass(centerHz, centerHz * 0.7, 1.5)],
  };
}

/** Glassy shimmer: a bright, trembling FM tone. */
export function shimmer(
  startSec: number,
  durationSec: number,
  frequencyHz: number,
  gain: number,
): SfxLayer {
  return {
    ...bell(frequencyHz, startSec, durationSec, gain, { ratio: 3.5, index: 1.2, attackSec: 0.01 }),
    tremolo: { rateHz: 14, depth: 0.4 },
  };
}

/** Icy crackle: sparse sharp ticks of high crunchy noise. */
export function iceCrackle(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 7000,
    tremolo: { rateHz: 70, depth: 0.9 },
    envelope: shaped(0.003, durationSec * 0.6, 0.2, durationSec * 0.3),
    gain,
    filters: [highpass(3800)],
  };
}

/** Cold roar: a deep driven growl in a dark band. */
export function coldRoar(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    drive: 2.4,
    vibrato: { rateHz: 7, depth: 0.04 },
    tremolo: { rateHz: 24, depth: 0.3 },
    envelope: shaped(0.04, durationSec * 0.5, 0.5, durationSec * 0.35),
    gain,
    filters: [lowpass(650, 380)],
  };
}
