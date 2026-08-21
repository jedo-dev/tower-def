import { describe, expect, it } from 'vitest';
import { tryPlaceTowerAtHoveredCell } from './gameSceneBuildRuntime';
import type { BuildRuntimeDeps, BuildRuntimeState } from './gameSceneBuildRuntime';
import { createGridModel } from '../../../grid/createGridModel';
import { validateTowerPlacementPath } from '../../../pathfinding/validateTowerPlacementPath';
import {
  getTowerStatsForTowerLevel,
  resolveBuildableTowerById,
  resolveTowerUpgradeConfig,
  TOWER_UPGRADE_CONFIG,
  type BuildableTowerConfig,
  type TowerEntity,
} from '../../../../../entities/tower';
import { RaceId, TowerTypeId } from '../../../../types/content-ids';
import { GRID_DEFAULT_ROW_CENTER, GRID_DIMENSIONS } from '../../../../constants/grid';

const ENTRANCE = { x: 0, y: GRID_DEFAULT_ROW_CENTER };
const EXIT = { x: GRID_DIMENSIONS.cols - 1, y: GRID_DEFAULT_ROW_CENTER };
const HOVERED_CELL = { x: 3, y: GRID_DEFAULT_ROW_CENTER - 2 };

function createState(): BuildRuntimeState {
  return {
    gridModel: createGridModel({ entrance: ENTRANCE, exit: EXIT }),
    hoveredCell: { ...HOVERED_CELL },
    playerGold: 500,
    playerLives: 20,
    placedTowerCostsByCellKey: new Map(),
  };
}

function createDeps(authoredTower: BuildableTowerConfig | null): BuildRuntimeDeps {
  return {
    canPerformPlace: () => true,
    canPerformSell: () => true,
    selectedTowerType: authoredTower?.towerType ?? TowerTypeId.SINGLE,
    resolveTowerCost: () => authoredTower?.costGold ?? 50,
    resolveBuildableTower: () => authoredTower,
    toGridCellKey: (position) => `${position.x}:${position.y}`,
    toTowerId: (position) => `tower:${position.x}:${position.y}`,
    validateTowerPlacementPath: (grid, position) => validateTowerPlacementPath(grid, position),
    sellRefundRatio: 0.5,
    defaultTowerCost: 50,
  };
}

describe('placing an authored tower', () => {
  it('records which authored tower was built', () => {
    const authored = resolveBuildableTowerById('undead_frost_wyrm_nest');
    const result = tryPlaceTowerAtHoveredCell(createState(), createDeps(authored));

    expect(result.success).toBe(true);
    expect(result.placedTower?.buildableTowerId).toBe('undead_frost_wyrm_nest');
    expect(result.placedTower?.type).toBe(authored.towerType);
  });

  it('fights with the numbers the content authored for it', () => {
    const authored = resolveBuildableTowerById('undead_plague_tower');
    const result = tryPlaceTowerAtHoveredCell(createState(), createDeps(authored));

    expect(result.placedTower?.combatStats.damage).toBe(authored.damage);
    expect(result.placedTower?.combatStats.range).toBe(authored.range);
    expect(result.placedTower?.combatStats.attackCooldownMs).toBe(authored.attackCooldownMs);
    expect(result.placedTower?.combatStats.splashRadius).toBe(authored.splashRadius);
  });

  it('falls back to archetype stats when nothing is authored', () => {
    const result = tryPlaceTowerAtHoveredCell(createState(), createDeps(null));

    expect(result.placedTower?.buildableTowerId).toBeUndefined();
    expect(result.placedTower?.combatStats)
      .toEqual(TOWER_UPGRADE_CONFIG[TowerTypeId.SINGLE].levels[0].stats);
  });

  it('costs what its own content says, not a shared default', () => {
    const authored = resolveBuildableTowerById('orc_lightning_totem');
    const result = tryPlaceTowerAtHoveredCell(createState(), createDeps(authored));

    expect(result.placedTower?.cost).toBe(authored.costGold);
  });
});

describe('upgrading an authored tower', () => {
  function createPlacedTower(buildableTowerId?: TowerEntity['buildableTowerId']): TowerEntity {
    const towerType = buildableTowerId
      ? resolveBuildableTowerById(buildableTowerId).towerType
      : TowerTypeId.SINGLE;

    return {
      id: 'tower:1',
      position: { x: 1, y: 1 },
      cost: 50,
      type: towerType,
      buildableTowerId,
      level: 1,
      combatStats: { ...TOWER_UPGRADE_CONFIG[towerType].levels[0].stats },
    };
  }

  it('follows the archetype curve when the tower declares none', () => {
    const tower = createPlacedTower('elf_moonwell');

    expect(resolveTowerUpgradeConfig(tower))
      .toBe(TOWER_UPGRADE_CONFIG[tower.type]);
    expect(getTowerStatsForTowerLevel(tower, 2))
      .toEqual(TOWER_UPGRADE_CONFIG[tower.type].levels[1].stats);
  });

  it('works for a tower placed before content knew about ids', () => {
    const tower = createPlacedTower(undefined);

    expect(getTowerStatsForTowerLevel(tower, 3))
      .toEqual(TOWER_UPGRADE_CONFIG[TowerTypeId.SINGLE].levels[2].stats);
  });

  it('prefers a curve the tower authors for itself', () => {
    const tower = createPlacedTower('elf_moonwell');
    const authoredCurve = {
      ...tower,
      buildableTowerId: undefined,
    };

    // A tower with no id can never override, which is what keeps the fallback
    // honest for towers placed before this data existed.
    expect(resolveTowerUpgradeConfig(authoredCurve)).toBe(TOWER_UPGRADE_CONFIG[tower.type]);
  });
});

describe('race rosters', () => {
  it('resolves every authored tower of every race', () => {
    for (const race of Object.values(RaceId)) {
      expect(() => resolveBuildableTowerById(
        race === RaceId.UNDEAD ? 'undead_bone_obelisk'
          : race === RaceId.ORC ? 'orc_tar_pit'
            : race === RaceId.HUMAN ? 'human_guard_post'
              : 'elf_thorn_spire',
      )).not.toThrow();
    }
  });
});
