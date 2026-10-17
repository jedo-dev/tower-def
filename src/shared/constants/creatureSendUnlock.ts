/**
 * Creature send unlock schedule (tower-def-qpb, docs/08 "Send unlock by
 * wave"): a side may send a creature only from the wave its tier unlocks. The
 * wave is the one the send spawns in, so during the build phase before wave 3
 * a tier unlocked at 3 can already be queued. The player's send command, the
 * computer's send candidates and the dock all read this one table: edit a
 * number here and every side plays by it.
 */
export const CREATURE_SEND_UNLOCK_WAVE_BY_TIER = {
  1: 1,
  2: 1,
  3: 3,
  4: 5,
  5: 8,
  6: 12,
} as const satisfies Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, number>>;

export type CreatureSendUnlockTier = keyof typeof CREATURE_SEND_UNLOCK_WAVE_BY_TIER;

/** First wave a creature of `tier` can be sent into; wave 1 for a tier the table leaves out. */
export function getCreatureSendUnlockWave(tier: number): number {
  return tier in CREATURE_SEND_UNLOCK_WAVE_BY_TIER
    ? CREATURE_SEND_UNLOCK_WAVE_BY_TIER[tier as CreatureSendUnlockTier]
    : 1;
}

/** A creature of `tier` may be sent into wave `sendWaveNumber`. */
export function isCreatureTierUnlocked(tier: number, sendWaveNumber: number): boolean {
  return sendWaveNumber >= getCreatureSendUnlockWave(tier);
}
