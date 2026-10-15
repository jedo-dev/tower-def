import { describe, expect, it } from 'vitest';
import { RaceId, TowerTargetScope, TowerTypeId } from '../../../shared/types/content-ids';
import { resolveBuildableTowerById } from '../../tower/model/config/buildableTowers';
import { resolveTowerPlacementStats } from '../../tower/model/placementStats';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { getRaceTowerConfig, getRaceTowerTargetScope } from './buildSpendBudget';
import { createComputerTowerEntity } from './computerTowerEntity';
import { collectInvestmentTypes, toLedgerTowers } from './damage-placement';

// The computer opponent builds from the same authored content as the player:
// a race tower's price, target scope and stats (tower-def-xwc.5 tunes the
// archers per race), never the archetype defaults alone.
describe('entities/computer-opponent authored race towers', () => {
  const anchor = { x: 4, y: 6 };

  it('stamps a placed tower with its authored id, scope and level 1 stats', () => {
    const human = createComputerTowerEntity('t', TowerTypeId.SINGLE, anchor, 50, RaceId.HUMAN);
    const authored = resolveBuildableTowerById('human_guard_archer_tower');

    expect(human.buildableTowerId).toBe('human_guard_archer_tower');
    expect(human.allowedTargets).toBe(authored.allowedTargets);
    expect(human.combatStats).toEqual(resolveTowerPlacementStats(TowerTypeId.SINGLE, authored));
    expect(human.combatStats.damage).toBe(authored.damage);
    expect(human.position).toEqual(anchor);
    expect(human.cost).toBe(50);
  });

  it('falls back to the archetype for a type the race cannot build', () => {
    const tower = createComputerTowerEntity('t', TowerTypeId.CHAIN, anchor, 85, RaceId.HUMAN);

    expect(tower.buildableTowerId).toBeUndefined();
    expect(tower.allowedTargets).toBeUndefined();
    expect(tower.combatStats).toEqual(TOWER_COMBAT_STATS_BY_TYPE.chain);
    expect(getRaceTowerConfig(TowerTypeId.CHAIN, RaceId.HUMAN)).toBeNull();
    expect(getRaceTowerTargetScope(TowerTypeId.CHAIN, RaceId.HUMAN)).toBe(TowerTargetScope.BOTH);
  });

  it('prices and scopes investment types from the race file', () => {
    const types = collectInvestmentTypes([TowerTypeId.CHAIN, TowerTypeId.SINGLE], RaceId.ORC);
    const archer = resolveBuildableTowerById('orc_spear_watchtower');
    const totem = resolveBuildableTowerById('orc_lightning_totem');

    expect(types.map((type) => type.towerType)).toEqual([TowerTypeId.SINGLE, TowerTypeId.CHAIN]);
    expect(types[0]).toEqual({
      towerType: TowerTypeId.SINGLE,
      cost: archer.costGold,
      stats: resolveTowerPlacementStats(TowerTypeId.SINGLE, archer),
      allowedTargets: archer.allowedTargets,
    });
    expect(types[1].allowedTargets).toBe(totem.allowedTargets);
  });

  it('reads an upgraded tower off its race curve in the damage ledger', () => {
    const tower = createComputerTowerEntity('t', TowerTypeId.SINGLE, anchor, 50, RaceId.HUMAN);
    const authored = resolveBuildableTowerById('human_guard_archer_tower');
    const [ledgerTower] = toLedgerTowers([{ ...tower, level: 2 }]);

    expect(authored.levels?.[1]).toBeDefined();
    expect(ledgerTower.stats).toEqual(authored.levels?.[1]?.stats);
    expect(ledgerTower.allowedTargets).toBe(authored.allowedTargets);
  });

  it('keeps every race on its own archer curve', () => {
    const damageByRace = Object.fromEntries(
      [RaceId.UNDEAD, RaceId.ORC, RaceId.HUMAN, RaceId.ELF].map((raceId) => [
        raceId,
        createComputerTowerEntity('t', TowerTypeId.SINGLE, anchor, 50, raceId).combatStats.damage,
      ]),
    );

    // Human archers, the race's only lever against fliers, hit hardest; the
    // undead, whose chill and aura stack on the air line, hit softest.
    expect(damageByRace[RaceId.HUMAN]).toBeGreaterThan(damageByRace[RaceId.ELF]);
    expect(damageByRace[RaceId.UNDEAD]).toBeLessThan(damageByRace[RaceId.ELF]);
    expect(damageByRace[RaceId.ELF]).toBe(TOWER_COMBAT_STATS_BY_TYPE.single.damage);
  });
});
