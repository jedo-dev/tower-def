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
import {
  dullThud,
  exhale,
  grit,
  mutedCoin,
  pouch,
  scrape,
  stoneKnock,
  thwip,
} from './coreFoleyLayers';
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
  // Crossbow release: string snap and a short bolt hiss.
  'combat.attack.default': {
    seed: 401,
    layers: thwip(0, 0.55),
  },
  // Arrow into dirt: a short thud and a spray of grit.
  'combat.impact.default': {
    seed: 402,
    layers: [
      thump(0, 170, 85, 0.06, 0.7),
      burst(0, 0.008, 0.4, [bandpass(2000, undefined, 2)], 9000),
      grit(0.005, 0.11, 0.45, 1400),
    ],
  },
  // Stone set on stone, a smaller settling knock, then a trowel of mortar.
  'combat.build': {
    seed: 403,
    layers: [
      ...stoneKnock(0, 0.8, 170),
      ...stoneKnock(0.09, 0.45, 210),
      scrape(0.15, 0.27, 0.4, 1200),
      grit(0.16, 0.08, 0.2, 700),
    ],
  },
  // Blocks tumble down, then a few coins drop into a pouch.
  'combat.sell': {
    seed: 404,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.38,
        frequencyHz: 1500,
        envelope: shaped(0.01, 0.25, 0.2, 0.1),
        gain: 0.25,
        filters: [lowpass(700)],
      },
      ...[
        { startSec: 0, fromHz: 190, gain: 0.7 },
        { startSec: 0.07, fromHz: 160, gain: 0.6 },
        { startSec: 0.15, fromHz: 210, gain: 0.5 },
        { startSec: 0.23, fromHz: 150, gain: 0.45 },
        { startSec: 0.31, fromHz: 180, gain: 0.3 },
      ].flatMap(({ startSec, fromHz, gain }) => stoneKnock(startSec, gain, fromHz)),
      mutedCoin(0.4, 0.28, 2100),
      mutedCoin(0.44, 0.22, 2400),
      mutedCoin(0.47, 0.18, 1900),
      ...pouch(0.45, 0.35),
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
  // A body drops, a limb settles, and the last breath leaves.
  'combat.creep_death': {
    seed: 407,
    layers: [
      ...dullThud(0, 0.9, 115),
      grit(0, 0.07, 0.4, 600),
      ...dullThud(0.11, 0.4, 140),
      exhale(0.05, 0.32, 0.45, 900, 450),
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
