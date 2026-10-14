// Ambience encoder: cuts a seamless loop out of each authored recording in
// assets-src/audio/ambient and writes it to the OGG Vorbis file its sound id
// is registered with, plus the AAC (.m4a) fallback for Safari / iOS. Decoding
// and encoding go through the ffmpeg binary that @ffmpeg-installer/ffmpeg
// ships as a devDependency; nothing has to be installed on the machine.
//
//   npm run encode:ambient
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import {
  AMBIENT_ENCODING,
  AMBIENT_LOOP_SPECS,
  AMBIENT_SAMPLE_RATE,
  AMBIENT_SIZE_BUDGET_BYTES,
  AMBIENT_SOURCE_ROOT,
  type AmbientLoopSpec,
  type AmbientSoundId,
} from '../src/shared/lib/ambient-loop/ambientEncoding';
import { readOggStreamLength } from '../src/shared/lib/ambient-loop/oggStreamLength';
import {
  buildSeamlessLoop,
  findLoopLength,
  frameCount,
  measureLoopSeam,
  peakLevel,
  type PcmAudio,
} from '../src/shared/lib/ambient-loop/seamlessLoop';
import { SOUND_CLIPS } from '../src/shared/lib/sound-registry/audio.constants';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const PUBLIC_DIR = join(REPO_ROOT, 'public');
const SOURCE_DIR = join(REPO_ROOT, AMBIENT_SOURCE_ROOT);
const FFMPEG = ffmpegInstaller.path;
/** The longest recording decodes to well under this many bytes of float PCM. */
const DECODE_MAX_BUFFER_BYTES = 512 * 1024 * 1024;
/** A loop seam this much louder than an ordinary sample step is a click. */
const SEAM_CLICK_RATIO = 2;

type SourceInfo = { sampleRate: number; channels: number };

