import { MAZE_ROUTE_GAIN_WEIGHTS } from './constants';
import type { MazeSizeClassWeights, PlacementRouteGain } from './types';

/**
 * Weighted route gain bought per gold: (wSmall * smallGain + wLarge * largeGain) / towerCost.
 * Invalid placements and non-positive or non-finite costs score 0.
 */
export function gainPerGold(
  gain: PlacementRouteGain,
  towerCost: number,
  weights: Readonly<MazeSizeClassWeights> = MAZE_ROUTE_GAIN_WEIGHTS,
): number {
  if (!gain.valid || !Number.isFinite(towerCost) || towerCost <= 0) {
    return 0;
  }

  return (weights.small * gain.smallGain + weights.large * gain.largeGain) / towerCost;
}
