import {
  EFFECT_IDS,
  EffectId,
  EffectKind,
  EffectStackingRule,
} from '../types/content-ids';

/**
 * Balance table for creep status effects. Towers reference an effect by id and
 * may scale its magnitude and duration per level, but the shape of an effect -
 * how it stacks, how often it ticks - is decided here, once.
 */
export type EffectDefinition = {
  id: EffectId;
  kind: EffectKind;
  /**
   * Meaning depends on the kind:
   * - movement: fraction of speed removed (0.35 means 35% slower), 1 stops the creep
   * - damage-over-time: damage dealt per tick, per stack
   * - defense: armor points removed, per stack
   */
  magnitude: number;
  durationMs: number;
  /** 0 for effects that apply continuously instead of ticking. */
  tickIntervalMs: number;
  maxStacks: number;
  stackingRule: EffectStackingRule;
};

export const EFFECT_DEFINITIONS: Record<EffectId, EffectDefinition> = {
  [EffectId.CHILL]: {
    id: EffectId.CHILL,
    kind: EffectKind.MOVEMENT,
    magnitude: 0.35,
    durationMs: 2_000,
    tickIntervalMs: 0,
    maxStacks: 1,
    stackingRule: EffectStackingRule.STRONGEST,
  },
  [EffectId.POISON]: {
    id: EffectId.POISON,
    kind: EffectKind.DAMAGE_OVER_TIME,
    magnitude: 6,
    durationMs: 4_000,
    tickIntervalMs: 500,
    // Default cap; an upgraded poison tower declares a higher one.
    maxStacks: 3,
    stackingRule: EffectStackingRule.STACK,
  },
  [EffectId.BURN]: {
    id: EffectId.BURN,
    kind: EffectKind.DAMAGE_OVER_TIME,
    magnitude: 14,
    durationMs: 2_000,
    tickIntervalMs: 500,
    maxStacks: 1,
    stackingRule: EffectStackingRule.REFRESH,
  },
  [EffectId.STUN]: {
    id: EffectId.STUN,
    kind: EffectKind.MOVEMENT,
    magnitude: 1,
    durationMs: 700,
    tickIntervalMs: 0,
    maxStacks: 1,
    stackingRule: EffectStackingRule.REFRESH,
  },
  [EffectId.ARMOR_BREAK]: {
    id: EffectId.ARMOR_BREAK,
    kind: EffectKind.DEFENSE,
    magnitude: 3,
    durationMs: 3_000,
    tickIntervalMs: 0,
    maxStacks: 3,
    stackingRule: EffectStackingRule.STACK,
  },
};

export const EFFECT_BALANCE = {
  /**
   * Floor on the slow a creep can suffer from movement effects other than
   * stun, so chill towers cannot lock a wave in place forever.
   */
  minimumSpeedMultiplier: 0.25,
  /** Armor can be broken down to this value, never below. */
  minimumArmor: 0,
  /** Cap on simultaneous distinct effects, keeping the tick path bounded. */
  maxDistinctEffectsPerCreep: EFFECT_IDS.length,
} as const;

export function resolveEffectDefinition(effectId: EffectId): EffectDefinition {
  return EFFECT_DEFINITIONS[effectId];
}
