import { describe, expect, it } from 'vitest';
import { RACE_IDS, RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import {
  CREEP_SOUND_SLOTS,
  CreepSoundSlot,
  TOWER_SOUND_SLOTS,
  TowerSoundSlot,
  type SoundId,
} from '../../../shared/types/sound-ids';
import { resolveCreepSound, resolveTowerSound } from './resolveSound';
import { SOUND_PROFILE_LIBRARY } from './soundProfileLibrary';
import type { RaceSoundProfile, SoundProfileLibrary } from './soundProfile.types';

/** One distinct clip per fallback step, so each assertion names the step that won. */
const STEP = {
  tower: 'ui.click',
  raceArchetype: 'ui.hover',
  race: 'ui.open',
  defaultArchetype: 'ui.close',
  defaultBase: 'ui.error',
  creepRace: 'ui.success',
  creepDefault: 'ui.victory',
} as const satisfies Record<string, SoundId>;

function emptyRaceProfile(race: RaceId): RaceSoundProfile {
  return { race, sounds: {}, archetypes: {} };
}

function createLibrary(orcProfile: Partial<RaceSoundProfile> = {}): SoundProfileLibrary {
  const races = Object.fromEntries(
    RACE_IDS.map((race) => [race, emptyRaceProfile(race)]),
  ) as Record<RaceId, RaceSoundProfile>;
  races[RaceId.ORC] = { ...emptyRaceProfile(RaceId.ORC), ...orcProfile };

  return {
    defaultProfile: {
      sounds: {
        attack: STEP.defaultBase,
        impact: STEP.defaultBase,
        build: STEP.defaultBase,
        sell: STEP.defaultBase,
        upgrade: STEP.defaultBase,
        creepHit: STEP.creepDefault,
        creepDeath: STEP.creepDefault,
        creepEscape: STEP.creepDefault,
      },
      archetypes: { [TowerTypeId.FROST]: { attack: STEP.defaultArchetype } },
    },
    races,
  };
}

const ORC_WITH_EVERY_LAYER: Partial<RaceSoundProfile> = {
  sounds: { attack: STEP.race, creepDeath: STEP.creepRace },
  archetypes: { [TowerTypeId.FROST]: { attack: STEP.raceArchetype } },
};

describe('resolveTowerSound fallback chain', () => {
  const attack = TowerSoundSlot.ATTACK;

  it('1. prefers the tower override over everything else', () => {
    const library = createLibrary(ORC_WITH_EVERY_LAYER);

    expect(
      resolveTowerSound(library, RaceId.ORC, TowerTypeId.FROST, { attack: STEP.tower }, attack),
    ).toBe(STEP.tower);
  });

  it('2. uses the race archetype entry when the tower has no override for the slot', () => {
    const library = createLibrary(ORC_WITH_EVERY_LAYER);

    expect(
      resolveTowerSound(library, RaceId.ORC, TowerTypeId.FROST, { sell: STEP.tower }, attack),
    ).toBe(STEP.raceArchetype);
  });

  it('3. uses the race-wide sound when the race has no entry for the archetype', () => {
    const library = createLibrary(ORC_WITH_EVERY_LAYER);

    expect(resolveTowerSound(library, RaceId.ORC, TowerTypeId.SINGLE, undefined, attack)).toBe(
      STEP.race,
    );
  });

  it('4. uses the default archetype entry when the race profile is silent', () => {
    const library = createLibrary();

    expect(resolveTowerSound(library, RaceId.ORC, TowerTypeId.FROST, undefined, attack)).toBe(
      STEP.defaultArchetype,
    );
  });

  it('5. ends at the default profile sound', () => {
    const library = createLibrary();

    expect(resolveTowerSound(library, RaceId.ORC, TowerTypeId.SINGLE, undefined, attack)).toBe(
      STEP.defaultBase,
    );
  });

  it('keeps races apart: one race profile never leaks into another', () => {
    const library = createLibrary(ORC_WITH_EVERY_LAYER);

    expect(resolveTowerSound(library, RaceId.ELF, TowerTypeId.FROST, undefined, attack)).toBe(
      STEP.defaultArchetype,
    );
  });
});

describe('resolveCreepSound fallback chain', () => {
  it('uses the creature race profile first', () => {
    const library = createLibrary(ORC_WITH_EVERY_LAYER);

    expect(resolveCreepSound(library, RaceId.ORC, CreepSoundSlot.DEATH)).toBe(STEP.creepRace);
  });

  it('falls back to the default when the race does not set the slot', () => {
    const library = createLibrary(ORC_WITH_EVERY_LAYER);

    expect(resolveCreepSound(library, RaceId.ORC, CreepSoundSlot.ESCAPE)).toBe(STEP.creepDefault);
  });

  it('uses the default for a creature with no known race', () => {
    const library = createLibrary(ORC_WITH_EVERY_LAYER);

    expect(resolveCreepSound(library, undefined, CreepSoundSlot.DEATH)).toBe(STEP.creepDefault);
  });
});

describe('authored sound profiles', () => {
  it('resolve every slot for every race and archetype', () => {
    for (const race of RACE_IDS) {
      for (const archetype of Object.values(TowerTypeId)) {
        for (const slot of TOWER_SOUND_SLOTS) {
          expect(
            resolveTowerSound(SOUND_PROFILE_LIBRARY, race, archetype, undefined, slot),
          ).toBeTypeOf('string');
        }
      }
      for (const slot of CREEP_SOUND_SLOTS) {
        expect(resolveCreepSound(SOUND_PROFILE_LIBRARY, race, slot)).toBeTypeOf('string');
      }
    }
  });
});
