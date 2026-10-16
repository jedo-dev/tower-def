import { describe, expect, it } from 'vitest';
import { recalculateTowerAuras } from './auras';
import {
  getTowerKillBonusGold,
  getTowersIncomePerRound,
  resolveTowerSellRefundRatio,
} from './auraEconomy';
import { getTowerArchetype, TOWER_COMBAT_STATS_BY_TYPE, type TowerEntity } from './types';
import type { TowerAuraDefinition } from './content/loadTowerContent';
import { DamageScope, TowerAuraStacking, TowerTypeId } from '../../../shared/types/content-ids';
import { TOWER_ABILITY_BALANCE } from '../../../shared/constants/towerAbilities';

const BASE_AURA = getTowerArchetype(TowerTypeId.SUPPORT).aura!;

function createTower(
  id: string,
  type: TowerTypeId,
  position: { x: number; y: number },
  aura?: Partial<TowerAuraDefinition>,
): TowerEntity {
  return {
    id,
    position,
    cost: 50,
    type,
    level: 1,
    combatStats: {
      ...TOWER_COMBAT_STATS_BY_TYPE[type],
      ...(aura === undefined ? {} : { aura: { ...BASE_AURA, ...aura } }),
    },
  };
}

describe('aura damage bonus', () => {
  it('raises the damage of towers whose damage type the bonus covers', () => {
    const archer = createTower('archer', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const frost = createTower('frost', TowerTypeId.FROST, { x: 3, y: 1 });
    const support = createTower(
      'support',
      TowerTypeId.SUPPORT,
      { x: 2, y: 1 },
      {
        damagePercentBonus: 0.2,
        damageBonusType: DamageScope.PHYSICAL,
      },
    );
    const archerDamage = archer.combatStats.damage;
    const frostDamage = frost.combatStats.damage;

    recalculateTowerAuras([archer, frost, support]);

    expect(archer.combatStats.damage).toBeCloseTo(archerDamage * 1.2);
    expect(archer.auraBonus?.damagePercentBonus).toBe(0.2);
    expect(frost.combatStats.damage).toBe(frostDamage);
    expect(frost.auraBonus).not.toHaveProperty('damagePercentBonus');
  });

  it('covers every type when no type is given and stacks with a stacking aura', () => {
    const frost = createTower('frost', TowerTypeId.FROST, { x: 2, y: 2 });
    const stacking = { damagePercentBonus: 0.1, stacking: TowerAuraStacking.STACK };
    const first = createTower('s1', TowerTypeId.SUPPORT, { x: 1, y: 2 }, stacking);
    const second = createTower('s2', TowerTypeId.SUPPORT, { x: 3, y: 2 }, stacking);
    const frostDamage = frost.combatStats.damage;

    recalculateTowerAuras([frost, first, second]);

    expect(frost.combatStats.damage).toBeCloseTo(frostDamage * 1.2);
  });

  it('never compounds across recalculations', () => {
    const archer = createTower('archer', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const support = createTower(
      'support',
      TowerTypeId.SUPPORT,
      { x: 2, y: 1 },
      {
        damagePercentBonus: 0.5,
      },
    );
    const archerDamage = archer.combatStats.damage;

    recalculateTowerAuras([archer, support]);
    recalculateTowerAuras([archer, support]);

    expect(archer.combatStats.damage).toBeCloseTo(archerDamage * 1.5);
  });
});

describe('aura economy', () => {
  it('pays extra gold per kill to towers in radius only', () => {
    const near = createTower('near', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const far = createTower('far', TowerTypeId.SINGLE, { x: 15, y: 15 });
    const support = createTower(
      'support',
      TowerTypeId.SUPPORT,
      { x: 2, y: 1 },
      {
        goldPerKill: 3,
      },
    );

    recalculateTowerAuras([near, far, support]);

    expect(getTowerKillBonusGold(near)).toBe(3);
    expect(getTowerKillBonusGold(far)).toBe(0);
  });

  it('raises the sell refund ratio of towers in radius, capped', () => {
    const near = createTower('near', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const support = createTower(
      'support',
      TowerTypeId.SUPPORT,
      { x: 2, y: 1 },
      {
        sellRefundBonus: 0.2,
      },
    );

    expect(resolveTowerSellRefundRatio(near, 0.5)).toBe(0.5);
    recalculateTowerAuras([near, support]);
    expect(resolveTowerSellRefundRatio(near, 0.5)).toBeCloseTo(0.7);
    expect(resolveTowerSellRefundRatio(near, 0.95)).toBe(TOWER_ABILITY_BALANCE.maxSellRefundRatio);
  });

  it('adds every standing income aura to the round income', () => {
    const towers = [
      createTower('s1', TowerTypeId.SUPPORT, { x: 1, y: 1 }, { incomePerRound: 4 }),
      createTower('s2', TowerTypeId.SUPPORT, { x: 9, y: 9 }, { incomePerRound: 6 }),
      createTower('archer', TowerTypeId.SINGLE, { x: 5, y: 5 }),
    ];

    expect(getTowersIncomePerRound(towers)).toBe(10);
    expect(getTowersIncomePerRound([])).toBe(0);
  });

  it('leaves a plain aura bonus shape untouched by the extensions', () => {
    const archer = createTower('archer', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const support = createTower('support', TowerTypeId.SUPPORT, { x: 2, y: 1 });

    recalculateTowerAuras([archer, support]);

    expect(Object.keys(archer.auraBonus ?? {}).sort()).toEqual(['attackSpeedBonus', 'rangeBonus']);
  });
});
