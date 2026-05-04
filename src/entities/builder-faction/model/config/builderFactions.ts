import { BuilderFaction, type BuilderFactionConfig } from '../types';

export const builderFactions: BuilderFactionConfig[] = [
  {
    id: BuilderFaction.UNDEAD,
    name: 'Undead',
    description: 'Dark necromantic builders focused on relentless pressure.',
    themeColor: '#5c8cff',
    towerIds: ['undead_bone_archer_tower'],
  },
  {
    id: BuilderFaction.ORC,
    name: 'Orc',
    description: 'Brutal war camps with aggressive frontline defenses.',
    themeColor: '#d97b39',
    towerIds: ['orc_spear_watchtower'],
  },
  {
    id: BuilderFaction.HUMAN,
    name: 'Human',
    description: 'Disciplined defenders relying on consistent ranged fire.',
    themeColor: '#5e94d6',
    towerIds: ['human_guard_archer_tower'],
  },
  {
    id: BuilderFaction.ELF,
    name: 'Elf',
    description: 'Graceful sentinels with precise moonlit archery.',
    themeColor: '#6bbf89',
    towerIds: ['elf_moon_archer_tower'],
  },
];
