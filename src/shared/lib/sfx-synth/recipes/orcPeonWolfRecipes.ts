import { thump } from './recipeKit';
import { clank, footfall, type OrcCreatureRecipes } from './orcRecipeKit';
import { at, jawSnap, scuff, sing, type VoiceTimbre, type Vowel } from './orcVoices';

/**
 * Peon: a lazy, nasal, slightly whiny orc (F0 120-185 Hz). Every vowel keeps
 * the nasal murmur at 250 Hz and a strong nasal band near 1 kHz.
 */
const PEON_HUM: Vowel = [
  { hz: 250, q: 3, gain: 1 },
  { hz: 560, q: 3, gain: 0.15 },
  { hz: 1000, q: 5, gain: 0.9 },
  { hz: 2400, q: 6, gain: 0.6 },
];
const PEON_UH: Vowel = [
  { hz: 250, q: 3, gain: 0.8 },
  { hz: 600, q: 3, gain: 1 },
  { hz: 1050, q: 5, gain: 2 },
  { hz: 2400, q: 6, gain: 2 },
];
const PEON_EH: Vowel = [
  { hz: 250, q: 3, gain: 0.7 },
  { hz: 520, q: 3, gain: 0.9 },
  { hz: 1700, q: 5, gain: 2.4 },
  { hz: 2450, q: 6, gain: 2.4 },
];
const PEON_OH: Vowel = [
  { hz: 250, q: 3, gain: 0.8 },
  { hz: 480, q: 3, gain: 1 },
  { hz: 900, q: 5, gain: 1.8 },
  { hz: 2400, q: 6, gain: 1.2 },
];

const PEON_VOICE: VoiceTimbre = {
  source: 'saw',
  drive: 0.3,
  vibrato: { rateHz: 4.5, depth: 0.012 },
  breath: 0.12,
  rasp: 0.1,
  lowpassHz: 3200,
  attackSec: 0.02,
  releaseSec: 0.06,
};

const PEON: OrcCreatureRecipes<'orc_peon'> = {
  // "Ugh": a short nasal grunt over a tool clank.
  'combat.creep.orc_peon.hit': {
    seed: 631,
    layers: [
      ...sing(
        0.005,
        [at(0, 165, 1, PEON_UH), at(0.085, 125, 0.5, PEON_UH)],
        { ...PEON_VOICE, attackSec: 0.008, releaseSec: 0.03 },
        0.7,
      ),
      clank(0, 820, 0.06, 0.22),
      thump(0, 150, 85, 0.06, 0.45),
    ],
  },
  // Whiny "eh-oh" falling into a groan, then the tools clatter down.
  'combat.creep.orc_peon.death': {
    seed: 632,
    layers: [
      ...sing(
        0,
        [
          at(0, 185, 1, PEON_EH),
          at(0.12, 175, 0.95, PEON_EH),
          at(0.36, 130, 0.7, PEON_UH),
          at(0.54, 95, 0.3, PEON_OH),
        ],
        { ...PEON_VOICE, vibrato: { rateHz: 5.5, depth: 0.025 } },
        0.8,
      ),
      clank(0.5, 880, 0.12, 0.25),
      clank(0.56, 740, 0.1, 0.18),
      thump(0.52, 140, 70, 0.1, 0.4),
    ],
  },
  // Two-syllable grumble ("mm-uh, mm-oh") while the feet shuffle off.
  'combat.creep.orc_peon.escape': {
    seed: 633,
    layers: [
      ...sing(
        0,
        [at(0, 150, 0.7, PEON_HUM), at(0.05, 150, 1, PEON_UH), at(0.16, 128, 0.4, PEON_UH)],
        PEON_VOICE,
        0.7,
      ),
      ...sing(
        0.22,
        [at(0, 140, 0.7, PEON_HUM), at(0.05, 138, 1, PEON_OH), at(0.2, 112, 0.3, PEON_HUM)],
        PEON_VOICE,
        0.7,
      ),
      ...[0.04, 0.18, 0.32, 0.46].map((startSec) => scuff(startSec, 0.08, 0.22)),
    ],
  },
  // Lazy "hmm?": a drawn-out hum lifting into a question, with pick-axe taps.
  'combat.creep.orc_peon.spawn': {
    seed: 634,
    layers: [
      clank(0, 940, 0.08, 0.25),
      ...sing(
        0.04,
        [
          at(0, 118, 0.6, PEON_HUM),
          at(0.22, 122, 0.8, PEON_HUM),
          at(0.4, 170, 1, PEON_UH),
          at(0.5, 180, 0.5, PEON_UH),
        ],
        { ...PEON_VOICE, attackSec: 0.06 },
        0.75,
      ),
      clank(0.52, 880, 0.08, 0.22),
    ],
  },
};

