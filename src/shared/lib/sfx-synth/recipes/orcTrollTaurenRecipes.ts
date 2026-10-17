import { bandpass, burst, thump } from './recipeKit';
import { type OrcCreatureRecipes } from './orcRecipeKit';
import { at, bubbles, hoof, sing, snort, type VoiceTimbre, type Vowel } from './orcVoices';

/**
 * Troll: a hoarse, nasal, human-like voice (F0 150-255 Hz) with a cackling,
 * sing-song delivery. Every vowel keeps a nasal murmur at 260 Hz.
 */
const TROLL_AH: Vowel = [
  { hz: 260, q: 3, gain: 0.5 },
  { hz: 750, q: 4, gain: 1 },
  { hz: 1250, q: 5, gain: 1.6 },
  { hz: 2550, q: 6, gain: 1.6 },
];
const TROLL_EH: Vowel = [
  { hz: 260, q: 3, gain: 0.4 },
  { hz: 550, q: 4, gain: 1 },
  { hz: 1850, q: 5, gain: 2 },
  { hz: 2550, q: 6, gain: 1.8 },
];
const TROLL_IY: Vowel = [
  { hz: 260, q: 3, gain: 0.4 },
  { hz: 320, q: 4, gain: 0.8 },
  { hz: 2200, q: 5, gain: 2 },
  { hz: 2900, q: 6, gain: 1.6 },
];
const TROLL_OH: Vowel = [
  { hz: 260, q: 3, gain: 0.5 },
  { hz: 500, q: 4, gain: 1 },
  { hz: 900, q: 5, gain: 1.6 },
  { hz: 2450, q: 6, gain: 1.2 },
];
const TROLL_MM: Vowel = [
  { hz: 260, q: 3, gain: 1 },
  { hz: 320, q: 4, gain: 0.3 },
  { hz: 1000, q: 5, gain: 0.6 },
  { hz: 2400, q: 6, gain: 0.4 },
];

const TROLL_VOICE: VoiceTimbre = {
  source: 'saw',
  drive: 0.4,
  vibrato: { rateHz: 6, depth: 0.015 },
  tremolo: { rateHz: 31, depth: 0.15 },
  breath: 0.3,
  rasp: 0.35,
  lowpassHz: 3400,
  attackSec: 0.015,
  releaseSec: 0.04,
};
/** One "heh" or "hah" of a laugh: breathy, quick. */
const LAUGH_PULSE: VoiceTimbre = {
  ...TROLL_VOICE,
  breath: 0.5,
  attackSec: 0.005,
  releaseSec: 0.025,
};

function laughPulse(startSec: number, fromHz: number, toHz: number, vowel: Vowel, gain: number) {
  return sing(startSec, [at(0, fromHz, 1, vowel), at(0.065, toHz, 0.5, vowel)], LAUGH_PULSE, gain);
}

const TROLL: OrcCreatureRecipes<'orc_troll'> = {
  // Hoarse "hah!": an aspirated onset into a short falling vowel.
  'combat.creep.orc_troll.hit': {
    seed: 651,
    layers: [
      burst(0, 0.025, 0.3, [bandpass(1300, undefined, 1.2)]),
      ...sing(
        0.015,
        [at(0, 205, 1, TROLL_AH), at(0.08, 160, 0.3, TROLL_AH)],
        { ...TROLL_VOICE, attackSec: 0.006, releaseSec: 0.03 },
        0.75,
      ),
      thump(0, 150, 80, 0.05, 0.3),
    ],
  },
  // Three gurgling "hah"s collapsing into a bubbling groan.
  'combat.creep.orc_troll.death': {
    seed: 652,
    layers: [
      ...laughPulse(0, 220, 200, TROLL_AH, 0.7),
      ...laughPulse(0.1, 205, 185, TROLL_AH, 0.65),
      ...laughPulse(0.2, 190, 170, TROLL_AH, 0.6),
      ...sing(
        0.3,
        [at(0, 165, 0.9, TROLL_AH), at(0.15, 130, 0.7, TROLL_OH), at(0.34, 90, 0.2, TROLL_OH)],
        { ...TROLL_VOICE, tremolo: { rateHz: 14, depth: 0.5 } },
        0.7,
      ),
      ...bubbles(0.32, 6, 0.045, 260, 0.2),
      thump(0.58, 120, 55, 0.1, 0.4),
    ],
  },
  // Mocking "heh-heh-heh-heh", then the wet bubble of regeneration.
  'combat.creep.orc_troll.escape': {
    seed: 653,
    layers: [
      ...laughPulse(0, 230, 205, TROLL_EH, 0.7),
      ...laughPulse(0.1, 245, 215, TROLL_EH, 0.7),
      ...laughPulse(0.2, 235, 210, TROLL_EH, 0.7),
      ...laughPulse(0.3, 255, 220, TROLL_EH, 0.75),
      ...bubbles(0.42, 6, 0.035, 300, 0.25),
    ],
  },
  // Sing-song two-tone call, "ya-mon": a high rising "ya", a low falling "mon".
  'combat.creep.orc_troll.spawn': {
    seed: 654,
    layers: [
      ...sing(
        0,
        [at(0, 175, 0.6, TROLL_IY), at(0.06, 215, 1, TROLL_AH), at(0.2, 225, 0.7, TROLL_AH)],
        TROLL_VOICE,
        0.7,
      ),
      ...sing(
        0.26,
        [
          at(0, 185, 0.6, TROLL_MM),
          at(0.05, 175, 1, TROLL_OH),
          at(0.22, 158, 0.8, TROLL_OH),
          at(0.34, 150, 0.3, TROLL_MM),
        ],
        TROLL_VOICE,
        0.7,
      ),
    ],
  },
};

