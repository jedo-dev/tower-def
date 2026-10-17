import { WHITE, bandpass, burst, highpass, hit, lowpass, shaped, thump } from './recipeKit';
import { ORC_EARLY_CREATURE_RECIPES } from './orcEarlyCreatureRecipes';
import { ORC_LATE_CREATURE_RECIPES } from './orcLateCreatureRecipes';
import { bark, breath, drum, woodSnap } from './orcRecipeKit';
import { ORC_TOWER_RECIPES } from './orcTowerRecipes';
import type { RaceSfxRecipeGroup } from './recipeGroups';

/**
 * Every orc recipe (seeds 6xx). Race-wide fallbacks, the Grunt and the Spear
 * Watchtower live here; the other creatures and towers in the files spread in.
 */
export const ORC_RECIPES: RaceSfxRecipeGroup<'orc'> = {
  'combat.attack.single.orc': {
    seed: 601,
    layers: [
      { ...burst(0, 0.09, 0.45, [bandpass(400, 900, 1.2)]), envelope: shaped(0.02, 0.06, 0, 0.01) },
      thump(0.02, 115, 70, 0.12, 0.6),
      burst(0.02, 0.02, 0.3, [bandpass(900, undefined, 2)]),
    ],
  },
  'combat.attack.splash.orc': {
    seed: 602,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.32,
        frequencyHz: WHITE,
        drive: 2,
        tremolo: { rateHz: 13, depth: 0.35 },
        envelope: shaped(0.02, 0.2, 0.3, 0.08),
        gain: 0.55,
        filters: [lowpass(1400, 450)],
      },
      thump(0, 72, 40, 0.22, 0.7),
    ],
  },
  'combat.attack.chain.orc': {
    seed: 603,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.2,
        frequencyHz: 5000,
        tremolo: { rateHz: 38, depth: 0.7 },
        envelope: shaped(0.002, 0.16, 0.1, 0.03),
        gain: 0.45,
        filters: [highpass(1200)],
      },
      {
        waveform: 'square',
        durationSec: 0.18,
        frequencyHz: 55,
        drive: 2,
        envelope: hit(0.16),
        gain: 0.3,
        filters: [lowpass(900)],
      },
      thump(0, 90, 50, 0.12, 0.4),
    ],
  },
  'combat.attack.frost.orc': {
    seed: 604,
    layers: [
      { ...thump(0, 190, 95, 0.14, 0.5), vibrato: { rateHz: 22, depth: 0.15 } },
      { ...thump(0.12, 150, 80, 0.14, 0.4), vibrato: { rateHz: 18, depth: 0.12 } },
      { ...burst(0, 0.25, 0.3, [lowpass(450)]), envelope: shaped(0.02, 0.2, 0, 0.03) },
    ],
  },
  'combat.impact.orc': {
    seed: 605,
    layers: [thump(0, 95, 48, 0.12, 0.8), burst(0, 0.04, 0.4, [lowpass(350)])],
  },
  'combat.build.orc': {
    seed: 606,
    layers: [
      ...drum(0, 0.8),
      ...drum(0.14, 0.75),
      burst(0.26, 0.03, 0.35, [bandpass(800, undefined, 2)]),
      thump(0.26, 200, 120, 0.07, 0.35),
    ],
  },
  'combat.creep_death.orc': {
    seed: 607,
    layers: [
      {
        waveform: 'saw',
        durationSec: 0.2,
        frequencyHz: 160,
        frequencyEndHz: 85,
        drive: 1.5,
        envelope: shaped(0.01, 0.15, 0.2, 0.04),
        gain: 0.5,
        filters: [bandpass(700, undefined, 2)],
      },
      thump(0.05, 85, 45, 0.15, 0.5),
    ],
  },

  // Grunt: a hoarse throat over meaty thuds.
  'combat.creep.orc_grunt.hit': {
    seed: 611,
    layers: [
      thump(0, 120, 58, 0.09, 0.8),
      burst(0, 0.05, 0.45, [lowpass(600)]),
      { ...bark(0.01, 0.07, 190, 150, 0.25), envelope: hit(0.06) },
    ],
  },
  'combat.creep.orc_grunt.death': {
    seed: 612,
    layers: [
      {
        ...bark(0, 0.5, 150, 68, 0.55),
        vibrato: { rateHz: 7, depth: 0.04 },
        envelope: shaped(0.03, 0.35, 0.3, 0.12),
        filters: [bandpass(900, 380, 2.2)],
      },
      breath(0, 0.45, 0.22),
      thump(0.38, 95, 42, 0.16, 0.6),
    ],
  },
  'combat.creep.orc_grunt.escape': {
    seed: 613,
    layers: [bark(0, 0.12, 210, 175, 0.55), bark(0.15, 0.16, 240, 190, 0.6), ...drum(0, 0.35)],
  },
  'combat.creep.orc_grunt.spawn': {
    seed: 614,
    layers: [bark(0, 0.18, 170, 230, 0.6), breath(0, 0.16, 0.15), ...drum(0.04, 0.6)],
  },

  // Spear Watchtower: a heavy shaft whooshing out and a wooden snap.
  'combat.tower.orc_spear_watchtower.attack': {
    seed: 621,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.18,
        frequencyHz: WHITE,
        envelope: shaped(0.07, 0.08, 0, 0.03),
        gain: 0.5,
        filters: [bandpass(500, 2200, 1.6)],
      },
      woodSnap(0, 0.35),
      thump(0, 170, 110, 0.05, 0.3),
    ],
  },
  'combat.tower.orc_spear_watchtower.impact': {
    seed: 622,
    layers: [
      woodSnap(0, 0.55),
      woodSnap(0.025, 0.3),
      thump(0, 140, 65, 0.11, 0.65),
      burst(0, 0.03, 0.3, [lowpass(500)]),
    ],
  },
  ...ORC_EARLY_CREATURE_RECIPES,
  ...ORC_LATE_CREATURE_RECIPES,
  ...ORC_TOWER_RECIPES,
};
