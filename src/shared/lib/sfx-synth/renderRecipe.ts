import { encodeWav } from './encodeWav';
import { renderLayerInto } from './renderLayer';
import { createSeededRandom } from './seededRandom';
import {
  SFX_DEFAULT_LOUDNESS,
  SFX_DEFAULT_PEAK,
  SFX_END_FADE_SEC,
  SFX_SAMPLE_RATE,
  type SfxEcho,
  type SfxRecipe,
} from './sfxRecipe.types';

/** Distinct, stable noise stream per layer, derived from the recipe seed. */
function layerSeed(recipeSeed: number, layerIndex: number): number {
  return (Math.imul(recipeSeed, 0x9e3779b1) + Math.imul(layerIndex + 1, 0x85ebca6b)) >>> 0;
}

export function getRecipeDurationSec(recipe: SfxRecipe): number {
  const layersEndSec = recipe.layers.reduce(
    (end, layer) => Math.max(end, (layer.startSec ?? 0) + layer.durationSec),
    0,
  );
  return layersEndSec + (recipe.tailSec ?? 0);
}

/** Feedback comb: a dark, cheap stand-in for a room on stingers. */
function applyEcho(samples: Float64Array, echo: SfxEcho, sampleRate: number): void {
  const delay = Math.max(1, Math.round(echo.delaySec * sampleRate));
  const delayLine = new Float64Array(samples.length);

  for (let index = delay; index < samples.length; index += 1) {
    delayLine[index] = samples[index - delay] + echo.feedback * delayLine[index - delay];
  }
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] += echo.mix * delayLine[index];
  }
}

/** Scales towards the target RMS without letting the peak pass its ceiling. */
function normalize(samples: Float64Array, peak: number, loudness: number): void {
  let maxAmplitude = 0;
  let sumOfSquares = 0;
  for (const sample of samples) {
    maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
    sumOfSquares += sample * sample;
  }
  if (maxAmplitude === 0) {
    return;
  }
  const rms = Math.sqrt(sumOfSquares / samples.length);
  const scale = Math.min(peak / maxAmplitude, loudness / rms);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] *= scale;
  }
}

function fadeOutEnd(samples: Float64Array, sampleRate: number): void {
  const fadeLength = Math.min(samples.length, Math.round(SFX_END_FADE_SEC * sampleRate));
  for (let offset = 0; offset < fadeLength; offset += 1) {
    samples[samples.length - 1 - offset] *= offset / fadeLength;
  }
}

/** Renders a recipe to normalized mono samples in [-1, 1]. Pure and deterministic. */
export function renderSfxRecipe(recipe: SfxRecipe, sampleRate = SFX_SAMPLE_RATE): Float64Array {
  const length = Math.max(1, Math.ceil(getRecipeDurationSec(recipe) * sampleRate));
  const samples = new Float64Array(length);

  recipe.layers.forEach((layer, layerIndex) => {
    renderLayerInto(
      samples,
      layer,
      sampleRate,
      createSeededRandom(layerSeed(recipe.seed, layerIndex)),
    );
  });

  if (recipe.echo) {
    applyEcho(samples, recipe.echo, sampleRate);
  }

  normalize(samples, recipe.peak ?? SFX_DEFAULT_PEAK, recipe.loudness ?? SFX_DEFAULT_LOUDNESS);
  fadeOutEnd(samples, sampleRate);

  return samples;
}

/** Recipe in, finished WAV bytes out: what `npm run gen:sfx` writes to disk. */
export function renderSfxRecipeToWav(recipe: SfxRecipe): Uint8Array {
  return encodeWav(renderSfxRecipe(recipe, SFX_SAMPLE_RATE), SFX_SAMPLE_RATE);
}
