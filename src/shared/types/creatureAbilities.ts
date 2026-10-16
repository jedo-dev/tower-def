import type { EffectId } from './content-ids';

/**
 * Optional abilities a creature may carry under `abilities` (tower-def-716.2).
 * Every field is optional and absent means "no such ability": a creature
 * without the object walks, takes damage and pays out exactly as before.
 * Talent grade objects reuse the same field names. Field semantics are
 * documented in docs/08-content-authoring.md, "Creature abilities".
 *
 * The type lives in `shared` because two entities read it: the unit config
 * (authored content) and the runtime creep, which copies it at spawn.
 */

/** Multipliers 0..1 on the effects a creature receives; 0 means immune. */
export type CreatureEffectResistance = Partial<Record<EffectId, number>>;

/** How a hit reached the creature, for `incomingDamageMultipliers`. */
export const CreatureDamageShape = {
  /** Single-target shots and everything that widens them (extra targets, pierce, volley). */
  SINGLE: 'single',
  /** Hits of a splash tower. */
  SPLASH: 'splash',
  /** Hits of a chain tower: the primary target and every arc. */
  CHAIN: 'chain',
  /** Damage-over-time ticks (poison, burn). */
  DOT: 'dot',
} as const;

export type CreatureDamageShape = (typeof CreatureDamageShape)[keyof typeof CreatureDamageShape];

export const CREATURE_DAMAGE_SHAPES: readonly CreatureDamageShape[] = [
  CreatureDamageShape.SINGLE,
  CreatureDamageShape.SPLASH,
  CreatureDamageShape.CHAIN,
  CreatureDamageShape.DOT,
];

/**
 * Multipliers 0..2 on incoming damage by how it arrived; `percent` scales
 * percent-type damage whatever its shape. Shape and percent multiply.
 */
export type CreatureIncomingDamageMultipliers = Partial<
  Record<CreatureDamageShape | 'percent', number>
>;

/** Speed multiplier while the creature's health share is at or below `hpShare`. */
export type CreatureLowHealthSpeedBoost = {
  hpShare: number;
  speedMultiplier: number;
};

/** Speed multiplier once at most `routeShare` of its route is left to walk. */
export type CreatureRouteEndSpeedBoost = {
  routeShare: number;
  speedMultiplier: number;
};

/** One revival: on death the creature stands up again at `hpShare` of maximum health. */
export type CreatureSecondLife = {
  hpShare: number;
  /** Speed multiplier for the second life; 1 when omitted. */
  speedMultiplier?: number;
  /** The second life shrugs off chill (and drops a running one). */
  immuneToChill?: boolean;
};

export type CreatureAbilities = {
  effectResistance?: CreatureEffectResistance;
  /** Every Nth single-target shot aimed at the creature misses (a counter, no roll). */
  dodgeEveryNthShot?: number;
  /** Health regained per second while alive, capped at maximum health. */
  healthRegenPerSecond?: number;
  /** Regeneration stops while poisoned; false when omitted. */
  regenPausedByPoison?: boolean;
  incomingDamageMultipliers?: CreatureIncomingDamageMultipliers;
  speedBoostBelowHpShare?: CreatureLowHealthSpeedBoost;
  speedBoostLastRouteShare?: CreatureRouteEndSpeedBoost;
  /** Untargetable for this many ms after spawning. */
  startInvisibleMs?: number;
  /** Lives a leak of this creature takes; 1 when omitted. */
  leakLivesTaken?: number;
  /** Gold the sender earns when this creature, sent, leaks. */
  leakGoldToSender?: number;
  /** Gold the defender loses when it kills this creature (never below 0). */
  killGoldPenaltyToDefender?: number;
  /** Shield pool that absorbs damage before health. */
  shieldHp?: number;
  /** The shield refills after this many ms without damage; needs `shieldHp`. */
  shieldRechargeMs?: number;
  secondLife?: CreatureSecondLife;
  /** Every Nth send of this creature by one side is free. */
  freeNthSend?: number;
};