/** Tauren: a bovine "mooo" (F0 58-100 Hz, formants near 400 and 800 Hz). */
const TAUREN_MM: Vowel = [
  { hz: 250, q: 3, gain: 1 },
  { hz: 800, q: 4, gain: 0.3 },
  { hz: 1500, q: 4, gain: 0.15 },
];
const TAUREN_OO: Vowel = [
  { hz: 400, q: 3, gain: 1 },
  { hz: 800, q: 3.5, gain: 1.4 },
  { hz: 1500, q: 4, gain: 0.6 },
];
const TAUREN_OW: Vowel = [
  { hz: 450, q: 3, gain: 1 },
  { hz: 850, q: 3.5, gain: 1.5 },
  { hz: 1600, q: 4, gain: 0.7 },
];

const BELLOW_VOICE: VoiceTimbre = {
  source: 'saw',
  drive: 0.6,
  vibrato: { rateHz: 4.5, depth: 0.025 },
  breath: 0.1,
  rasp: 0.15,
  subharmonic: 0.35,
  lowpassHz: 1800,
  attackSec: 0.08,
  releaseSec: 0.25,
};

const TAUREN: OrcCreatureRecipes<'orc_tauren'> = {
  // A snort on a heavy hoof.
  'combat.creep.orc_tauren.hit': {
    seed: 691,
    layers: [...snort(0, 0.08, 0.7), ...hoof(0, 0.7)],
  },
  // A long "mooo" sinking away, then the body lands.
  'combat.creep.orc_tauren.death': {
    seed: 692,
    layers: [
      ...sing(
        0,
        [
          at(0, 98, 0.6, TAUREN_MM),
          at(0.12, 100, 1, TAUREN_OO),
          at(0.45, 85, 0.85, TAUREN_OW),
          at(0.78, 58, 0.2, TAUREN_OO),
        ],
        BELLOW_VOICE,
        0.8,
      ),
      ...hoof(0.7, 0.3),
    ],
  },
  // Two stomps and a bellow.
  'combat.creep.orc_tauren.escape': {
    seed: 693,
    layers: [
      ...hoof(0, 0.5),
      ...hoof(0.16, 0.5),
      ...sing(
        0.1,
        [
          at(0, 80, 0.6, TAUREN_MM),
          at(0.12, 92, 1, TAUREN_OO),
          at(0.4, 98, 0.9, TAUREN_OW),
          at(0.72, 82, 0.25, TAUREN_OO),
        ],
        BELLOW_VOICE,
        0.75,
      ),
    ],
  },
  // A chain of stomps under a rising bellow.
  'combat.creep.orc_tauren.spawn': {
    seed: 694,
    layers: [
      ...[0, 0.18, 0.36, 0.54].flatMap((startSec, index) => hoof(startSec, 0.5 - index * 0.05)),
      ...sing(
        0.05,
        [
          at(0, 70, 0.5, TAUREN_MM),
          at(0.15, 76, 0.9, TAUREN_OO),
          at(0.5, 96, 1, TAUREN_OW),
          at(0.78, 100, 0.35, TAUREN_OW),
        ],
        BELLOW_VOICE,
        0.75,
      ),
    ],
  },
};

export const ORC_TROLL_RECIPES = TROLL;
export const ORC_TAUREN_RECIPES = TAUREN;
