import { describe, expect, it } from 'vitest';
import { resolveBuildableTowerById } from '../../../entities/tower';
import { resolveUnitConfigById } from '../../../entities/unit';
import { DamageType } from '../../../shared/types/content-ids';
import { stepCodexEntry } from './codexNavigation';
import { mapUnitToCreepCard } from './creepCards';
import { creatureBodyReadings, formatStatDelta, towerAttackReadings } from './statReadings';
import { getTierEconomy } from './tierEconomy';
import { mapTowerToTowerCard } from './towerCards';

describe('formatStatDelta', () => {
  it('signs and tones a change, with reload better when it drops', () => {
    expect(formatStatDelta(30, 20, 0)).toEqual({ text: '+10', tone: 'good' });
    expect(formatStatDelta(5, 6, 1)).toEqual({ text: '−1', tone: 'bad' });
    expect(formatStatDelta(0.75, 0.8, 2, { lowerIsBetter: true })).toEqual({
      text: '−0.05',
      tone: 'good',
    });
    expect(formatStatDelta(6.2, 6.2, 1)).toEqual({ text: '±0', tone: 'neutral' });
  });
});

describe('tower attack readings', () => {
  it('shows percent damage as a bare share of max HP with a point delta', () => {
    const [damage] = towerAttackReadings(
      { damage: 9, range: 6, attackCooldownMs: 1000 },
      { damage: 6, range: 6, attackCooldownMs: 1000 },
      DamageType.PERCENT,
    );

    expect(damage).toMatchObject({ key: 'percent', value: '0.9%', delta: { text: '+0.3%' } });
  });

  it('shows dashes and no deltas for a support level without an attack', () => {
    const readings = towerAttackReadings(
      { damage: 0, range: 6, attackCooldownMs: 1000 },
      { damage: 0, range: 6, attackCooldownMs: 1000 },
      DamageType.MAGICAL,
    );

    expect(readings.map((reading) => [reading.value, reading.delta])).toEqual([
      ['—', null],
      ['—', null],
      ['—', null],
    ]);
  });
});

describe('codex tiles and level columns', () => {
  it('gives a tower tile damage, range and reload, and its header the build cost too', () => {
    const archer = resolveBuildableTowerById('undead_bone_archer_tower');
    const card = mapTowerToTowerCard(archer);

    expect(card.tileStats.map((stat) => [stat.key, stat.value])).toEqual([
      ['physical', String(archer.damage)],
      ['range', String(archer.range)],
      ['reload', `${archer.attackCooldownMs / 1000}s`],
    ]);
    expect(card.headerStats[3]).toMatchObject({ key: 'gold', value: String(archer.costGold) });
  });

  it('prices level 1 at the build cost and compares each level with the one before', () => {
    const archer = resolveBuildableTowerById('undead_bone_archer_tower');
    const [levelOne, levelTwo] = mapTowerToTowerCard(archer).levels;

    expect(levelOne.cost).toBe(archer.costGold);
    expect(levelOne.stats.every((stat) => stat.delta === null)).toBe(true);
    expect(levelTwo.cost).toBe(archer.levels?.[1]?.upgradeCostGold);
    expect(levelTwo.stats[0].delta).toEqual({ text: '+10', tone: 'good' });
  });

  it('lists a level extra only when it changes from the level before', () => {
    const nest = mapTowerToTowerCard(resolveBuildableTowerById('undead_frost_wyrm_nest'));
    const archer = mapTowerToTowerCard(resolveBuildableTowerById('undead_bone_archer_tower'));

    expect(nest.levels[1].special).toMatch(/^chill 45% slower/);
    expect(archer.levels.map((level) => level.special)).toEqual([null, null, null]);
  });

  it('gives a creature tile HP, speed and send cost, and its header both armors', () => {
    const skeleton = resolveUnitConfigById('undead_skeleton');
    const card = mapUnitToCreepCard(skeleton);

    expect(card.traitsLabel).toBe('Ground · Small');
    expect(card.tileStats.map((stat) => [stat.key, stat.value])).toEqual([
      ['health', String(skeleton.health)],
      ['speed', String(skeleton.speed)],
      ['gold', String(getTierEconomy(skeleton.tier).sendCost)],
    ]);
    expect(card.bodyStats).toEqual(creatureBodyReadings(skeleton, null));
  });
});

describe('stepCodexEntry', () => {
  it('wraps around the roster both ways', () => {
    expect(stepCodexEntry({ kind: 'tower', index: 0 }, -1, 4)).toEqual({ kind: 'tower', index: 3 });
    expect(stepCodexEntry({ kind: 'creep', index: 7 }, 1, 8)).toEqual({ kind: 'creep', index: 0 });
    expect(stepCodexEntry({ kind: 'creep', index: 2 }, 1, 8)).toEqual({ kind: 'creep', index: 3 });
  });
});
