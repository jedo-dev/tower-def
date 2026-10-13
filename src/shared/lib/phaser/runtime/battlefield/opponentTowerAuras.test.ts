import { describe, expect, it, vi } from 'vitest';
import type { DuelMatchState } from '../../../../../entities/duel-match';
import {
  getTowerArchetype,
  TOWER_COMBAT_STATS_BY_TYPE,
  type TowerEntity,
} from '../../../../../entities/tower';
import { RaceId, TowerTypeId } from '../../../../types/content-ids';
import { createBattlefieldRenderState } from './battlefieldRenderState';
import { rebuildOpponentBattlefieldRenderState } from './battlefieldSpriteFactory';

const SUPPORT_AURA = getTowerArchetype(TowerTypeId.SUPPORT).aura!;

function createSceneStub(): Phaser.Scene {
  const createSprite = (_x: number, _y: number, key: string) => ({
    texture: { key },
    setTint: vi.fn(),
    setDepth: vi.fn(),
    setDisplaySize: vi.fn(),
    setOrigin: vi.fn(),
    setVisible: vi.fn(),
    play: vi.fn(),
    once: vi.fn(),
    destroy: vi.fn(),
  });
  return {
    add: { sprite: createSprite },
    textures: { exists: () => true },
  } as unknown as Phaser.Scene;
}

function createTower(id: string, type: TowerTypeId, x: number): TowerEntity {
  return {
    id,
    position: { x, y: 1 },
    cost: 50,
    type,
    level: 1,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[type] },
  };
}

function createOpponent(towers: TowerEntity[]): DuelMatchState['opponent'] {
  return {
    raceId: RaceId.ORC,
    battlefield: { towers, creeps: [], path: [] },
  } as unknown as DuelMatchState['opponent'];
}

describe('computer battlefield tower auras', () => {
  it('buffs a computer tower inside a support aura, as on the player field', () => {
    const archer = createTower('tower:archer', TowerTypeId.SINGLE, 1);
    const support = createTower('tower:support', TowerTypeId.SUPPORT, 2);
    const baseRange = archer.combatStats.range;
    const field = createBattlefieldRenderState();

    rebuildOpponentBattlefieldRenderState(
      createSceneStub(),
      field,
      createOpponent([archer, support]),
      true,
    );

    const fieldArcher = field.towers.find((tower) => tower.entity.id === archer.id)?.entity;
    expect(fieldArcher?.combatStats.range).toBe(baseRange + SUPPORT_AURA.rangeBonus);
    expect(fieldArcher?.auraBonus).toBeDefined();
  });

  it('leaves the stored duel towers untouched, so rebuilds never stack the bonus', () => {
    const archer = createTower('tower:archer', TowerTypeId.SINGLE, 1);
    const support = createTower('tower:support', TowerTypeId.SUPPORT, 2);
    const baseRange = archer.combatStats.range;
    const opponent = createOpponent([archer, support]);
    const field = createBattlefieldRenderState();

    rebuildOpponentBattlefieldRenderState(createSceneStub(), field, opponent, true);
    rebuildOpponentBattlefieldRenderState(createSceneStub(), field, opponent, true);

    expect(archer.combatStats.range).toBe(baseRange);
    expect(archer.auraBonus).toBeUndefined();
    expect(field.towers[0]?.entity.combatStats.range).toBe(baseRange + SUPPORT_AURA.rangeBonus);
  });
});
