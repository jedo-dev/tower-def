import { describe, expect, it } from 'vitest';
import { getTowerArchetype, getTowerStatsForLevel } from '../../../entities/tower';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { mapTowerNextLevelPreview } from './mapTowerNextLevelPreview';

function previewFor(towerType: TowerTypeId, level = 1) {
  const current = getTowerStatsForLevel(towerType, level)!;
  const next = getTowerStatsForLevel(towerType, level + 1)!;
  return { current, next, preview: mapTowerNextLevelPreview(towerType, current, next, level + 1) };
}

describe('mapTowerNextLevelPreview', () => {
  it('signs each changed stat and skips the unchanged ones', () => {
    const { current, next, preview } = previewFor(TowerTypeId.SPLASH, 1);

    expect(preview.level).toBe(2);
    const byKey = Object.fromEntries(preview.statDeltas.map((delta) => [delta.key, delta]));
    expect(byKey.damage?.delta).toBe(`+${next.damage - current.damage}`);
    expect(byKey.cooldown?.delta).toBe(`-${current.attackCooldownMs - next.attackCooldownMs}ms`);
    // Level 1 -> 2 keeps the splash radius: no AOE delta.
    expect(current.splashRadius).toBe(next.splashRadius);
    expect(byKey.splash).toBeUndefined();
  });

  it('reports no attack stat deltas for a support tower, only its aura', () => {
    const { preview } = previewFor(TowerTypeId.SUPPORT);

    expect(preview.statDeltas).toEqual([]);
    expect(preview.effectLines.map((line) => line.label)).toEqual(['AURA']);
  });

  it('derives the chain jumps from the next level damage and the fixed falloff', () => {
    const { next, preview } = previewFor(TowerTypeId.CHAIN);
    const chain = getTowerArchetype(TowerTypeId.CHAIN).chain!;
    const firstJump = Math.round(next.damage * (1 - chain.damageFalloff));

    const arcs = preview.effectLines.find((line) => line.key === 'chain-arcs');
    expect(arcs?.value.startsWith(`jumps ${firstJump}/`)).toBe(true);
    expect(arcs?.value.split('/')).toHaveLength(chain.bounces);
  });

  it('carries the changed poison line', () => {
    const { preview } = previewFor(TowerTypeId.POISON);

    expect(preview.effectLines.map((line) => line.label)).toContain('POISON');
  });
});
