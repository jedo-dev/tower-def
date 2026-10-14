import { SoundCategory, type SoundPlaybackConfig } from '../audio.types';
import { defineClip, type SoundClipGroup } from './defineClip';

const COMBAT = SoundCategory.COMBAT;

/**
 * Throttle for status effect stingers. A splash tower can chill a dozen creeps
 * in one shot; without this the applications pile into a single loud smear.
 */
export const EFFECT_APPLY_SOUND_COOLDOWN_MS = 220;

/** Playback shared by each kind of combat clip; files differ per race. */
const ATTACK: Partial<SoundPlaybackConfig> = {
  volume: 0.24,
  cooldownMs: 60,
  pitchMin: 0.94,
  pitchMax: 1.06,
};
const HEAVY_ATTACK: Partial<SoundPlaybackConfig> = { ...ATTACK, volume: 0.28, cooldownMs: 120 };
const IMPACT: Partial<SoundPlaybackConfig> = {
  volume: 0.16,
  cooldownMs: 70,
  pitchMin: 0.92,
  pitchMax: 1.08,
};
const BUILD: Partial<SoundPlaybackConfig> = { volume: 0.3, pitchMin: 0.98, pitchMax: 1.02 };
const CREEP_DEATH: Partial<SoundPlaybackConfig> = {
  volume: 0.24,
  cooldownMs: 90,
  pitchMin: 0.9,
  pitchMax: 1.1,
};
const EFFECT: Partial<SoundPlaybackConfig> = {
  volume: 0.2,
  cooldownMs: EFFECT_APPLY_SOUND_COOLDOWN_MS,
  pitchMin: 0.96,
  pitchMax: 1.04,
};

const clip = (file: string, playback: Partial<SoundPlaybackConfig>) =>
  defineClip(`combat/${file}`, COMBAT, playback);

export const COMBAT_SOUND_CLIPS: SoundClipGroup<'combat'> = {
  'combat.attack.default': clip('default/attack.wav', ATTACK),
  'combat.impact.default': clip('default/impact.wav', IMPACT),
  'combat.build': clip('default/build.wav', BUILD),
  'combat.sell': clip('default/sell.wav', { ...BUILD, volume: 0.26 }),
  'combat.upgrade': clip('default/upgrade.wav', { ...BUILD, volume: 0.28 }),
  // Layered under every impact: a soft body thump, throttled hard.
  'combat.creep_hit': clip('default/creep_hit.wav', { ...IMPACT, volume: 0.1, cooldownMs: 110 }),
  'combat.creep_death': clip('default/creep_death.wav', CREEP_DEATH),
  'combat.creep_escape': clip('default/creep_escape.wav', {
    volume: 0.3,
    cooldownMs: 150,
    pitchMin: 0.98,
    pitchMax: 1.02,
  }),
  'combat.effect_applied.chill': clip('effects/chill.wav', EFFECT),
  'combat.effect_applied.poison': clip('effects/poison.wav', EFFECT),
  'combat.effect_applied.stun': clip('effects/stun.wav', { ...EFFECT, volume: 0.24 }),

  'combat.attack.single.undead': clip('undead/attack_single.wav', ATTACK),
  'combat.attack.splash.undead': clip('undead/attack_splash.wav', HEAVY_ATTACK),
  'combat.attack.frost.undead': clip('undead/attack_frost.wav', ATTACK),
  'combat.impact.undead': clip('undead/impact.wav', IMPACT),
  'combat.build.undead': clip('undead/build.wav', BUILD),
  'combat.creep_death.undead': clip('undead/creep_death.wav', CREEP_DEATH),

  'combat.attack.single.orc': clip('orc/attack_single.wav', ATTACK),
  'combat.attack.splash.orc': clip('orc/attack_splash.wav', HEAVY_ATTACK),
  'combat.attack.chain.orc': clip('orc/attack_chain.wav', ATTACK),
  'combat.attack.frost.orc': clip('orc/attack_frost.wav', ATTACK),
  'combat.impact.orc': clip('orc/impact.wav', IMPACT),
  'combat.build.orc': clip('orc/build.wav', BUILD),
  'combat.creep_death.orc': clip('orc/creep_death.wav', CREEP_DEATH),

  'combat.attack.single.human': clip('human/attack_single.wav', ATTACK),
  'combat.attack.splash.human': clip('human/attack_splash.wav', { ...HEAVY_ATTACK, volume: 0.26 }),
  'combat.attack.poison.human': clip('human/attack_poison.wav', ATTACK),
  'combat.impact.human': clip('human/impact.wav', IMPACT),
  'combat.build.human': clip('human/build.wav', BUILD),
  'combat.creep_death.human': clip('human/creep_death.wav', CREEP_DEATH),

  'combat.attack.single.elf': clip('elf/attack_single.wav', ATTACK),
  'combat.attack.splash.elf': clip('elf/attack_splash.wav', HEAVY_ATTACK),
  'combat.attack.frost.elf': clip('elf/attack_frost.wav', ATTACK),
  'combat.attack.poison.elf': clip('elf/attack_poison.wav', ATTACK),
  'combat.impact.elf': clip('elf/impact.wav', IMPACT),
  'combat.build.elf': clip('elf/build.wav', BUILD),
  'combat.creep_death.elf': clip('elf/creep_death.wav', CREEP_DEATH),
};
