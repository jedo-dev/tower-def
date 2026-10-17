import type { OrcSoundId } from '../../../types/sound-ids';
import { WHITE, bandpass, burst, highpass, hit, lowpass, shaped, thump } from './recipeKit';
import { spark, type OrcRecipes } from './orcRecipeKit';

type NewOrcTowerId = 'orc_burning_pit' | 'orc_lightning_totem' | 'orc_tar_pit';

/** Fire, storm and tar: the orc towers after the Spear Watchtower. */
export const ORC_TOWER_RECIPES: OrcRecipes<
  Extract<OrcSoundId, `combat.tower.${NewOrcTowerId}.${string}`>
> = {
  // Burning Pit: a fire whoomp and a crackling splash.
  'combat.tower.orc_burning_pit.attack': {
    seed: 623,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.19,
        frequencyHz: WHITE,
        drive: 1.6,
        envelope: shaped(0.04, 0.1, 0.2, 0.05),
        gain: 0.6,
        filters: [lowpass(260, 1700)],
      },
      thump(0.01, 70, 38, 0.17, 0.75),
    ],
  },
  'combat.tower.orc_burning_pit.impact': {
    seed: 624,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.16,
        frequencyHz: 1700,
        tremolo: { rateHz: 53, depth: 0.85 },
        envelope: hit(0.15),
        gain: 0.5,
        filters: [bandpass(2300, 1400, 1.3)],
      },
      { ...burst(0, 0.1, 0.45, [lowpass(600, 250)]), envelope: shaped(0.01, 0.08, 0, 0.01) },
      thump(0, 95, 50, 0.08, 0.4),
    ],
  },

  // Lightning Totem: a charged hum snapping into a thunder crack.
  'combat.tower.orc_lightning_totem.attack': {
    seed: 625,
    layers: [
      {
        waveform: 'square',
        durationSec: 0.09,
        frequencyHz: 98,
        frequencyEndHz: 140,
        tremolo: { rateHz: 60, depth: 0.4 },
        envelope: shaped(0.06, 0, 1, 0.01),
        gain: 0.3,
        filters: [lowpass(1200)],
      },
      { ...burst(0.08, 0.05, 0.7, [highpass(900)]), envelope: hit(0.045, 0.001) },
      spark(0.085, 0.1, 0.4),
      thump(0.08, 85, 40, 0.11, 0.6),
    ],
  },
  'combat.tower.orc_lightning_totem.impact': {
    seed: 626,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.15,
        frequencyHz: WHITE,
        tremolo: { rateHz: 70, depth: 0.7 },
        envelope: shaped(0.002, 0.05, 0.3, 0.08),
        gain: 0.5,
        filters: [highpass(3200)],
      },
      spark(0, 0.08, 0.35),
      thump(0, 110, 60, 0.06, 0.35),
    ],
  },

  // Tar Pit: a thick glug and a sticky splat.
  'combat.tower.orc_tar_pit.attack': {
    seed: 627,
    layers: [
      { ...thump(0, 140, 70, 0.11, 0.6), vibrato: { rateHz: 15, depth: 0.18 } },
      { ...thump(0.07, 115, 58, 0.11, 0.55), vibrato: { rateHz: 12, depth: 0.15 } },
      { ...burst(0, 0.18, 0.3, [lowpass(380)]), envelope: shaped(0.03, 0.12, 0, 0.03) },
    ],
  },
  'combat.tower.orc_tar_pit.impact': {
    seed: 628,
    layers: [
      { ...burst(0, 0.1, 0.55, [lowpass(1100, 260)], 4000), envelope: hit(0.09, 0.002) },
      thump(0, 105, 48, 0.09, 0.6),
      { ...thump(0.06, 320, 150, 0.05, 0.3), envelope: hit(0.045, 0.004) },
    ],
  },
};
