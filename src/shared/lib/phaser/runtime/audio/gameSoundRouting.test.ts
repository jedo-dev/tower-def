import { describe, expect, it } from 'vitest';
import { RACE_IDS, RaceId, TowerTypeId } from '../../../../types/content-ids';
import { CreepSoundSlot, TowerSoundSlot, type SoundId } from '../../../../types/sound-ids';
import type { RaceSoundProfile, SoundProfileLibrary } from '../../../../../entities/sound-profile';
import type { TowerEntity } from '../../../../../entities/tower';
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
});
