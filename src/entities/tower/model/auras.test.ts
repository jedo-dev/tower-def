import { describe, expect, it } from 'vitest';
import { recalculateTowerAuras, resolveTowerAuraBonus } from './auras';
import { getTowerArchetype, TOWER_COMBAT_STATS_BY_TYPE, type TowerEntity } from './types';
import { TowerTypeId } from '../../../shared/types/content-ids';

const SUPPORT_AURA = getTowerArchetype(TowerTypeId.SUPPORT).aura!;

function createTower(
  id: string,
  type: TowerTypeId,
  position: { x: number; y: number },
): TowerEntity {
  return {
    id,
    position,
    cost: 50,
    type,
    level: 1,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[type] },
  };
}

describe('support auras', () => {
  it('buffs range and attack speed of a tower inside the radius', () => {
    const archer = createTower('tower:archer', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const support = createTower('tower:support', TowerTypeId.SUPPORT, { x: 2, y: 1 });
    const baseStats = { ...archer.combatStats };

    recalculateTowerAuras([archer, support]);

    expect(archer.combatStats.range).toBe(baseStats.range + SUPPORT_AURA.rangeBonus);
    expect(archer.combatStats.attackCooldownMs).toBeLessThan(baseStats.attackCooldownMs);
    expect(archer.baseCombatStats).toEqual(baseStats);
  });

  it('leaves a tower outside the radius alone', () => {
    const archer = createTower('tower:archer', TowerTypeId.SINGLE, { x: 9, y: 9 });
    const support = createTower('tower:support', TowerTypeId.SUPPORT, { x: 1, y: 1 });
    const baseStats = { ...archer.combatStats };

    recalculateTowerAuras([archer, support]);

    expect(archer.combatStats).toEqual(baseStats);
    expect(archer.auraBonus).toBeUndefined();
  });

  it('never buffs the support tower itself', () => {
    const support = createTower('tower:support', TowerTypeId.SUPPORT, { x: 1, y: 1 });
    const otherSupport = createTower('tower:support:2', TowerTypeId.SUPPORT, { x: 2, y: 1 });

    recalculateTowerAuras([support, otherSupport]);

    expect(support.auraBonus).toBeUndefined();
    expect(otherSupport.auraBonus).toBeUndefined();
  });

  it('keeps the strongest aura rather than adding two overlapping ones', () => {
    const archer = createTower('tower:archer', TowerTypeId.SINGLE, { x: 2, y: 2 });
    const firstSupport = createTower('tower:support:1', TowerTypeId.SUPPORT, { x: 1, y: 2 });
    const secondSupport = createTower('tower:support:2', TowerTypeId.SUPPORT, { x: 3, y: 2 });

    const singleBonus = resolveTowerAuraBonus(archer, [archer, firstSupport]);
    const doubleBonus = resolveTowerAuraBonus(archer, [archer, firstSupport, secondSupport]);

    expect(doubleBonus).toEqual(singleBonus);
  });

  it('drops the buff when the support tower is sold', () => {
    const archer = createTower('tower:archer', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const support = createTower('tower:support', TowerTypeId.SUPPORT, { x: 2, y: 1 });
    const baseStats = { ...archer.combatStats };

    recalculateTowerAuras([archer, support]);
    recalculateTowerAuras([archer]);

    expect(archer.combatStats).toEqual(baseStats);
    expect(archer.auraBonus).toBeUndefined();
  });

  it('does not compound when recalculated repeatedly', () => {
    const archer = createTower('tower:archer', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const support = createTower('tower:support', TowerTypeId.SUPPORT, { x: 2, y: 1 });

    recalculateTowerAuras([archer, support]);
    const afterFirstPass = { ...archer.combatStats };

    recalculateTowerAuras([archer, support]);
    recalculateTowerAuras([archer, support]);

    expect(archer.combatStats).toEqual(afterFirstPass);
  });

  it('applies the aura to the new level after an upgrade', () => {
    const archer = createTower('tower:archer', TowerTypeId.SINGLE, { x: 1, y: 1 });
    const support = createTower('tower:support', TowerTypeId.SUPPORT, { x: 2, y: 1 });

    recalculateTowerAuras([archer, support]);

    const upgradedStats = { ...archer.baseCombatStats!, damage: 30, range: 3.4 };
    archer.combatStats = { ...upgradedStats };
    archer.baseCombatStats = { ...upgradedStats };
    recalculateTowerAuras([archer, support]);

    expect(archer.combatStats.damage).toBe(30);
    expect(archer.combatStats.range).toBe(upgradedStats.range + SUPPORT_AURA.rangeBonus);
  });
});
