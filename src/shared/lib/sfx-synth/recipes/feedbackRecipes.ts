import type { SfxLayer, SfxRecipe } from '../sfxRecipe.types';
import { NOTE, WHITE, bandpass, bell, burst, hit, lowpass, shaped, thump } from './recipeKit';
import type { SfxRecipeGroup } from './recipeGroups';

/** Small coin: harmonic FM keeps the shine below the Nyquist limit. */
function coin(frequencyHz: number, startSec: number, gain: number): SfxLayer {
  return bell(frequencyHz, startSec, 0.11, gain, { ratio: 2.4, index: 1.2 });
}

function blip(frequencyHz: number, startSec: number): SfxLayer {
  return {
    waveform: 'sine',
    startSec,
    durationSec: 0.075,
    frequencyHz,
    envelope: hit(0.07, 0.004),
    gain: 0.5,
    filters: [lowpass(3000)],
  };
}

function twoBlips(firstHz: number, secondHz: number, seed: number): SfxRecipe {
  return {
    seed,
    layers: [
      blip(firstHz, 0),
      blip(secondHz, 0.085),
      { ...blip(firstHz * 2, 0), waveform: 'triangle', gain: 0.1 },
    ],
  };
}

export const SYSTEM_RECIPES: SfxRecipeGroup<'system'> = {
  'system.pause': twoBlips(660, NOTE.A4, 201),
  'system.unpause': twoBlips(NOTE.A4, 660, 202),
  'system.restart': {
    seed: 203,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.26,
        frequencyHz: WHITE,
        envelope: shaped(0.02, 0.1, 0.5, 0.12),
        gain: 0.5,
        filters: [bandpass(3000, 300)],
      },
      thump(0.18, 95, 48, 0.16, 0.8),
    ],
  },
};

export const ECONOMY_RECIPES: SfxRecipeGroup<'economy'> = {
  'economy.gold_gain': {
    seed: 301,
    loudness: 0.15,
    layers: [coin(NOTE.G6, 0, 0.4), coin(NOTE.A6, 0.035, 0.28)],
  },
  'economy.gold_spent': {
    seed: 302,
    layers: [
      coin(NOTE.D6, 0, 0.35),
      burst(0.01, 0.05, 0.4, [lowpass(900)]),
      thump(0.01, 160, 100, 0.06, 0.3),
    ],
  },
  'economy.refund': {
    seed: 303,
    layers: [
      coin(NOTE.D6, 0, 0.32),
      coin(NOTE.G6, 0.06, 0.32),
      burst(0, 0.12, 0.15, [bandpass(1500)]),
    ],
  },
  'economy.life_lost': {
    seed: 304,
    layers: [
      thump(0, 85, 40, 0.3, 0.8),
      {
        waveform: 'saw',
        durationSec: 0.4,
        frequencyHz: NOTE.Eb3,
        envelope: shaped(0.01, 0.15, 0.4, 0.2),
        gain: 0.25,
        filters: [lowpass(700, 300)],
      },
      {
        waveform: 'saw',
        durationSec: 0.4,
        frequencyHz: NOTE.D3,
        envelope: shaped(0.01, 0.15, 0.4, 0.2),
        gain: 0.25,
        filters: [lowpass(700, 300)],
      },
      burst(0, 0.06, 0.3, [lowpass(400)]),
    ],
  },
  'economy.wave_reward': {
    seed: 305,
    echo: { delaySec: 0.09, feedback: 0.2, mix: 0.2 },
    layers: [
      bell(NOTE.D4, 0, 0.5, 0.25, { ratio: 2 }),
      ...[NOTE.D6, NOTE.F6, NOTE.G6, NOTE.A6, NOTE.G6, NOTE.A6].map((note, index) =>
        coin(note, [0, 0.05, 0.11, 0.16, 0.23, 0.3][index], 0.3 - index * 0.02),
      ),
    ],
  },
};
