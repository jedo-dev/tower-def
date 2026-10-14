import { SoundCategory } from '../audio.types';
import { defineClip, type SoundClipGroup } from './defineClip';

const SYSTEM = SoundCategory.SYSTEM;
const ECONOMY = SoundCategory.ECONOMY;
const AMBIENT = SoundCategory.AMBIENT;

const STEADY = { pitchMin: 0.98, pitchMax: 1.02 } as const;

export const SYSTEM_SOUND_CLIPS: SoundClipGroup<'system'> = {
  'system.pause': defineClip('system/system_pause.wav', SYSTEM, { ...STEADY, volume: 0.25 }),
  'system.unpause': defineClip('system/system_unpause.wav', SYSTEM, { ...STEADY, volume: 0.25 }),
  'system.restart': defineClip('system/system_restart.wav', SYSTEM, { ...STEADY, volume: 0.3 }),
};

export const ECONOMY_SOUND_CLIPS: SoundClipGroup<'economy'> = {
  // Plays on every kill: quiet, short and slightly varied so it never drills.
  'economy.gold_gain': defineClip('economy/economy_gold_gain.wav', ECONOMY, {
    volume: 0.16,
    cooldownMs: 90,
    pitchMin: 0.94,
    pitchMax: 1.08,
  }),
  'economy.gold_spent': defineClip('economy/economy_gold_spent.wav', ECONOMY, {
    ...STEADY,
    volume: 0.2,
  }),
  'economy.refund': defineClip('economy/economy_refund.wav', ECONOMY, { ...STEADY, volume: 0.2 }),
  'economy.life_lost': defineClip('economy/economy_life_lost.wav', ECONOMY, {
    ...STEADY,
    volume: 0.36,
    cooldownMs: 150,
  }),
  'economy.wave_reward': defineClip('economy/economy_wave_reward.wav', ECONOMY, {
    volume: 0.3,
    pitchMin: 1,
    pitchMax: 1,
  }),
};

/**
 * The two authored ambience loops, encoded by `npm run encode:ambient` from
 * `assets-src/audio/ambient/`. OGG Vorbis everywhere it decodes; AAC where it
 * does not (Safari, iOS).
 */
export const AMBIENT_SOUND_CLIPS: SoundClipGroup<'ambient'> = {
  'ambient.map': defineClip(
    { primary: 'ambient/ambient_map_01.ogg', fallback: 'ambient/ambient_map_01.m4a' },
    AMBIENT,
    { volume: 0.15, loop: true },
  ),
  'ambient.tension': defineClip(
    { primary: 'ambient/ambient_tension_01.ogg', fallback: 'ambient/ambient_tension_01.m4a' },
    AMBIENT,
    { volume: 0.12, loop: true },
  ),
};
