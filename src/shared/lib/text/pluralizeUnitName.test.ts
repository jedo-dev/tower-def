import { describe, expect, it } from 'vitest';
import { pluralizeUnitName } from './pluralizeUnitName';

type NamedEntry = { name: string };
type UnitContentFile = { units: NamedEntry[] };
type TowerContentFile = { towers?: NamedEntry[] };

const unitFiles = import.meta.glob<UnitContentFile>('../../../content/units/*.json', {
  eager: true,
  import: 'default',
});
const towerFiles = import.meta.glob<TowerContentFile>('../../../content/towers/*.json', {
  eager: true,
  import: 'default',
});

const CREATURE_NAMES: string[] = Object.values(unitFiles).flatMap((file) =>
  file.units.map((unit) => unit.name),
);
const TOWER_NAMES: string[] = Object.values(towerFiles).flatMap((file) =>
  (file.towers ?? []).map((tower) => tower.name),
);

const EXPECTED_CREATURE_PLURALS: Readonly<Record<string, string>> = {
  Archer: 'Archers',
  Wisp: 'Wisps',
  Huntress: 'Huntresses',
  Dryad: 'Dryads',
  Chimera: 'Chimeras',
  'Druid of the Claw': 'Druids of the Claw',
  Hippogryph: 'Hippogryphs',
  'Mountain Giant': 'Mountain Giants',
  Militia: 'Militia',
  Peasant: 'Peasants',
  Footman: 'Footmen',
  Rifleman: 'Riflemen',
  'Siege Engine': 'Siege Engines',
  Knight: 'Knights',
  Sorceress: 'Sorceresses',
  'Gryphon Rider': 'Gryphon Riders',
  Grunt: 'Grunts',
  Peon: 'Peons',
  'Wolf Rider': 'Wolf Riders',
  Troll: 'Trolls',
  Headhunter: 'Headhunters',
  Shaman: 'Shamans',
  'Wind Rider': 'Wind Riders',
  Tauren: 'Tauren',
  Skeleton: 'Skeletons',
  Ghoul: 'Ghouls',
  'Crypt Fiend': 'Crypt Fiends',
  Gargoyle: 'Gargoyles',
  Abomination: 'Abominations',
  Necromancer: 'Necromancers',
  Banshee: 'Banshees',
  'Frost Wyrm': 'Frost Wyrms',
};

const EXPECTED_TOWER_PLURALS: Readonly<Record<string, string>> = {
  'Moon Archer Tower': 'Moon Archer Towers',
  'Wisp Bloom': 'Wisp Blooms',
  Moonwell: 'Moonwells',
  'Thorn Spire': 'Thorn Spires',
  'Guard Archer Tower': 'Guard Archer Towers',
  'Cannon Bastion': 'Cannon Bastions',
  'Alchemist Tower': 'Alchemist Towers',
  'Guard Post': 'Guard Posts',
  'Spear Watchtower': 'Spear Watchtowers',
  'Burning Pit': 'Burning Pits',
  'Lightning Totem': 'Lightning Totems',
  'Tar Pit': 'Tar Pits',
  'Bone Archer Tower': 'Bone Archer Towers',
  'Plague Tower': 'Plague Towers',
  'Frost Wyrm Nest': 'Frost Wyrm Nests',
  'Bone Obelisk': 'Bone Obelisks',
};

describe('pluralizeUnitName', () => {
  it('has an expected plural for every creature in content', () => {
    expect([...CREATURE_NAMES].sort()).toEqual(Object.keys(EXPECTED_CREATURE_PLURALS).sort());
  });

  it('has an expected plural for every tower in content', () => {
    expect([...TOWER_NAMES].sort()).toEqual(Object.keys(EXPECTED_TOWER_PLURALS).sort());
  });

  it.each(CREATURE_NAMES)('pluralises creature %s', (name) => {
    expect(pluralizeUnitName(name)).toBe(EXPECTED_CREATURE_PLURALS[name]);
  });

  it.each(TOWER_NAMES)('pluralises tower %s', (name) => {
    expect(pluralizeUnitName(name)).toBe(EXPECTED_TOWER_PLURALS[name]);
  });

  it('applies the suffix rules to words outside content', () => {
    expect(pluralizeUnitName('Fox')).toBe('Foxes');
    expect(pluralizeUnitName('Witch')).toBe('Witches');
    expect(pluralizeUnitName('Harpy')).toBe('Harpies');
    expect(pluralizeUnitName('Grey Monkey')).toBe('Grey Monkeys');
    expect(pluralizeUnitName('Lord of the Deep')).toBe('Lords of the Deep');
  });
});
