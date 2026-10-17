import type { ElfSoundId } from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';
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
import { bowstring, droplet } from './elfVoices';

type ElfTowerSoundId = Extract<ElfSoundId, `combat.tower.${string}`>;

/** Elf towers: moonlit bows, spore chimes, cold water and thorns. */
export const ELF_TOWER_RECIPES: Record<ElfTowerSoundId, SfxRecipe> = {
  // Moon Archer Tower: a silvery bow and a bright arrow strike.
  'combat.tower.elf_moon_archer_tower.attack': {
    seed: 891,
    layers: [
      { ...bowstring(0, 330, 0.45), durationSec: 0.16, envelope: hit(0.15) },
      bell(NOTE.D6, 0, 0.16, 0.14, { ratio: 3.5, index: 0.8, attackSec: 0.004 }),
      {
        ...burst(0.02, 0.12, 0.22, [bandpass(4200, 2600, 1.4)]),
        envelope: shaped(0.03, 0.08, 0, 0.01),
      },
    ],
  },
  'combat.tower.elf_moon_archer_tower.impact': {
    seed: 892,
    layers: [
      burst(0, 0.02, 0.45, [highpass(2500)], 12000),
      bell(NOTE.E6, 0, 0.09, 0.3, { ratio: 3.5, index: 2 }),
      thump(0, 260, 170, 0.04, 0.3),
    ],
  },

  // Wisp Bloom: soft chimes and a spore puff.
  'combat.tower.elf_wisp_bloom.attack': {
    seed: 893,
    layers: [
      bell(NOTE.D6, 0, 0.16, 0.28, { ratio: 2, index: 0.5, attackSec: 0.012 }),
      bell(NOTE.A5, 0.03, 0.15, 0.22, { ratio: 2, index: 0.5, attackSec: 0.012 }),
      {
        waveform: 'noise',
        startSec: 0.04,
        durationSec: 0.14,
        frequencyHz: WHITE,
        envelope: shaped(0.03, 0.08, 0, 0.02),
        gain: 0.3,
        filters: [bandpass(900, 1600, 1)],
      },
    ],
  },
  'combat.tower.elf_wisp_bloom.impact': {
    seed: 894,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.14,
        frequencyHz: WHITE,
        envelope: shaped(0.015, 0.1, 0, 0.02),
        gain: 0.45,
        filters: [lowpass(1300, 600)],
      },
      thump(0, 420, 160, 0.05, 0.35),
      bell(NOTE.A5, 0.02, 0.1, 0.12, { ratio: 2, index: 0.4 }),
    ],
  },

  // Moonwell: a water ripple and a cold chime (the slow).
  'combat.tower.elf_moonwell.attack': {
    seed: 895,
    layers: [
      { ...droplet(0, 420, 780, 0.4), vibrato: { rateHz: 18, depth: 0.04 } },
      { ...droplet(0.05, 520, 940, 0.3), vibrato: { rateHz: 18, depth: 0.04 } },
      bell(NOTE.C6, 0.06, 0.13, 0.28, { ratio: 2, index: 0.4, attackSec: 0.008 }),
      bell(NOTE.G6, 0.08, 0.11, 0.14, { ratio: 2, index: 0.3, attackSec: 0.008 }),
    ],
  },
  'combat.tower.elf_moonwell.impact': {
    seed: 896,
    layers: [
      droplet(0, 900, 1500, 0.35),
      bell(NOTE.G6, 0.01, 0.12, 0.3, { ratio: 1.5, index: 0.6 }),
      { ...burst(0, 0.1, 0.15, [highpass(6500)], 9000), envelope: shaped(0.01, 0.08, 0, 0.01) },
    ],
  },

  // Thorn Spire: a root snap and a thorny crunch.
  'combat.tower.elf_thorn_spire.attack': {
    seed: 897,
    layers: [
      burst(0, 0.03, 0.5, [bandpass(1400, undefined, 2.2)], 3200),
      burst(0.02, 0.02, 0.35, [bandpass(2200, undefined, 2.5)], 5000),
      {
        waveform: 'saw',
        durationSec: 0.14,
        frequencyHz: 95,
        frequencyEndHz: 70,
        drive: 1.2,
        envelope: hit(0.13, 0.01),
        gain: 0.3,
        filters: [lowpass(700)],
      },
    ],
  },
  'combat.tower.elf_thorn_spire.impact': {
    seed: 898,
    layers: [
      burst(0, 0.05, 0.5, [bandpass(2500, 1600, 1.6)], 2600),
      burst(0.03, 0.04, 0.4, [bandpass(1900, undefined, 1.8)], 2200),
      thump(0, 150, 80, 0.07, 0.4),
    ],
  },
};
