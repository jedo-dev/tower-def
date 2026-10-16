/**
 * Tuning of the opponent's damage model: how it values a tower by the route
 * samples it covers, and how it weighs maze growth against firepower. All in
 * one place so balancing never means hunting through planner code.
 */

/**
 * Cells per second a creep with speed 1 walks: the runtime moves creeps at
 * 80 px/s per speed point on 16 px cells (`gameScene.constants`).
 */
export const CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED = 5;

/** Seconds between two creeps of one wave leaving the entrance (`WAVE_SPAWN_INTERVAL_MS`). */
export const WAVE_SPAWN_INTERVAL_SECONDS = 0.35;

/** Speed the model assumes when it has no wave to look at; a typical tier 1 creep. */
export const REFERENCE_CREEP_SPEED = 1.3;

/**
 * Share of the streaming density that actually stands next to a hit target.
 * Waves are short and bunch unevenly, so a splash rarely meets the ideal pack.
 */
export const CLUSTER_REALISM = 0.5;

/**
 * Creeps per route sample next to a target while a wave streams past: the
 * spawn spacing at the reference speed, scaled by `CLUSTER_REALISM`. A route
 * that passes the same spot twice doubles the neighbours, which is what makes
 * turns and the gap between two lanes the place for area damage.
 */
export const CREEPS_PER_ROUTE_SAMPLE =
  CLUSTER_REALISM /
  (WAVE_SPAWN_INTERVAL_SECONDS * CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED * REFERENCE_CREEP_SPEED);

/** Most creeps one splash is expected to hit, however dense the route. */
export const MAX_EXPECTED_SPLASH_TARGETS = 4;

/** Share of its stack cap a poison tower keeps on the creep it is shooting, on average. */
export const POISON_STACK_UPTIME = 1;

/**
 * Creeps arriving per second at the reference spacing. A frost tower chills
 * at most one creep per shot, so its slow covers `shots / arrivals` of a wave.
 */
export const CREEP_ARRIVALS_PER_SECOND = 1 / WAVE_SPAWN_INTERVAL_SECONDS;

/**
 * Most extra time in reach the model credits a slowed creep, in multiples of
 * its unslowed time (2: three times as long, a 67% slow). A wave streams
 * through: past that, the towers that reach a held creep are busy with the
 * creeps behind it, so a deeper slow, a freeze or a longer stun stops adding
 * damage. Every untalented chill sits below it (0.55 at most).
 */
export const MAX_SLOW_TIME_GAIN = 2;

/**
 * What one extra route cell is worth, in multiples of the field's average
 * firepower per cell. Above 1 because a longer route also multiplies every
 * tower built later, not only the ones standing now.
 */
export const ROUTE_GAIN_VALUE_WEIGHT = 3;

/**
 * Floor of the per-cell firepower used to value route gain, in multiples of
 * the wall tower's own damage per second, so an empty field still values
 * walls that lengthen the maze it is about to fill.
 */
export const MIN_ROUTE_CELL_VALUE_IN_WALL_DPS = 1;

/** Below this value per gold an investment is not worth making at all. */
export const MIN_INVESTMENT_VALUE_PER_GOLD = 1e-6;

/**
 * Talent abilities (docs/08 "Tower abilities") as the damage model values
 * them. The model has no creature list per wave, so the hits that depend on
 * who is hit are valued at a fixed share of hits.
 */
export const ABILITY_VALUATION = {
  /** Share of a tower's hits that land on a creep still at full health. */
  fullHealthHitShare: 0.25,
  /** Share of a tower's hits that land on a `large` creep. */
  largeTargetHitShare: 0.2,
  /** Route reach, in cells, of a piercing shot around its target. */
  pierceLineReachCells: 2,
  /** Most creeps a volley or extra-target shot is expected to reach at once. */
  maxExpectedVolleyTargets: 6,
  /**
   * Share of the field's damage a typed vulnerability or a one-armor break
   * amplifies: the field mixes damage types, so a scope that covers only one
   * of physical / magical reaches about half of it.
   */
  singleTypeFieldShare: 0.5,
} as const;
