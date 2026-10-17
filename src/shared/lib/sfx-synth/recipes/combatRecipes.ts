import type { SfxLayer } from '../sfxRecipe.types';
import {
  NOTE,
  WHITE,
  bandpass,
  bell,
  burst,
  highpass,
  hit,
  lowpass,
  shaped,
  thump,
} from './recipeKit';
import type { SfxRecipeGroup } from './recipeGroups';

function warningTone(frequencyHz: number, startSec: number): SfxLayer {
  return {
    waveform: 'square',
    startSec,
    durationSec: 0.16,
    frequencyHz,
    dutyCycle: 0.3,
    envelope: shaped(0.01, 0.1, 0.3, 0.04),
    gain: 0.35,
    filters: [lowpass(1200)],
  };
}

function bubble(fromHz: number, startSec: number, gain: number): SfxLayer {
  return {
    waveform: 'sine',
    startSec,
    durationSec: 0.04,
    frequencyHz: fromHz,
    frequencyEndHz: fromHz * 2,
    envelope: hit(0.035),
    gain,
  };
}

/** Fallback clips (default profile) and race-neutral status effect stingers. */
export const COMBAT_RECIPES: SfxRecipeGroup<'combat'> = {
  'combat.attack.default': {
    seed: 401,
    layers: [
      {
        waveform: 'triangle',
        durationSec: 0.14,
        frequencyHz: 190,
        frequencyEndHz: 120,
        envelope: hit(0.12),
        gain: 0.5,
        filters: [lowpass(2500)],
      },
      burst(0, 0.025, 0.35, [bandpass(2500)]),
      { ...burst(0.01, 0.1, 0.2, [bandpass(1800, 900)]), envelope: hit(0.09, 0.02) },
    ],
  },
  'combat.impact.default': {
    seed: 402,
    layers: [burst(0, 0.06, 0.5, [lowpass(900)]), thump(0, 130, 65, 0.09, 0.6)],
  },
  'combat.build': {
    seed: 403,
    layers: [
      burst(0, 0.04, 0.45, [bandpass(700, undefined, 1.5)]),
      thump(0, 160, 95, 0.08, 0.5),
      burst(0.12, 0.04, 0.45, [bandpass(650, undefined, 1.5)]),
      thump(0.12, 140, 85, 0.08, 0.5),
      bell(NOTE.D5, 0.22, 0.17, 0.25, { ratio: 2, index: 0.8 }),
    ],
  },
  'combat.sell': {
    seed: 404,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.28,
        frequencyHz: WHITE,
        tremolo: { rateHz: 22, depth: 0.6 },
        envelope: shaped(0.005, 0.2, 0.15, 0.08),
        gain: 0.5,
        filters: [lowpass(2200, 350)],
      },
      {
        waveform: 'triangle',
        durationSec: 0.25,
        frequencyHz: 330,
        frequencyEndHz: 165,
        envelope: hit(0.22),
        gain: 0.25,
      },
    ],
  },
  'combat.upgrade': {
    seed: 405,
    layers: [
      bell(NOTE.D4, 0, 0.25, 0.35, { ratio: 2 }),
      bell(NOTE.A4, 0.06, 0.25, 0.4, { ratio: 2 }),
      bell(NOTE.D5, 0.12, 0.26, 0.45, { ratio: 2 }),
      {
        waveform: 'noise',
        startSec: 0.05,
        durationSec: 0.3,
        frequencyHz: WHITE,
        tremolo: { rateHz: 30, depth: 0.8 },
        envelope: shaped(0.05, 0.15, 0.3, 0.1),
        gain: 0.08,
        filters: [highpass(4000)],
      },
    ],
  },
  'combat.creep_hit': {
    seed: 406,
    layers: [burst(0, 0.04, 0.5, [lowpass(700)]), thump(0, 150, 90, 0.05, 0.5)],
  },
  'combat.creep_death': {
    seed: 407,
    layers: [
      {
        waveform: 'saw',
        durationSec: 0.26,
        frequencyHz: 130,
        frequencyEndHz: 60,
        drive: 1,
        envelope: shaped(0.01, 0.2, 0.2, 0.05),
        gain: 0.4,
        filters: [lowpass(800, undefined, 1.5)],
      },
      burst(0, 0.08, 0.4, [lowpass(600)]),
      thump(0, 90, 45, 0.12, 0.4),
    ],
  },
  'combat.creep_escape': {
    seed: 408,
    layers: [warningTone(NOTE.A3, 0), warningTone(NOTE.F3, 0.16), thump(0, 70, 50, 0.3, 0.3)],
  },
  // A sent creature enters the board: a short low rush with a dull drum under it.
  'combat.creep_spawn': {
    seed: 412,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.24,
        frequencyHz: WHITE,
        envelope: shaped(0.06, 0.12, 0, 0.05),
        gain: 0.4,
        filters: [bandpass(350, 1300, 1.2)],
      },
      thump(0.08, 110, 60, 0.16, 0.55),
      {
        waveform: 'triangle',
        startSec: 0.06,
        durationSec: 0.2,
        frequencyHz: NOTE.D3,
        frequencyEndHz: NOTE.A3,
        envelope: shaped(0.03, 0.12, 0, 0.04),
        gain: 0.18,
        filters: [lowpass(900)],
      },
    ],
  },
  'combat.effect_applied.chill': {
    seed: 409,
    layers: [
      {
        waveform: 'fm',
        durationSec: 0.22,
        frequencyHz: NOTE.A6,
        fm: { ratio: 1.5, index: 1.5, indexEnd: 0.3 },
        vibrato: { rateHz: 9, depth: 0.01 },
        envelope: shaped(0.01, 0.18, 0, 0.03),
        gain: 0.35,
      },
      { ...burst(0, 0.2, 0.25, [highpass(4500)], 6000), envelope: shaped(0.02, 0.15, 0, 0.03) },
      { ...bell(NOTE.E6 * 2, 0.03, 0.15, 0.12, { ratio: 1, index: 0 }), waveform: 'sine' },
    ],
  },
  'combat.effect_applied.poison': {
    seed: 410,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.22,
        frequencyHz: WHITE,
        envelope: shaped(0.02, 0.18, 0.1, 0.03),
        gain: 0.5,
        filters: [bandpass(1400, 700, 3)],
      },
      bubble(280, 0.03, 0.35),
      bubble(340, 0.1, 0.3),
      bubble(250, 0.16, 0.25),
    ],
  },
  'combat.effect_applied.stun': {
    seed: 411,
    layers: [
      thump(0, 220, 55, 0.18, 0.7),
      burst(0, 0.05, 0.4, [lowpass(500)]),
      {
        waveform: 'triangle',
        durationSec: 0.12,
        frequencyHz: NOTE.A4,
        frequencyEndHz: 330,
        envelope: hit(0.11),
        gain: 0.15,
      },
    ],
  },
};
