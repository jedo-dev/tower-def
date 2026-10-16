/**
 * Balance constants behind the optional creature abilities (creature talent
 * grades, tower-def-716.2). The per-creature numbers are authored in content
 * under a unit's `abilities` object; these are the shared rules and defaults.
 */
export const CREATURE_ABILITY_BALANCE = {
  /** Lives one leak takes when `leakLivesTaken` is omitted. */
  defaultLeakLivesTaken: 1,
  /** Whether poison pauses regeneration when `regenPausedByPoison` is omitted. */
  defaultRegenPausedByPoison: false,
  /** Speed multiplier of a second life when `secondLife.speedMultiplier` is omitted. */
  defaultSecondLifeSpeedMultiplier: 1,
  /** Multiplier of a resistance or damage shape the creature does not declare. */
  neutralMultiplier: 1,
  /** Lowest gold a defender can be charged down to by a kill penalty. */
  minimumDefenderGold: 0,
} as const;
