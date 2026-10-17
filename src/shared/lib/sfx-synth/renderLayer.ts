import { BiquadFilter } from './biquadFilter';
import type { SfxEnvelope, SfxFilter, SfxFormant, SfxLayer } from './sfxRecipe.types';

const TWO_PI = Math.PI * 2;
/** Shortest attack allowed, so even a "hard" hit starts without a click. */
const MIN_ATTACK_SEC = 0.0015;
const FLAT_Q = 0.707;

type ActiveFilter = {
  spec: SfxFilter;
  filter: BiquadFilter;
};

/** Band-limits the hard edges of saw and square so they stay easy on the ear. */
function polyBlep(phase: number, phaseStep: number): number {
  if (phase < phaseStep) {
    const ratio = phase / phaseStep;
    return ratio + ratio - ratio * ratio - 1;
  }
  if (phase > 1 - phaseStep) {
    const ratio = (phase - 1) / phaseStep;
    return ratio * ratio + ratio + ratio + 1;
  }
  return 0;
}

function sweep(start: number, end: number | undefined, progress: number, curve = 1): number {
  if (end === undefined || end === start) {
    return start;
  }
  return start * Math.pow(end / start, Math.pow(progress, curve));
}

/** Envelope level at `timeSec`; the release is a multiplier so it never jumps. */
export function envelopeLevel(envelope: SfxEnvelope, timeSec: number, durationSec: number): number {
  const attackSec = Math.max(envelope.attackSec, MIN_ATTACK_SEC);
  let level: number;

  if (timeSec < attackSec) {
    level = timeSec / attackSec;
  } else if (envelope.decaySec > 0 && timeSec < attackSec + envelope.decaySec) {
    const remaining = 1 - (timeSec - attackSec) / envelope.decaySec;
    level = envelope.sustainLevel + (1 - envelope.sustainLevel) * remaining * remaining;
  } else {
    level = envelope.sustainLevel;
  }

  const releaseSec = Math.max(envelope.releaseSec, MIN_ATTACK_SEC);
  const untilEndSec = durationSec - timeSec;

  if (untilEndSec < releaseSec) {
    const releaseLevel = Math.max(untilEndSec, 0) / releaseSec;
    level *= releaseLevel * releaseLevel;
  }

  return level;
}

type ActiveFormant = {
  spec: SfxFormant;
  filter: BiquadFilter;
};

/** Smooth seeded drift in [-1, 1]: linear glides between held random targets. */
type JitterState = {
  phase: number;
  from: number;
  to: number;
};

function createFormants(layer: SfxLayer, sampleRate: number): ActiveFormant[] {
  return (layer.formants ?? []).map((spec) => {
    const filter = new BiquadFilter('bandpass', spec.q, sampleRate);
    filter.setCutoff(spec.frequencyHz);
    return { spec, filter };
  });
}

/** Sum of the source's band-passed copies, each gliding along its own sweep. */
function applyFormants(sample: number, formants: ActiveFormant[], progress: number): number {
  let voiced = 0;
  for (const active of formants) {
    if (active.spec.frequencyEndHz !== undefined) {
      active.filter.setCutoff(sweep(active.spec.frequencyHz, active.spec.frequencyEndHz, progress));
    }
    voiced += active.filter.process(sample) * active.spec.gain;
  }
  return voiced;
}

function advanceJitter(state: JitterState, step: number, random: () => number): number {
  state.phase += step;
  if (state.phase >= 1) {
    state.phase -= Math.floor(state.phase);
    state.from = state.to;
    state.to = random() * 2 - 1;
  }
  return state.from + (state.to - state.from) * state.phase;
}

function vibratoDepth(vibrato: NonNullable<SfxLayer['vibrato']>, progress: number): number {
  if (vibrato.depthEnd === undefined) {
    return vibrato.depth;
  }
  return vibrato.depth + (vibrato.depthEnd - vibrato.depth) * progress;
}

function createFilters(layer: SfxLayer, sampleRate: number): ActiveFilter[] {
  return (layer.filters ?? []).map((spec) => {
    const filter = new BiquadFilter(spec.type, spec.q ?? FLAT_Q, sampleRate);
    filter.setCutoff(spec.cutoffHz);
    return { spec, filter };
  });
}

