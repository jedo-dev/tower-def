import type { SfxFilterType } from './sfxRecipe.types';

/**
 * RBJ cookbook biquad. Coefficients are recomputed only when the cutoff moves,
 * which keeps a swept filter cheap and the output deterministic.
 */
export class BiquadFilter {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private lastCutoffHz = -1;
  private readonly type: SfxFilterType;
  private readonly q: number;
  private readonly sampleRate: number;

  constructor(type: SfxFilterType, q: number, sampleRate: number) {
    this.type = type;
    this.q = q;
    this.sampleRate = sampleRate;
  }

  setCutoff(cutoffHz: number): void {
    const nyquistSafe = Math.min(Math.max(cutoffHz, 10), this.sampleRate * 0.45);

    if (nyquistSafe === this.lastCutoffHz) {
      return;
    }

    this.lastCutoffHz = nyquistSafe;
    const omega = (2 * Math.PI * nyquistSafe) / this.sampleRate;
    const sin = Math.sin(omega);
    const cos = Math.cos(omega);
    const alpha = sin / (2 * this.q);
    const a0 = 1 + alpha;

    let b0: number;
    let b1: number;
    let b2: number;

    switch (this.type) {
      case 'lowpass':
        b0 = (1 - cos) / 2;
        b1 = 1 - cos;
        b2 = (1 - cos) / 2;
        break;
      case 'highpass':
        b0 = (1 + cos) / 2;
        b1 = -(1 + cos);
        b2 = (1 + cos) / 2;
        break;
      case 'bandpass':
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        break;
    }

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(input: number): number {
    const output =
      this.b0 * input +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;

    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;

    return output;
  }
}
