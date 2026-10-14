import { describe, expect, it } from 'vitest';
import { RACE_IDS, RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import {
  loadSoundProfiles,
  parseDefaultSoundProfile,
  parseRaceSoundProfile,
  type SoundProfileSource,
} from './loadSoundProfiles';
import { SOUND_PROFILE_SOURCES } from './soundProfileSources';

const DEFAULT_FILE = 'content/audio/default.json';
const ORC_FILE = 'content/audio/races/orc.json';

type Authored = Record<string, unknown>;

function createDefault(overrides: Authored = {}): Authored {
  return {
    schemaVersion: 1,
    sounds: {
      attack: 'ui.click',
      impact: 'ui.click',
      build: 'ui.success',
      sell: 'economy.refund',
      upgrade: 'ui.success',
      creepHit: 'ui.hover',
      creepDeath: 'ui.open',
      creepEscape: 'ui.error',
    },
    ...overrides,
  };
}

function createRace(race: string, overrides: Authored = {}): Authored {
  return { schemaVersion: 1, race, ...overrides };
}

function raceSources(): SoundProfileSource[] {
  return RACE_IDS.map((race) => ({
    file: `content/audio/races/${race.toLowerCase()}.json`,
    data: createRace(race),
  }));
}

function parseOrc(overrides: Authored) {
  return parseRaceSoundProfile({ file: ORC_FILE, data: createRace('ORC', overrides) });
}

describe('parseRaceSoundProfile', () => {
  it('reads race-wide and per-archetype sounds', () => {
    const profile = parseOrc({
      sounds: { creepDeath: 'ui.open' },
      archetypes: { chain: { attack: 'ui.click', impact: 'ui.error' } },
    });

    expect(profile).toEqual({
      race: RaceId.ORC,
      sounds: { creepDeath: 'ui.open' },
      archetypes: { [TowerTypeId.CHAIN]: { attack: 'ui.click', impact: 'ui.error' } },
    });
  });

  it('treats missing sections as empty', () => {
    expect(parseOrc({})).toEqual({ race: RaceId.ORC, sounds: {}, archetypes: {} });
  });

  it('fails on an unknown sound id with the file and race', () => {
    expect(() => parseOrc({ sounds: { attack: 'combat.attack.trumpet' } })).toThrow(
      `${ORC_FILE} [ORC]: "attack" names an unknown sound id "combat.attack.trumpet"`,
    );
  });

  it('fails on an unknown sound id inside an archetype with the archetype in the id', () => {
    expect(() => parseOrc({ archetypes: { chain: { impact: 'combat.zap' } } })).toThrow(
      `${ORC_FILE} [ORC/chain]: "impact" names an unknown sound id "combat.zap"`,
    );
  });

  it('rejects an unknown slot', () => {
    expect(() => parseOrc({ sounds: { roar: 'ui.click' } })).toThrow('unknown field "roar"');
  });

  it('rejects creature slots on an archetype entry', () => {
    expect(() => parseOrc({ archetypes: { single: { creepDeath: 'ui.click' } } })).toThrow(
      'unknown field "creepDeath"',
    );
  });

  it('rejects an unknown archetype', () => {
    expect(() => parseOrc({ archetypes: { ballista: { attack: 'ui.click' } } })).toThrow(
      'unknown field "ballista"',
    );
  });

  it('rejects an unknown race and a stale schema version', () => {
    expect(() => parseRaceSoundProfile({ file: ORC_FILE, data: createRace('GOBLIN') })).toThrow(
      '"race" is not a known value: GOBLIN',
    );
    expect(() => parseOrc({ schemaVersion: 0 })).toThrow('unsupported schemaVersion 0');
  });
});

describe('parseDefaultSoundProfile', () => {
  it('requires a sound for every slot', () => {
    const data = createDefault();
    delete (data.sounds as Authored).creepEscape;

    expect(() => parseDefaultSoundProfile({ file: DEFAULT_FILE, data })).toThrow(
      `${DEFAULT_FILE} [default]: the default profile must name a sound for every slot; missing: creepEscape`,
    );
  });

  it('validates sound ids like a race profile', () => {
    const data = createDefault({ archetypes: { splash: { attack: 'boom' } } });

    expect(() => parseDefaultSoundProfile({ file: DEFAULT_FILE, data })).toThrow(
      `${DEFAULT_FILE} [default/splash]: "attack" names an unknown sound id "boom"`,
    );
  });
});

describe('loadSoundProfiles', () => {
  it('loads the authored profiles', () => {
    const library = loadSoundProfiles(SOUND_PROFILE_SOURCES);

    expect(Object.keys(library.races).sort()).toEqual([...RACE_IDS].sort());
  });

  it('requires one profile per race', () => {
    const races = raceSources().filter((source) => source.file !== ORC_FILE);

    expect(() =>
      loadSoundProfiles({ defaultProfile: { file: DEFAULT_FILE, data: createDefault() }, races }),
    ).toThrow('missing race sound profiles for: ORC');
  });

  it('rejects two profiles for the same race', () => {
    const races = [
      ...raceSources(),
      { file: 'content/audio/races/orc2.json', data: createRace('ORC') },
    ];

    expect(() =>
      loadSoundProfiles({ defaultProfile: { file: DEFAULT_FILE, data: createDefault() }, races }),
    ).toThrow(
      `content/audio/races/orc2.json [ORC]: duplicate race sound profile, already declared in ${ORC_FILE}`,
    );
  });
});