function runFfmpeg(args: string[], maxBuffer?: number): Buffer {
  return execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args], {
    maxBuffer,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function probeSource(file: string): SourceInfo {
  // ffprobe is not bundled, so read the stream line ffmpeg prints on stderr.
  let banner = '';
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (error) {
    banner = String((error as { stderr?: Buffer }).stderr ?? '');
  }
  const match = banner.match(/Audio: \w+.*?, (\d+) Hz, (mono|stereo|\d+ channels)/);
  if (!match) {
    throw new Error(`could not read the audio stream of ${file}`);
  }
  const layout = match[2];
  const channels = layout === 'mono' ? 1 : layout === 'stereo' ? 2 : Number.parseInt(layout, 10);
  return { sampleRate: Number(match[1]), channels };
}

function decodeSource(file: string): PcmAudio {
  const { sampleRate, channels } = probeSource(file);
  const bytes = runFfmpeg(
    ['-i', file, '-vn', '-map_metadata', '-1', '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1'],
    DECODE_MAX_BUFFER_BYTES,
  );
  const samples = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  return { samples: samples.slice(), channels, sampleRate };
}

function encodeLoop(loop: PcmAudio, rawFile: string, target: string, codecArgs: string[]): void {
  mkdirSync(dirname(target), { recursive: true });
  runFfmpeg([
    '-y',
    '-f',
    'f32le',
    '-ar',
    String(loop.sampleRate),
    '-ac',
    String(loop.channels),
    '-i',
    rawFile,
    '-map_metadata',
    '-1',
    ...codecArgs,
    target,
  ]);
}

function cutLoop(source: PcmAudio, spec: AmbientLoopSpec): PcmAudio {
  const toFrames = (seconds: number) => Math.round(seconds * source.sampleRate);
  const startFrame = toFrames(spec.loopStartSec);
  const lengthFrames = findLoopLength(source, {
    startFrame,
    targetLengthFrames: toFrames(spec.targetLoopSec),
    searchRadiusFrames: toFrames(spec.searchRadiusSec),
    compareWindowFrames: toFrames(spec.compareWindowSec),
    coarseStepFrames: toFrames(0.001),
  });
  return buildSeamlessLoop(source, startFrame, lengthFrames, toFrames(spec.crossfadeSec));
}

function trimToFrames(audio: PcmAudio, frames: number): PcmAudio {
  return { ...audio, samples: audio.samples.subarray(0, frames * audio.channels) };
}

/**
 * Checks the shipped Ogg declares exactly the loop's length, then decodes it
 * and checks the boundary is as clean as the PCM's. The bundled ffmpeg does
 * not trim the final Vorbis block on decode (browsers do, by granule
 * position), so the decoded audio is cut to the declared length first.
 */
function verifyEncoded(target: string, loop: PcmAudio): void {
  const declared = readOggStreamLength(readFileSync(target));
  if (!declared.isComplete || declared.frames !== frameCount(loop)) {
    throw new Error(
      `${target}: declares ${declared.frames} frames (complete: ${declared.isComplete}), loop has ${frameCount(loop)}`,
    );
  }
  const decoded = decodeSource(target);
  if (frameCount(decoded) < declared.frames) {
    throw new Error(`${target}: decodes to fewer frames than it declares`);
  }
  const seam = measureLoopSeam(trimToFrames(decoded, declared.frames));
  if (seam.seamJump > seam.typicalJump * SEAM_CLICK_RATIO) {
    throw new Error(
      `${target}: loop boundary clicks (jump ${seam.seamJump.toFixed(4)} vs typical ${seam.typicalJump.toFixed(4)})`,
    );
  }
}

const workDir = mkdtempSync(join(tmpdir(), 'tower-def-ambient-'));
let primaryBytes = 0;
const rows: string[] = [];

try {
  for (const [soundId, spec] of Object.entries(AMBIENT_LOOP_SPECS) as [
    AmbientSoundId,
    AmbientLoopSpec,
  ][]) {
    const clip = SOUND_CLIPS[soundId];
    if (!clip.fallbackAssetPath) {
      throw new Error(`${soundId} has no fallback asset registered`);
    }
    const source = decodeSource(join(SOURCE_DIR, spec.sourceFile));
    if (source.sampleRate !== AMBIENT_SAMPLE_RATE) {
      throw new Error(
        `${spec.sourceFile}: expected ${AMBIENT_SAMPLE_RATE} Hz, got ${source.sampleRate}`,
      );
    }
    const loop = cutLoop(source, spec);
    const rawFile = join(workDir, `${soundId}.f32`);
    writeFileSync(rawFile, Buffer.from(loop.samples.buffer));

    const primary = join(PUBLIC_DIR, clip.assetPath);
    const fallback = join(PUBLIC_DIR, clip.fallbackAssetPath);
    encodeLoop(loop, rawFile, primary, [
      '-c:a',
      'libvorbis',
      '-q:a',
      String(AMBIENT_ENCODING.VORBIS_QUALITY),
    ]);
    encodeLoop(loop, rawFile, fallback, ['-c:a', 'aac', '-b:a', AMBIENT_ENCODING.AAC_BITRATE]);
    verifyEncoded(primary, loop);

    const primarySize = statSync(primary).size;
    primaryBytes += primarySize;
    const seam = measureLoopSeam(loop);
    rows.push(
      [
        soundId.padEnd(18),
        `${(frameCount(loop) / loop.sampleRate).toFixed(3)}s`,
        `${loop.channels}ch ${loop.sampleRate} Hz`,
        `peak ${peakLevel(loop).toFixed(2)}`,
        `seam ${seam.seamJump.toFixed(4)}/${seam.typicalJump.toFixed(4)}`,
        `${(primarySize / 1024).toFixed(1)} KB ${relative(PUBLIC_DIR, primary)}`,
        `${(statSync(fallback).size / 1024).toFixed(1)} KB ${relative(PUBLIC_DIR, fallback)}`,
      ].join('  '),
    );
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

process.stdout.write(`${rows.join('\n')}\n\n`);
process.stdout.write(
  `primary (ogg) total ${(primaryBytes / 1024).toFixed(1)} KB of ${(AMBIENT_SIZE_BUDGET_BYTES / 1024).toFixed(1)} KB budget\n`,
);
if (primaryBytes > AMBIENT_SIZE_BUDGET_BYTES) {
  process.stderr.write(`over the ${AMBIENT_SIZE_BUDGET_BYTES} byte budget for ambience\n`);
  process.exitCode = 1;
}
