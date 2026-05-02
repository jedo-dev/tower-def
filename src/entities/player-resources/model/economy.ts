import type { PlayerResources } from './types';

export type SpendGoldResult = {
  resources: PlayerResources;
  spent: boolean;
};

export type EarlyWaveStartBonusResult = {
  resources: PlayerResources;
  granted: boolean;
};

export function isGameOverByLives(
  resources: Pick<PlayerResources, 'lives'>,
): boolean {
  return resources.lives <= 0;
}

export function subtractLives(
  resources: PlayerResources,
  livesToSubtract: number,
): PlayerResources {
  if (livesToSubtract <= 0) {
    return resources;
  }

  return {
    ...resources,
    lives: Math.max(0, resources.lives - livesToSubtract),
  };
}

export function addGold(
  resources: PlayerResources,
  goldToAdd: number,
): PlayerResources {
  if (goldToAdd <= 0) {
    return resources;
  }

  return {
    ...resources,
    gold: resources.gold + goldToAdd,
  };
}

export function applyEarlyWaveStartBonusPlaceholder(
  resources: PlayerResources,
  bonusGold: number,
  isEligible: boolean,
): EarlyWaveStartBonusResult {
  if (!isEligible || bonusGold <= 0) {
    return {
      resources,
      granted: false,
    };
  }

  return {
    resources: addGold(resources, bonusGold),
    granted: true,
  };
}

export function canSpendGold(
  resources: Pick<PlayerResources, 'gold'>,
  spendAmount: number,
): boolean {
  if (spendAmount <= 0) {
    return true;
  }

  return resources.gold >= spendAmount;
}

export function spendGold(
  resources: PlayerResources,
  spendAmount: number,
): SpendGoldResult {
  if (spendAmount <= 0) {
    return {
      resources,
      spent: true,
    };
  }

  if (!canSpendGold(resources, spendAmount)) {
    return {
      resources,
      spent: false,
    };
  }

  return {
    resources: {
      ...resources,
      gold: resources.gold - spendAmount,
    },
    spent: true,
  };
}
