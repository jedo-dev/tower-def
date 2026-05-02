import { ECONOMY_BALANCE } from '../../../shared/constants/economy';
import type { PlayerResources } from './types';

export function createInitialPlayerResources(): PlayerResources {
  return {
    gold: ECONOMY_BALANCE.startingGold,
    lives: ECONOMY_BALANCE.startingLives,
  };
}
