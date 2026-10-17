import type { RaceSoundGroupId } from '../../../types/sound-ids';
import { SoundCategory, type SoundClipDefinition, type SoundPlaybackConfig } from '../audio.types';
import { defineClip } from './defineClip';

/**
 * Playback presets shared by every combat clip. Race files pick a preset per
 * clip kind, so a new race sound mixes like the ones before it.
 */

/**
 * Throttle for status effect stingers. A splash tower can chill a dozen creeps
 * in one shot; without this the applications pile into a single loud smear.
 */
export const EFFECT_APPLY_SOUND_COOLDOWN_MS = 220;

/**
 * Sent creatures leave the entrance one per spawn interval (350 ms). This
 * cooldown lets a batch of six sends of one creature play its spawn cue once
 * or twice instead of six times.
 */
export const CREEP_SPAWN_SOUND_COOLDOWN_MS = 1200;

type Playback = Partial<SoundPlaybackConfig>;

export const ATTACK: Playback = { volume: 0.24, cooldownMs: 60, pitchMin: 0.94, pitchMax: 1.06 };
export const HEAVY_ATTACK: Playback = { ...ATTACK, volume: 0.28, cooldownMs: 120 };
export const IMPACT: Playback = { volume: 0.16, cooldownMs: 70, pitchMin: 0.92, pitchMax: 1.08 };
export const BUILD: Playback = { volume: 0.3, pitchMin: 0.98, pitchMax: 1.02 };
export const UPGRADE: Playback = { ...BUILD, volume: 0.28 };
/** Layered under every impact: a soft body thump, throttled hard. */
export const CREEP_HIT: Playback = { ...IMPACT, volume: 0.1, cooldownMs: 110 };
export const CREEP_DEATH: Playback = {
  volume: 0.24,
  cooldownMs: 90,
  pitchMin: 0.9,
  pitchMax: 1.1,
};
export const CREEP_ESCAPE: Playback = {
  volume: 0.3,
  cooldownMs: 150,
  pitchMin: 0.98,
  pitchMax: 1.02,
};
export const CREEP_SPAWN: Playback = {
  volume: 0.22,
  cooldownMs: CREEP_SPAWN_SOUND_COOLDOWN_MS,
  pitchMin: 0.96,
  pitchMax: 1.04,
};
export const EFFECT: Playback = {
  volume: 0.2,
  cooldownMs: EFFECT_APPLY_SOUND_COOLDOWN_MS,
  pitchMin: 0.96,
  pitchMax: 1.04,
};

/** A race-neutral combat clip, `file` relative to `combat/`. */
export function combatClip(file: string, playback: Playback): SoundClipDefinition {
  return defineClip(`combat/${file}`, SoundCategory.COMBAT, playback);
}

/**
 * A clip of one race, always under `combat/<race>/`, so `npm run gen:sfx --
 * --race <race>` owns exactly that folder. `file` is relative to it, e.g.
 * `creeps/orc_grunt_hit.wav`.
 */
export function raceCombatClip(
  race: RaceSoundGroupId,
  file: string,
  playback: Playback,
): SoundClipDefinition {
  return combatClip(`${race}/${file}`, playback);
}
