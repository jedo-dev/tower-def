import { describe, expect, it } from 'vitest';
import { resolveUnitConfigById, type UnitConfig } from '../../../../../entities/unit';
import { getUnitsByFaction } from '../../../../../entities/unit';
import { RaceId } from '../../../../types/content-ids';
import { createWaveCreepEntity, scheduleWaveSpawns, takeReadyWaveSpawns } from './waveSpawnCore';

const units: readonly UnitConfig[] = getUnitsByFaction(RaceId.UNDEAD);

describe('shared/lib/phaser/runtime/wave/waveSpawnCore', () => {
  it('spaces spawns evenly and tags only the sent units with a sender', () => {
    const baseline = units.slice(0, 2);
    const sent = [resolveUnitConfigById(units[0].id)];
    const spawns = scheduleWaveSpawns(baseline, sent, 'player', {
      firstSpawnAtMs: 100,
      spawnIntervalMs: 50,
    });

    expect(spawns.map((spawn) => spawn.spawnAtMs)).toEqual([100, 150, 200]);
    expect(spawns.map((spawn) => spawn.sender)).toEqual([undefined, undefined, 'player']);
  });

  it('splits the schedule into due and waiting spawns', () => {
    const spawns = scheduleWaveSpawns(units.slice(0, 3), [], 'opponent', {
      firstSpawnAtMs: 0,
      spawnIntervalMs: 100,
    });
    const { ready, pending } = takeReadyWaveSpawns(spawns, 100);

    expect(ready.map((spawn) => spawn.sequenceIndex)).toEqual([0, 1]);
    expect(pending.map((spawn) => spawn.sequenceIndex)).toEqual([2]);
  });

  it('places the creep on the first route cell with the unit stats', () => {
    const [spawn] = scheduleWaveSpawns([units[0]], [], 'opponent', {
      firstSpawnAtMs: 0,
      spawnIntervalMs: 0,
    });
    const route = [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ];
    const creep = createWaveCreepEntity(spawn, 4, route, 'basic');

    expect(creep.id).toBe('wave:creep:4:0');
    expect(creep.position).toEqual({ x: 2, y: 3 });
    expect(creep.hp).toBe(units[0].health);
    expect(creep.remainingRouteDistance).toBe(1);
    expect(creep.sender).toBeUndefined();
  });
});
