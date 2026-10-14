import { SoundCategory } from '../audio.types';
import { defineClip, type SoundClipGroup } from './defineClip';

const COMBAT = SoundCategory.COMBAT;

/**
 * Throttle for status effect stingers. A splash tower can chill a dozen creeps
 * in one shot; without this the applications pile into a single loud smear.
 */
export const EFFECT_APPLY_SOUND_COOLDOWN_MS = 220;

export const COMBAT_SOUND_CLIPS: SoundClipGroup<'combat'> = {
  'combat.attack.archer': defineClip('combat/combat_archer_attack_01.wav', COMBAT, {
    volume: 0.28,
    cooldownMs: 40,
    pitchMin: 0.9,
    pitchMax: 1.1,
    maxDurationSec: 0.3,
    startOffsetSec: 0.025,
  }),
  'combat.attack.splash': defineClip('combat/combat_splash_attack_01.wav', COMBAT, {
    volume: 0.35,
    cooldownMs: 80,
    pitchMin: 0.85,
    pitchMax: 1.0,
    maxDurationSec: 0.5,
    startOffsetSec: 0.02,
  }),
  'combat.creep_hit': defineClip('combat/combat_creep_hit_01.wav', COMBAT, {
    volume: 0.22,
    cooldownMs: 80,
    maxDurationSec: 0.2,
  }),
  'combat.effect_applied.chill': defineClip('combat/combat_effect_chill_01.wav', COMBAT, {
    volume: 0.22,
    cooldownMs: EFFECT_APPLY_SOUND_COOLDOWN_MS,
    pitchMin: 1.15,
    pitchMax: 1.3,
    maxDurationSec: 0.3,
  }),
  'combat.effect_applied.poison': defineClip('combat/combat_effect_poison_01.wav', COMBAT, {
    volume: 0.22,
    cooldownMs: EFFECT_APPLY_SOUND_COOLDOWN_MS,
    pitchMin: 0.85,
    pitchMax: 0.95,
    maxDurationSec: 0.3,
  }),
  'combat.effect_applied.stun': defineClip('combat/combat_effect_stun_01.wav', COMBAT, {
    volume: 0.28,
    cooldownMs: EFFECT_APPLY_SOUND_COOLDOWN_MS,
    maxDurationSec: 0.25,
  }),
};