/** Wolf: barks, yelps and a sung howl (F0 350-500 Hz); the rider stays quiet. */
const WOLF_OO: Vowel = [
  { hz: 450, q: 1.5, gain: 1 },
  { hz: 900, q: 2.5, gain: 0.6 },
  { hz: 1500, q: 3, gain: 0.3 },
];
const WOLF_OW: Vowel = [
  { hz: 650, q: 1.5, gain: 1 },
  { hz: 1150, q: 2.5, gain: 0.7 },
  { hz: 1800, q: 3, gain: 0.35 },
];
const WOLF_BARK: Vowel = [
  { hz: 700, q: 2, gain: 1 },
  { hz: 1400, q: 3, gain: 1.5 },
  { hz: 2600, q: 4, gain: 1 },
];
const WOLF_YIP: Vowel = [
  { hz: 800, q: 2, gain: 1 },
  { hz: 1700, q: 3, gain: 1.2 },
  { hz: 2800, q: 4, gain: 0.8 },
];
const WOLF_GROWL: Vowel = [
  { hz: 400, q: 2, gain: 1 },
  { hz: 900, q: 2.5, gain: 1.5 },
  { hz: 1800, q: 3, gain: 1 },
];
const ORC_AH: Vowel = [
  { hz: 700, q: 2.5, gain: 1 },
  { hz: 1150, q: 3, gain: 1.5 },
  { hz: 2500, q: 4, gain: 1.2 },
];

const HOWL_VOICE: VoiceTimbre = {
  source: 'triangle',
  vibrato: { rateHz: 5, depth: 0.018 },
  breath: 0.08,
  lowpassHz: 2500,
  attackSec: 0.12,
  releaseSec: 0.25,
};
const BARK_VOICE: VoiceTimbre = {
  source: 'saw',
  drive: 0.8,
  breath: 0.35,
  rasp: 0.3,
  lowpassHz: 3500,
  attackSec: 0.004,
  releaseSec: 0.02,
};
const GROWL_VOICE: VoiceTimbre = {
  source: 'saw',
  drive: 0.6,
  tremolo: { rateHz: 27, depth: 0.6 },
  breath: 0.2,
  rasp: 0.6,
  subharmonic: 0.4,
  lowpassHz: 2400,
  attackSec: 0.05,
  releaseSec: 0.04,
};
const RIDER_VOICE: VoiceTimbre = {
  source: 'saw',
  drive: 1.2,
  rasp: 0.3,
  lowpassHz: 3000,
  attackSec: 0.02,
  releaseSec: 0.08,
};

/** Gallop: paws landing in threes. */
function gallop(startSec: number, strides: number, gain: number): ReturnType<typeof footfall> {
  return Array.from({ length: strides }, (_, stride) => startSec + stride * 0.3).flatMap(
    (strideSec) => [0, 0.06, 0.12].flatMap((offset) => footfall(strideSec + offset, gain, 150)),
  );
}

const WOLF_RIDER: OrcCreatureRecipes<'orc_wolf_rider'> = {
  // A sharp bark that ends in snapping jaws.
  'combat.creep.orc_wolf_rider.hit': {
    seed: 641,
    layers: [
      ...sing(0, [at(0, 520, 1, WOLF_BARK), at(0.055, 380, 0.4, WOLF_BARK)], BARK_VOICE, 0.8),
      ...jawSnap(0.06, 0.5),
      thump(0, 140, 72, 0.06, 0.35),
    ],
  },
  // A yelp that slides into a sobbing whimper, then the body drops.
  'combat.creep.orc_wolf_rider.death': {
    seed: 642,
    layers: [
      ...sing(
        0,
        [at(0, 900, 1, WOLF_YIP), at(0.06, 1150, 1, WOLF_YIP), at(0.17, 800, 0.6, WOLF_YIP)],
        { ...BARK_VOICE, drive: 0.4, breath: 0.15, rasp: 0, releaseSec: 0.04 },
        0.8,
      ),
      ...sing(
        0.15,
        [at(0, 720, 0.6, WOLF_OO), at(0.3, 620, 0.45, WOLF_OO), at(0.45, 520, 0.15, WOLF_OO)],
        { ...HOWL_VOICE, tremolo: { rateHz: 8, depth: 0.7 }, attackSec: 0.04, releaseSec: 0.1 },
        0.7,
      ),
      ...footfall(0.04, 0.2),
      thump(0.52, 110, 50, 0.12, 0.35),
    ],
  },
  // The full howl, rising then falling, over a gallop.
  'combat.creep.orc_wolf_rider.escape': {
    seed: 643,
    layers: [
      ...sing(
        0.04,
        [
          at(0, 360, 0.6, WOLF_OO),
          at(0.22, 470, 1, WOLF_OW),
          at(0.5, 500, 0.95, WOLF_OW),
          at(0.84, 380, 0.4, WOLF_OO),
        ],
        HOWL_VOICE,
        0.9,
      ),
      ...gallop(0, 3, 0.2),
    ],
  },
  // Low growl into a short howl; the rider's war cry sits underneath.
  'combat.creep.orc_wolf_rider.spawn': {
    seed: 644,
    layers: [
      ...sing(0, [at(0, 85, 0.8, WOLF_GROWL), at(0.3, 95, 1, WOLF_GROWL)], GROWL_VOICE, 1.1),
      ...sing(
        0.28,
        [at(0, 380, 0.6, WOLF_OO), at(0.18, 480, 1, WOLF_OW), at(0.55, 420, 0.35, WOLF_OO)],
        { ...HOWL_VOICE, attackSec: 0.08, releaseSec: 0.2 },
        0.85,
      ),
      ...sing(
        0.36,
        [at(0, 170, 0.8, ORC_AH), at(0.08, 215, 1, ORC_AH), at(0.25, 190, 0.4, ORC_AH)],
        RIDER_VOICE,
        0.16,
      ),
    ],
  },
};

export const ORC_PEON_WOLF_RECIPES = { ...PEON, ...WOLF_RIDER };