/**
 * Renders one layer and adds it into `output`. `random` feeds the noise, so a
 * seeded generator makes the layer byte-for-byte reproducible.
 */
export function renderLayerInto(
  output: Float64Array,
  layer: SfxLayer,
  sampleRate: number,
  random: () => number,
): void {
  const startIndex = Math.round((layer.startSec ?? 0) * sampleRate);
  const length = Math.min(Math.round(layer.durationSec * sampleRate), output.length - startIndex);
  const filters = createFilters(layer, sampleRate);
  const dutyCycle = layer.dutyCycle ?? 0.5;
  const driveNorm = layer.drive ? Math.tanh(1 + layer.drive) : 1;
  const formants = createFormants(layer, sampleRate);
  const jitter: JitterState = { phase: 0, from: 0, to: 0 };

  let phase = 0;
  let modulatorPhase = 0;
  let holdPhase = 1;
  let heldNoise = 0;

  for (let index = 0; index < length; index += 1) {
    const timeSec = index / sampleRate;
    const progress = length > 1 ? index / (length - 1) : 0;
    let frequency = sweep(layer.frequencyHz, layer.frequencyEndHz, progress, layer.sweepCurve);

    if (layer.vibrato) {
      frequency *=
        1 +
        vibratoDepth(layer.vibrato, progress) * Math.sin(TWO_PI * layer.vibrato.rateHz * timeSec);
    }

    if (layer.jitter) {
      frequency *=
        1 + layer.jitter.depth * advanceJitter(jitter, layer.jitter.rateHz / sampleRate, random);
    }

    const phaseStep = Math.min(frequency / sampleRate, 0.5);
    let sample: number;

    switch (layer.waveform) {
      case 'sine':
        sample = Math.sin(TWO_PI * phase);
        break;
      case 'triangle':
        sample = 1 - 4 * Math.abs(phase - 0.5);
        break;
      case 'saw':
        sample = 2 * phase - 1 - polyBlep(phase, phaseStep);
        break;
      case 'square':
        // A duty cycle other than 0.5 carries a DC offset; remove it.
        sample =
          (phase < dutyCycle ? 1 : -1) +
          polyBlep(phase, phaseStep) -
          polyBlep((phase - dutyCycle + 1) % 1, phaseStep) -
          (2 * dutyCycle - 1);
        break;
      case 'noise':
        holdPhase += frequency / sampleRate;
        if (holdPhase >= 1) {
          holdPhase -= Math.floor(holdPhase);
          heldNoise = random() * 2 - 1;
        }
        sample = heldNoise;
        break;
      case 'fm': {
        const fm = layer.fm ?? { ratio: 1, index: 0 };
        const modulationIndex = fm.index + ((fm.indexEnd ?? fm.index) - fm.index) * progress;
        sample = Math.sin(TWO_PI * phase + modulationIndex * Math.sin(TWO_PI * modulatorPhase));
        modulatorPhase += (frequency * fm.ratio) / sampleRate;
        modulatorPhase -= Math.floor(modulatorPhase);
        break;
      }
    }

    phase += frequency / sampleRate;
    phase -= Math.floor(phase);

    if (layer.drive) {
      sample = Math.tanh(sample * (1 + layer.drive)) / driveNorm;
    }

    if (formants.length > 0) {
      sample = applyFormants(sample, formants, progress);
    }

    for (const active of filters) {
      if (active.spec.cutoffEndHz !== undefined) {
        active.filter.setCutoff(sweep(active.spec.cutoffHz, active.spec.cutoffEndHz, progress));
      }
      sample = active.filter.process(sample);
    }

    let level = envelopeLevel(layer.envelope, timeSec, layer.durationSec) * layer.gain;

    if (layer.tremolo) {
      level *=
        1 - layer.tremolo.depth * 0.5 * (1 - Math.cos(TWO_PI * layer.tremolo.rateHz * timeSec));
    }

    output[startIndex + index] += sample * level;
  }
}
