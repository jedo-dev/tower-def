/**
 * Balance constants behind the optional tower abilities (talent grades,
 * tower-def-bge.2). The per-tower numbers are authored in content under a
 * level's `abilities` object; these are the shared rules and defaults.
 */
export const TOWER_ABILITY_BALANCE = {
  /** A creep is on a piercing shot's line when its centre is this close to the segment, in cells. */
  pierceLineHalfWidthCells: 0.5,
  /** Share of a shot's damage each extra target takes when `extraTargetDamageShare` is omitted. */
  defaultExtraTargetDamageShare: 1,
  /** Share of the tower's damage a volley deals when `volleyDamageShare` is omitted. */
  defaultVolleyDamageShare: 1,
  /** Generations of corpse explosions one kill sets off when `corpseExplosionChainLimit` is omitted. */
  defaultCorpseExplosionChainLimit: 1,
  /** A ground zone's chill outlasts its tick by this much, so a creep inside never flickers free. */
  groundZoneChillLingerMs: 250,
  /** Most live ground zones on one battlefield; a new zone past this is dropped. */
  maxGroundZonesPerField: 64,
  /** Ceiling on a tower's sell refund ratio after aura bonuses. */
  maxSellRefundRatio: 1,
} as const;
