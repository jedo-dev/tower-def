import { RaceId } from '../../../shared/types/content-ids';
import { UnitTier } from '../../unit';

// Baseline wave curve. Every field faces the same rolled baseline each round,
// so this curve is what sets the pace of a duel: early waves an opening
// defence can hold, late waves that eventually outgrow any board.
// Tuned with `npm run sim:duel-batch` (docs/07-duel-mode-expansion-plan.md).

/** Tier points a wave may spend: base + perWave * n + perWaveSquared * n^2. */
export const WAVE_BUDGET_CURVE = {
  base: 4,
  perWave: 1,
  perWaveSquared: 0.15,
} as const;

/** Tier points one creature of each tier consumes from the wave budget. */
export const WAVE_TIER_VALUE_BY_TIER: Readonly<Record<UnitTier, number>> = {
  [UnitTier.TIER_1]: 1,
  [UnitTier.TIER_2]: 2,
  [UnitTier.TIER_3]: 3,
  [UnitTier.TIER_4]: 5,
  [UnitTier.TIER_5]: 7,
  [UnitTier.TIER_6]: 10,
};

/**
 * Budget multiplier for creatures that fly. An air creature skips the maze
 * and crosses the board on the straight air line, so it meets a fraction of
 * the fire a ground creature of the same tier walks through; charging it
 * more of the wave budget keeps fliers a threat rather than the whole wave.
 * Tuned in tower-def-xwc.4 (docs/07, "Air creeps").
 */
export const WAVE_AIR_UNIT_BUDGET_MULTIPLIER = 4;

/**
 * Per-roster override of `WAVE_AIR_UNIT_BUDGET_MULTIPLIER` for baseline
 * waves. A roster whose fliers are few and light (elf: two, no tier 6 flier)
 * fields fewer flying hit points at the shared multiplier, and its late waves
 * stop leaking against full boards; a lower multiplier buys it more fliers
 * per wave. Tuned in tower-def-716.9 (docs/07, "Roster balance").
 */
export const WAVE_AIR_UNIT_BUDGET_MULTIPLIER_BY_RACE: Readonly<Partial<Record<RaceId, number>>> = {
  [RaceId.ELF]: 1.5,
  [RaceId.HUMAN]: 5,
};

/**
 * First wave a tier may appear in. Early waves are fodder an opening defence
 * can learn on; heavy creatures arrive once a maze can exist.
 */
export const WAVE_TIER_UNLOCK_WAVE: Readonly<Record<UnitTier, number>> = {
  [UnitTier.TIER_1]: 1,
  [UnitTier.TIER_2]: 3,
  [UnitTier.TIER_3]: 5,
  [UnitTier.TIER_4]: 8,
  [UnitTier.TIER_5]: 12,
  [UnitTier.TIER_6]: 16,
};

/**
 * Creature count per wave: never fewer than `min`; at most
 * `capBase + capPerWave * n`, and never more than `max`.
 */
export const WAVE_UNIT_COUNT_BOUNDS = {
  min: 5,
  capBase: 10,
  capPerWave: 0.5,
  max: 30,
} as const;

/**
 * Every creature spawned in wave n, baseline or sent, carries its authored
 * health times `(1 + growthPerWave)^(n - 1)`. The budget alone plateaus once
 * a wave hits its creature cap, and a full board would then hold forever;
 * compounding health is what makes late waves outgrow any static defence.
 */
export const WAVE_HEALTH_GROWTH = {
  growthPerWave: 0.1,
} as const;
