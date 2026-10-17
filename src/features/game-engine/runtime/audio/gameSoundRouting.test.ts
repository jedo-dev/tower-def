import { describe, expect, it } from 'vitest';
import { RACE_IDS, RaceId, TowerTypeId } from '../../../../shared/types/content-ids';
import { CreepSoundSlot, TowerSoundSlot, type SoundId } from '../../../../shared/types/sound-ids';
import type { RaceSoundProfile, SoundProfileLibrary } from '../../../../entities/sound-profile';
import type { TowerEntity } from '../../../../entities/tower';
import { getAllUnitConfigs } from '../../../../entities/unit';
import { SOUND_REGISTRY } from '../../../../shared/lib/sound-registry';
import { WAVE_SPAWN_INTERVAL_MS } from '../../scenes/gameScene.constants';
import { createGameSoundRouter, resolveTowerEntitySound } from './gameSoundRouting';

const RACE_ATTACK: Record<RaceId, SoundId> = {
  [RaceId.UNDEAD]: 'ui.click',
  [RaceId.ORC]: 'ui.hover',
  [RaceId.HUMAN]: 'ui.open',
  [RaceId.ELF]: 'ui.close',
};

const LIBRARY: SoundProfileLibrary = {
  defaultProfile: {
    sounds: {
      attack: 'ui.error',
      impact: 'ui.error',
      build: 'ui.error',
      sell: 'ui.error',
      upgrade: 'ui.error',
      creepHit: 'ui.error',
      creepDeath: 'ui.victory',
      creepEscape: 'ui.error',
      creepSpawn: 'ui.error',
    },
    archetypes: {},
  },
  races: Object.fromEntries(
    RACE_IDS.map((race): [RaceId, RaceSoundProfile] => [
      race,
      {
        race,
        sounds: { attack: RACE_ATTACK[race], creepDeath: RACE_ATTACK[race] },
        archetypes: {},
      },
    ]),
  ) as Record<RaceId, RaceSoundProfile>,
};

function createTower(overrides: Partial<TowerEntity> = {}): TowerEntity {
  return {
    id: 'tower-1',
    position: { x: 0, y: 0 },
    cost: 50,
    type: TowerTypeId.SINGLE,
    level: 1,
    combatStats: { damage: 10, range: 4, attackCooldownMs: 800 },
    ...overrides,
  };
}

describe('resolveTowerEntitySound', () => {
  it('takes the race from the authored tower, not from the fallback', () => {
    const elfTower = createTower({ buildableTowerId: 'elf_moon_archer_tower' });

    expect(resolveTowerEntitySound(elfTower, RaceId.UNDEAD, TowerSoundSlot.ATTACK, LIBRARY)).toBe(
      RACE_ATTACK[RaceId.ELF],
    );
  });

  it('uses the fallback race for a tower placed without content', () => {
    expect(resolveTowerEntitySound(createTower(), RaceId.ORC, TowerSoundSlot.ATTACK, LIBRARY)).toBe(
      RACE_ATTACK[RaceId.ORC],
    );
  });
});

describe('createGameSoundRouter', () => {
  it('plays the resolved tower and creature clips', () => {
    const played: SoundId[] = [];
    const router = createGameSoundRouter(
      (soundId) => played.push(soundId),
      () => RaceId.HUMAN,
      LIBRARY,
    );

    router.playTowerSound(createTower(), TowerSoundSlot.ATTACK);
    router.playCreepSound({ race: RaceId.ORC }, CreepSoundSlot.DEATH);
    router.playCreepSound({}, CreepSoundSlot.DEATH);

    expect(played).toEqual([RACE_ATTACK[RaceId.HUMAN], RACE_ATTACK[RaceId.ORC], 'ui.victory']);
  });

  it('prefers the creature own sounds, looked up by unit id', () => {
    const played: SoundId[] = [];
    const router = createGameSoundRouter(
      (soundId) => played.push(soundId),
      () => RaceId.HUMAN,
      LIBRARY,
      [{ id: 'orc_grunt', faction: RaceId.ORC, sounds: { creepSpawn: 'ui.wave_start' } }],
    );

    router.playCreepSound({ unitId: 'orc_grunt', race: RaceId.ORC }, CreepSoundSlot.SPAWN);
    router.playCreepSound({ unitId: 'orc_grunt', race: RaceId.ORC }, CreepSoundSlot.DEATH);
    router.playCreepSound({ unitId: 'orc_peon', race: RaceId.ORC }, CreepSoundSlot.SPAWN);

    expect(played).toEqual(['ui.wave_start', RACE_ATTACK[RaceId.ORC], 'ui.error']);
  });

  it('routes the authored orc grunt and spear watchtower to their own clips', () => {
    const played: SoundId[] = [];
    const router = createGameSoundRouter(
      (soundId) => played.push(soundId),
      () => RaceId.ORC,
    );
    const grunt = { unitId: 'orc_grunt', race: RaceId.ORC };

    router.playCreepSound(grunt, CreepSoundSlot.HIT);
    router.playCreepSound(grunt, CreepSoundSlot.DEATH);
    router.playCreepSound(grunt, CreepSoundSlot.ESCAPE);
    router.playCreepSound(grunt, CreepSoundSlot.SPAWN);
    router.playCreepSound({ unitId: 'orc_peon', race: RaceId.ORC }, CreepSoundSlot.DEATH);
    const spear = createTower({ buildableTowerId: 'orc_spear_watchtower' });
    router.playTowerSound(spear, TowerSoundSlot.ATTACK);
    router.playTowerSound(spear, TowerSoundSlot.IMPACT);
    router.playTowerSound(spear, TowerSoundSlot.BUILD);

    expect(played).toEqual([
      'combat.creep.orc_grunt.hit',
      'combat.creep.orc_grunt.death',
      'combat.creep.orc_grunt.escape',
      'combat.creep.orc_grunt.spawn',
      'combat.creep_death.orc',
      'combat.tower.orc_spear_watchtower.attack',
      'combat.tower.orc_spear_watchtower.impact',
      'combat.build.orc',
    ]);
  });
});

describe('sent creature spawn throttling', () => {
  /** Plays of one clip through the per-clip cooldown, as the audio manager applies it. */
  function countPlays(spawnTimesMs: readonly number[], cooldownMs: number): number {
    let plays = 0;
    let lastPlayedAtMs = Number.NEGATIVE_INFINITY;
    for (const nowMs of spawnTimesMs) {
      if (nowMs - lastPlayedAtMs >= cooldownMs) {
        plays += 1;
        lastPlayedAtMs = nowMs;
      }
    }
    return plays;
  }

  it('plays a batch of six sends of one creature once or twice', () => {
    const batch = Array.from({ length: 6 }, (_, index) => index * WAVE_SPAWN_INTERVAL_MS);
    const spawnIds = new Set<SoundId>();
    const router = createGameSoundRouter(
      (soundId) => spawnIds.add(soundId),
      () => RaceId.ORC,
    );

    for (const unit of getAllUnitConfigs()) {
      router.playCreepSound({ unitId: unit.id, race: unit.faction }, CreepSoundSlot.SPAWN);
    }

    for (const soundId of spawnIds) {
      const plays = countPlays(batch, SOUND_REGISTRY[soundId].cooldownMs);
      expect(plays, soundId).toBeGreaterThanOrEqual(1);
      expect(plays, soundId).toBeLessThanOrEqual(2);
    }
  });
});
