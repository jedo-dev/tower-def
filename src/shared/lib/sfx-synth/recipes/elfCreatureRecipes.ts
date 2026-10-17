import type { ElfSoundId } from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';
import { NOTE, bell, burst, highpass, hit, lowpass, thump } from './recipeKit';
import {
  acidHiss,
  bowstring,
  breath,
  glaiveWhirr,
  knock,
  leaves,
  rockGrind,
  screech,
  sparkle,
  stomp,
  voice,
  windChime,
  wingbeat,
} from './elfVoices';

type ElfCreatureSoundId = Extract<ElfSoundId, `combat.creep.${string}`>;

/** Soft elven cry: a clean triangle voice, high and breathy. */
const CRY = { formantHz: 1100, waveform: 'triangle' } as const;
/** Panther: a purring, rough mid growl. */
const PANTHER = { formantHz: 650, drive: 1.6, roughHz: 27 } as const;
/** Chimera heads: two driven roars a fourth apart. */
const CHIMERA_LOW = { formantHz: 520, drive: 2.4, roughHz: 19 } as const;
const CHIMERA_HIGH = { formantHz: 700, drive: 2, roughHz: 23 } as const;
/** Bear: a deep, very driven roar. */
const BEAR = { formantHz: 420, drive: 2.8, roughHz: 15 } as const;

