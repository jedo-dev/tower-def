import { FACTION_THEME_COLOR_VARS } from '../../../../shared/constants/theme';
import { BuilderFaction, type BuilderFactionConfig } from '../types';

export const builderFactions: BuilderFactionConfig[] = [
  {
    id: BuilderFaction.UNDEAD,
    name: 'Undead',
    description: 'Dark necromantic builders focused on relentless pressure.',
    themeColor: FACTION_THEME_COLOR_VARS.undead,
    towerIds: ['undead_bone_archer_tower'],
  },
  {
    id: BuilderFaction.ORC,
    name: 'Orc',
    description: 'Brutal war camps with aggressive frontline defenses.',
    themeColor: FACTION_THEME_COLOR_VARS.orc,
    towerIds: ['orc_spear_watchtower'],
  },
  {
    id: BuilderFaction.HUMAN,
    name: 'Human',
    description: 'Disciplined defenders relying on consistent ranged fire.',
    themeColor: FACTION_THEME_COLOR_VARS.human,
    towerIds: ['human_guard_archer_tower'],
  },
  {
    id: BuilderFaction.ELF,
    name: 'Elf',
    description: 'Graceful sentinels with precise moonlit archery.',
    themeColor: FACTION_THEME_COLOR_VARS.elf,
    towerIds: ['elf_moon_archer_tower'],
  },
];
