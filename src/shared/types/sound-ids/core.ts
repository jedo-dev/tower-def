/**
 * Race-neutral sound ids: interface, system, economy, the combat fallbacks the
 * default sound profile plays, status effect stingers and the ambience loops.
 * Race-specific ids live in one file per race next to this one.
 */
export const CORE_SOUND_IDS = [
  'ui.click',
  'ui.hover',
  'ui.open',
  'ui.close',
  'ui.error',
  'ui.success',
  'ui.build_select',
  'ui.faction_select',
  'ui.wave_start',
  'ui.wave_complete',
  'ui.game_over',
  'ui.victory',
  'system.pause',
  'system.unpause',
  'system.restart',
  'economy.gold_gain',
  'economy.gold_spent',
  'economy.refund',
  'economy.life_lost',
  'economy.wave_reward',
  // Fallback combat clips, used by the default sound profile.
  'combat.attack.default',
  'combat.impact.default',
  'combat.build',
  'combat.sell',
  'combat.upgrade',
  'combat.creep_hit',
  'combat.creep_death',
  'combat.creep_escape',
  'combat.creep_spawn',
  'combat.effect_applied.chill',
  'combat.effect_applied.poison',
  'combat.effect_applied.stun',
  'ambient.map',
  'ambient.tension',
] as const;

export type CoreSoundId = (typeof CORE_SOUND_IDS)[number];