/** Elf creatures: tier 1 is light and airy, tier 6 is stone and rumble. */
export const ELF_CREATURE_RECIPES: Record<ElfCreatureSoundId, SfxRecipe> = {
  // Archer: bowstring, leaves and a soft cry.
  'combat.creep.elf_archer.hit': {
    seed: 811,
    layers: [
      thump(0, 280, 180, 0.06, 0.6),
      leaves(0, 0.06, 0.3),
      { ...voice(0.005, 0.07, 640, 560, 0.25, CRY), envelope: hit(0.06) },
    ],
  },
  'combat.creep.elf_archer.death': {
    seed: 812,
    layers: [
      voice(0, 0.38, 660, 330, 0.55, CRY),
      breath(0, 0.34, 0.15, 1800),
      leaves(0.2, 0.22, 0.25),
      bowstring(0.3, 196, 0.3),
    ],
  },
  'combat.creep.elf_archer.escape': {
    seed: 813,
    layers: [
      bowstring(0, 294, 0.4),
      bowstring(0.12, 349, 0.4),
      voice(0.18, 0.18, 520, 700, 0.4, CRY),
      leaves(0, 0.3, 0.18),
    ],
  },
  'combat.creep.elf_archer.spawn': {
    seed: 814,
    layers: [
      leaves(0, 0.24, 0.35),
      { ...bowstring(0.12, 220, 0.35), frequencyEndHz: 262 },
      voice(0.16, 0.18, 590, 690, 0.35, CRY),
    ],
  },

  // Wisp: airy sparkle, bell-like, and a pop when it dies.
  'combat.creep.elf_wisp.hit': {
    seed: 821,
    loudness: 0.16,
    layers: [
      bell(NOTE.A6, 0, 0.07, 0.35, { ratio: 3.5, index: 0.7 }),
      burst(0, 0.04, 0.25, [highpass(4500)]),
    ],
  },
  'combat.creep.elf_wisp.death': {
    seed: 822,
    layers: [
      thump(0, 900, 180, 0.05, 0.7),
      burst(0, 0.02, 0.5, [highpass(1500)]),
      ...sparkle(0.04, [NOTE.A6, NOTE.F6, NOTE.D6, NOTE.A5], 0.06, 0.3),
    ],
  },
  'combat.creep.elf_wisp.escape': {
    seed: 823,
    layers: [
      bell(NOTE.D6, 0, 0.3, 0.35, { ratio: 2, index: 0.6, attackSec: 0.02 }),
      bell(NOTE.A6, 0.12, 0.26, 0.3, { ratio: 2, index: 0.6, attackSec: 0.02 }),
      ...sparkle(0.05, [NOTE.E6, NOTE.A6], 0.08, 0.15),
    ],
  },
  'combat.creep.elf_wisp.spawn': {
    seed: 824,
    layers: [
      ...sparkle(0, [NOTE.D6, NOTE.F6, NOTE.A6], 0.06, 0.25),
      {
        waveform: 'sine',
        durationSec: 0.32,
        frequencyHz: NOTE.A5,
        vibrato: { rateHz: 9, depth: 0.01 },
        envelope: { attackSec: 0.12, decaySec: 0.1, sustainLevel: 0.4, releaseSec: 0.08 },
        gain: 0.25,
      },
    ],
  },

  // Huntress: glaive whirr and a panther growl.
  'combat.creep.elf_huntress.hit': {
    seed: 831,
    layers: [
      thump(0, 190, 95, 0.07, 0.6),
      { ...voice(0, 0.07, 150, 120, 0.4, PANTHER), envelope: hit(0.06) },
      bell(1400, 0, 0.05, 0.12, { ratio: 1.41, index: 1.2 }),
    ],
  },
  'combat.creep.elf_huntress.death': {
    seed: 832,
    layers: [
      voice(0, 0.42, 140, 70, 0.6, PANTHER),
      breath(0, 0.36, 0.15, 900),
      bell(980, 0.32, 0.16, 0.18, { ratio: 1.41, index: 1.5 }),
      thump(0.32, 120, 60, 0.12, 0.4),
    ],
  },
  'combat.creep.elf_huntress.escape': {
    seed: 833,
    layers: [...glaiveWhirr(0, 0.28, 0.35), voice(0.16, 0.22, 120, 150, 0.7, PANTHER)],
  },
  'combat.creep.elf_huntress.spawn': {
    seed: 834,
    layers: [voice(0, 0.24, 110, 160, 0.5, PANTHER), ...glaiveWhirr(0.12, 0.24, 0.35)],
  },

  // Dryad: hooves, wind chimes and leaves.
  'combat.creep.elf_dryad.hit': {
    seed: 841,
    layers: [...knock(0, 340, 0.55), leaves(0, 0.05, 0.25), windChime(NOTE.D6, 0.01, 0.07, 0.28)],
  },
  'combat.creep.elf_dryad.death': {
    seed: 842,
    layers: [
      ...knock(0, 320, 0.5),
      ...knock(0.1, 290, 0.45),
      ...knock(0.24, 250, 0.4),
      windChime(NOTE.D6, 0.05, 0.3, 0.25),
      windChime(NOTE.A5, 0.15, 0.3, 0.22),
      windChime(NOTE.F4, 0.25, 0.3, 0.25),
      leaves(0.15, 0.3, 0.1),
    ],
  },
  'combat.creep.elf_dryad.escape': {
    seed: 843,
    layers: [
      ...knock(0, 360, 0.45),
      ...knock(0.08, 340, 0.4),
      ...knock(0.16, 360, 0.45),
      ...knock(0.24, 340, 0.4),
      windChime(NOTE.A5, 0.1, 0.28, 0.22),
      windChime(NOTE.E6, 0.18, 0.22, 0.18),
    ],
  },
  'combat.creep.elf_dryad.spawn': {
    seed: 844,
    layers: [
      leaves(0, 0.26, 0.3),
      windChime(NOTE.D5, 0.06, 0.3, 0.22),
      windChime(NOTE.A5, 0.12, 0.26, 0.2),
      windChime(NOTE.D6, 0.18, 0.2, 0.16),
      ...knock(0.2, 340, 0.4),
      ...knock(0.28, 320, 0.35),
    ],
  },

  // Chimera: two-headed roar, acid hiss and heavy leather wings.
  'combat.creep.elf_chimera.hit': {
    seed: 851,
    layers: [
      thump(0, 115, 55, 0.09, 0.75),
      burst(0, 0.04, 0.35, [lowpass(500)]),
      acidHiss(0.01, 0.08, 0.14),
    ],
  },
  'combat.creep.elf_chimera.death': {
    seed: 852,
    layers: [
      voice(0, 0.48, 125, 58, 0.5, CHIMERA_LOW),
      voice(0.04, 0.44, 168, 80, 0.4, CHIMERA_HIGH),
      acidHiss(0.05, 0.4, 0.1),
      wingbeat(0.36, 0.4, 700),
      thump(0.44, 85, 40, 0.12, 0.5),
    ],
  },
  'combat.creep.elf_chimera.escape': {
    seed: 853,
    layers: [
      wingbeat(0, 0.55, 750),
      wingbeat(0.14, 0.55, 750),
      wingbeat(0.28, 0.5, 750),
      voice(0.06, 0.22, 140, 125, 0.4, CHIMERA_LOW),
      voice(0.08, 0.2, 188, 168, 0.32, CHIMERA_HIGH),
    ],
  },
  'combat.creep.elf_chimera.spawn': {
    seed: 854,
    layers: [
      voice(0, 0.3, 100, 140, 0.5, CHIMERA_LOW),
      voice(0.03, 0.28, 134, 188, 0.4, CHIMERA_HIGH),
      acidHiss(0.1, 0.22, 0.1),
      wingbeat(0.24, 0.5, 700),
      wingbeat(0.36, 0.45, 700),
    ],
  },

  // Druid of the Claw: a bear roar and a deep wooden thump.
  'combat.creep.elf_druid_of_the_claw.hit': {
    seed: 861,
    layers: [...knock(0, 105, 0.8), { ...voice(0, 0.08, 95, 80, 0.3, BEAR), envelope: hit(0.07) }],
  },
  'combat.creep.elf_druid_of_the_claw.death': {
    seed: 862,
    layers: [voice(0, 0.46, 96, 48, 0.65, BEAR), breath(0, 0.4, 0.18, 600), ...knock(0.4, 90, 0.7)],
  },
  'combat.creep.elf_druid_of_the_claw.escape': {
    seed: 863,
    layers: [
      breath(0, 0.12, 0.4, 500),
      { ...voice(0, 0.12, 88, 78, 0.35, BEAR), envelope: hit(0.11) },
      breath(0.18, 0.14, 0.4, 500),
      { ...voice(0.18, 0.14, 92, 80, 0.35, BEAR), envelope: hit(0.13) },
      ...knock(0.1, 110, 0.55),
      ...knock(0.3, 100, 0.55),
    ],
  },
  'combat.creep.elf_druid_of_the_claw.spawn': {
    seed: 864,
    layers: [voice(0, 0.32, 70, 108, 0.65, BEAR), ...knock(0.3, 100, 0.7)],
  },

  // Hippogryph: hawk screech and feathery wingbeats.
  'combat.creep.elf_hippogryph.hit': {
    seed: 871,
    layers: [
      thump(0, 170, 95, 0.07, 0.55),
      { ...wingbeat(0, 0.3, 2600), durationSec: 0.07 },
      { ...screech(0.01, 0.06, 1500, 1300, 0.18), envelope: hit(0.05) },
    ],
  },
  'combat.creep.elf_hippogryph.death': {
    seed: 872,
    layers: [
      screech(0, 0.36, 1900, 820, 0.6),
      wingbeat(0.2, 0.4, 3000),
      wingbeat(0.32, 0.3, 2800),
      thump(0.4, 120, 60, 0.12, 0.45),
    ],
  },
  'combat.creep.elf_hippogryph.escape': {
    seed: 873,
    layers: [
      screech(0, 0.14, 1700, 2100, 0.5),
      screech(0.18, 0.16, 1800, 2200, 0.5),
      wingbeat(0.05, 0.4, 3200),
      wingbeat(0.2, 0.35, 3200),
    ],
  },
  'combat.creep.elf_hippogryph.spawn': {
    seed: 874,
    layers: [
      wingbeat(0, 0.5, 3000),
      wingbeat(0.1, 0.5, 3000),
      wingbeat(0.2, 0.45, 3000),
      screech(0.16, 0.22, 1400, 2100, 0.6),
    ],
  },

  // Mountain Giant: grinding rock, massive stomps and a low rumble.
  'combat.creep.elf_mountain_giant.hit': {
    seed: 881,
    layers: [thump(0, 78, 40, 0.09, 0.8), burst(0, 0.05, 0.45, [lowpass(1200)], 1100)],
  },
  'combat.creep.elf_mountain_giant.death': {
    seed: 882,
    layers: [
      rockGrind(0, 0.34, 0.5),
      ...stomp(0.26, 0.85),
      {
        waveform: 'sine',
        startSec: 0.26,
        durationSec: 0.32,
        frequencyHz: 46,
        frequencyEndHz: 34,
        tremolo: { rateHz: 13, depth: 0.4 },
        envelope: { attackSec: 0.03, decaySec: 0.12, sustainLevel: 0.5, releaseSec: 0.16 },
        gain: 0.55,
      },
      { ...burst(0.26, 0.3, 0.3, [lowpass(180)]), envelope: hit(0.28, 0.02) },
    ],
  },
  'combat.creep.elf_mountain_giant.escape': {
    seed: 883,
    layers: [...stomp(0, 0.8), ...stomp(0.24, 0.85), rockGrind(0.04, 0.4, 0.35)],
  },
  'combat.creep.elf_mountain_giant.spawn': {
    seed: 884,
    layers: [rockGrind(0, 0.3, 0.5), ...stomp(0.22, 0.9)],
  },
};
