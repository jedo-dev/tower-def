import { describe, expect, it } from 'vitest';
import type { SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';
import { TowerTypeId } from '../../../shared/types/content-ids';
import {
  WAVE_TOWER_FALLBACK_NAME,
  WAVE_TOWER_LOCKED_NOTE,
  mapWaveTowerInfo,
} from './mapWaveTowerInfo';

function tower(overrides: Partial<SelectedTowerSnapshot> = {}): SelectedTowerSnapshot {
  return {
    id: 'tower:1:1',
    type: TowerTypeId.SINGLE,
    level: 2,
    position: { x: 1, y: 1 },
    cost: 50,
    combatStats: { damage: 14, range: 3, attackCooldownMs: 900 },
    availableBranches: [],
    chosenBranchId: null,
    ...overrides,
  };
}

describe('mapWaveTowerInfo', () => {
  it('names the tower, its level and damage, and says actions wait for the build phase', () => {
    const info = mapWaveTowerInfo(tower({ name: 'Bone Archer' }));

    expect(info.name).toBe('Bone Archer');
    expect(info.detail).toBe('Lv 2 · 14 dmg');
    expect(info.note).toBe(WAVE_TOWER_LOCKED_NOTE);
    expect(info.ariaLabel).toBe(`Bone Archer, level 2, 14 damage. ${WAVE_TOWER_LOCKED_NOTE}`);
  });

  it('falls back to a generic name for a tower without authored content', () => {
    expect(mapWaveTowerInfo(tower()).name).toBe(WAVE_TOWER_FALLBACK_NAME);
  });
});
