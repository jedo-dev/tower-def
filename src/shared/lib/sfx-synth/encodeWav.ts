import { SFX_BIT_DEPTH } from './sfxRecipe.types';

const WAV_HEADER_BYTES = 44;
const PCM_FORMAT = 1;
const MONO = 1;
const MAX_INT16 = 32767;

/** Encodes mono samples in [-1, 1] as a 16-bit PCM RIFF/WAVE file. */
export function encodeWav(samples: ArrayLike<number>, sampleRate: number): Uint8Array {
  const bytesPerSample = SFX_BIT_DEPTH / 8;
  const dataBytes = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, WAV_HEADER_BYTES - 8 + dataBytes, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, MONO, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample * MONO, true);
  view.setUint16(32, bytesPerSample * MONO, true);
  view.setUint16(34, SFX_BIT_DEPTH, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(WAV_HEADER_BYTES + index * bytesPerSample, Math.round(clamped * MAX_INT16), true);
  }

  return new Uint8Array(buffer);
}

export type WavHeaderInfo = {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  dataBytes: number;
};

/** Reads the fields the generator writes; enough to check a committed file. */
export function readWavHeader(bytes: Uint8Array): WavHeaderInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bitDepth: view.getUint16(34, true),
    dataBytes: view.getUint32(40, true),
  };
}
