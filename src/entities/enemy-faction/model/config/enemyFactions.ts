import { EnemyFaction, type EnemyFactionConfig } from '../types';

export const enemyFactions: EnemyFactionConfig[] = [
  {
    id: EnemyFaction.UNDEAD,
    name: 'Undead',
    description: 'Relentless legions of skeletal warriors and crypt horrors.',
    creepStyle: 'Skeleton, Ghoul, Crypt Fiend, Gargoyle',
  },
  {
    id: EnemyFaction.ORC,
    name: 'Orc',
    description: 'Savage warbands of brutish grunts and wolf riders.',
    creepStyle: 'Grunt, Wolf Rider, Troll, Headhunter',
  },
  {
    id: EnemyFaction.HUMAN,
    name: 'Human',
    description: 'Orderly forces of militia and siege weapons.',
    creepStyle: 'Militia, Footman, Rifleman, Siege Engine',
  },
  {
    id: EnemyFaction.ELF,
    name: 'Elf',
    description: 'Swift archers and mystical creatures of the forest.',
    creepStyle: 'Archer, Huntress, Dryad, Chimera',
  },
];

export const DEFAULT_ENEMY_FACTION = EnemyFaction.UNDEAD;
