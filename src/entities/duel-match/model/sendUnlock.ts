import {
  getCreatureSendUnlockWave,
  isCreatureTierUnlocked,
} from '../../../shared/constants/creatureSendUnlock';
import type { UnitTier } from '../../unit/model/types';

/**
 * The wave a send queued now spawns in. Sends are queued in the build phase
 * after `round` waves have been fought, so they join wave `round + 1`.
 */
export function getSendWaveNumber(round: number): number {
  return round + 1;
}

/** First wave a creature of `tier` can be sent into (`CREATURE_SEND_UNLOCK_WAVE_BY_TIER`). */
export function getSendUnlockWave(tier: UnitTier): number {
  return getCreatureSendUnlockWave(tier);
}

/** A side may queue a creature of `tier` in the build phase after `round` waves. */
export function isSendTierUnlocked(tier: UnitTier, round: number): boolean {
  return isCreatureTierUnlocked(tier, getSendWaveNumber(round));
}
