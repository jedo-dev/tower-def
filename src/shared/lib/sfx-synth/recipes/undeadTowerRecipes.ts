import type { UndeadSoundId } from '../../../types/sound-ids';
import type { SfxLayer, SfxRecipe } from '../sfxRecipe.types';
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
  swell,
  thump,
} from './recipeKit';
import { boneClick, coldRoar, hiss, iceCrackle, wetTear } from './undeadVoices';

type UndeadTowerSoundId = Extract<UndeadSoundId, `combat.tower.${string}`>;

/** A small rising bubble pop: plague brewing and bursting. */
function bubble(startSec: number, fromHz: number, gain: number): SfxLayer {
  return {
    ...thump(startSec, fromHz, fromHz * 1.9, 0.035, gain),
    sweepCurve: 1.6,
  };
}

export const UNDEAD_TOWER_RECIPES: Record<UndeadTowerSoundId, SfxRecipe> = {
  // Bone Archer Tower: a sinew bow creaks, a bone-tipped arrow flies.
  'combat.tower.undead_bone_archer_tower.attack': {
    seed: 591,
    layers: [
      {
        waveform: 'saw',
        durationSec: 0.06,
        frequencyHz: 130,
        frequencyEndHz: 160,
        tremolo: { rateHz: 70, depth: 0.8 },
        envelope: swell(0.04, 0.015),
        gain: 0.3,
        filters: [bandpass(900, undefined, 2.5)],
      },
      {
        waveform: 'triangle',
        startSec: 0.055,
        durationSec: 0.1,
        frequencyHz: NOTE.A3,
        frequencyEndHz: NOTE.D3,
        envelope: hit(0.09),
        gain: 0.45,
        filters: [lowpass(1600)],
      },
      boneClick(0.055, 2900, 0.35),
      hiss(0.07, 0.11, 0.12),
    ],
  },
  'combat.tower.undead_bone_archer_tower.impact': {
    seed: 592,
    layers: [boneClick(0, 3400, 0.6), boneClick(0.018, 2500, 0.4), thump(0, 260, 140, 0.05, 0.4)],
  },

  // Plague Tower: a bubbling plague burst and a wet splat.
  'combat.tower.undead_plague_tower.attack': {
    seed: 593,
    layers: [
      bubble(0, 260, 0.35),
      bubble(0.04, 330, 0.3),
      bubble(0.075, 290, 0.3),
      {
        waveform: 'noise',
        startSec: 0.09,
        durationSec: 0.1,
        frequencyHz: WHITE,
        envelope: hit(0.09, 0.01),
        gain: 0.45,
        filters: [lowpass(1300, 500)],
      },
      thump(0.09, 95, 50, 0.1, 0.5),
    ],
  },
  'combat.tower.undead_plague_tower.impact': {
    seed: 594,
    layers: [
      burst(0, 0.08, 0.6, [lowpass(1600, 400)]),
      wetTear(0, 0.1, 0.35),
      bubble(0.06, 380, 0.2),
      bubble(0.1, 450, 0.15),
    ],
  },

  // Frost Wyrm Nest: a cold breath and a frost shatter.
  'combat.tower.undead_frost_wyrm_nest.attack': {
    seed: 595,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.19,
        frequencyHz: WHITE,
        envelope: shaped(0.04, 0.08, 0.4, 0.06),
        gain: 0.5,
        filters: [bandpass(3200, 1800, 1)],
      },
      coldRoar(0, 0.17, 110, 92, 0.3),
      iceCrackle(0.08, 0.1, 0.18),
    ],
  },
  'combat.tower.undead_frost_wyrm_nest.impact': {
    seed: 596,
    layers: [
      bell(NOTE.A6, 0, 0.12, 0.3, { ratio: 4.2, index: 2.4 }),
      bell(NOTE.D6 * 1.01, 0.012, 0.1, 0.22, { ratio: 4.2, index: 2 }),
      iceCrackle(0, 0.1, 0.45),
      burst(0, 0.02, 0.4, [highpass(4000)], 9000),
    ],
  },

  // Bone Obelisk: a low resonant hum and a dark pulse.
  'combat.tower.undead_bone_obelisk.attack': {
    seed: 597,
    layers: [
      {
        waveform: 'sine',
        durationSec: 0.19,
        frequencyHz: NOTE.D2,
        frequencyEndHz: NOTE.D2 * 1.06,
        envelope: shaped(0.03, 0.08, 0.6, 0.06),
        gain: 0.35,
      },
      {
        waveform: 'saw',
        durationSec: 0.19,
        frequencyHz: NOTE.D3,
        tremolo: { rateHz: 12, depth: 0.6 },
        envelope: shaped(0.03, 0.08, 0.5, 0.06),
        gain: 0.45,
        filters: [lowpass(750, undefined, 3)],
      },
    ],
  },
  'combat.tower.undead_bone_obelisk.impact': {
    seed: 598,
    layers: [
      thump(0, 115, 48, 0.12, 0.7),
      {
        waveform: 'fm',
        durationSec: 0.15,
        frequencyHz: NOTE.D3,
        frequencyEndHz: NOTE.D2,
        fm: { ratio: 0.5, index: 2.5, indexEnd: 0.3 },
        envelope: hit(0.14, 0.01),
        gain: 0.35,
        filters: [lowpass(900)],
      },
      hiss(0.02, 0.1, 0.03),
    ],
  },
};
