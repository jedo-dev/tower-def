import { RaceId } from '../../../shared/types/content-ids';
import type { RaceRegistryEntry, RaceRegistryMap } from './types';

const undeadRegistry: RaceRegistryEntry = {
  raceId: RaceId.UNDEAD,
  name: 'Undead',
  description: 'Dark necromantic builders focused on relentless pressure.',
  themeColor: '#5c8cff',
  starterTowerId: 'undead_bone_archer_tower',
  buildableTowerIds: ['undead_bone_archer_tower', 'undead_plague_tower'],
  sendableCreepIds: ['undead_skeleton', 'undead_ghoul', 'undead_crypt_fiend', 'undead_gargoyle'],
};

const orcRegistry: RaceRegistryEntry = {
  raceId: RaceId.ORC,
  name: 'Orc',
  description: 'Brutal war camps with aggressive frontline defenses.',
  themeColor: '#d97b39',
  starterTowerId: 'orc_spear_watchtower',
  buildableTowerIds: ['orc_spear_watchtower'],
  sendableCreepIds: ['orc_grunt', 'orc_wolf_rider', 'orc_troll', 'orc_headhunter'],
};

const humanRegistry: RaceRegistryEntry = {
  raceId: RaceId.HUMAN,
  name: 'Human',
  description: 'Disciplined defenders relying on consistent ranged fire.',
  themeColor: '#5e94d6',
  starterTowerId: 'human_guard_archer_tower',
  buildableTowerIds: ['human_guard_archer_tower'],
  sendableCreepIds: ['human_militia', 'human_footman', 'human_rifleman', 'human_siege_engine'],
};

const elfRegistry: RaceRegistryEntry = {
  raceId: RaceId.ELF,
  name: 'Elf',
  description: 'Graceful sentinels with precise moonlit archery.',
  themeColor: '#6bbf89',
  starterTowerId: 'elf_moon_archer_tower',
  buildableTowerIds: ['elf_moon_archer_tower'],
  sendableCreepIds: ['elf_archer', 'elf_huntress', 'elf_dryad', 'elf_chimera'],
};

export const raceRegistries: RaceRegistryMap = {
  [RaceId.UNDEAD]: undeadRegistry,
  [RaceId.ORC]: orcRegistry,
  [RaceId.HUMAN]: humanRegistry,
  [RaceId.ELF]: elfRegistry,
};

export function getRaceRegistry(raceId: RaceId): RaceRegistryEntry {
  const entry = raceRegistries[raceId];
  if (!entry) {
    throw new Error(`Missing race registry for: ${raceId}`);
  }
  return entry;
}

export function getAllRaceRegistries(): RaceRegistryEntry[] {
  return Object.values(raceRegistries);
}
