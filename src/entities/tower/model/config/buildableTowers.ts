import { BuilderFaction } from '../../../builder-faction/model/types';
import type { BuildableTowerConfig } from '../types';
import { TowerTypeConfig } from '../types';

export const buildableTowers: BuildableTowerConfig[] = [
  {
    id: 'undead_bone_archer_tower',
    name: 'Bone Archer Tower',
    faction: BuilderFaction.UNDEAD,
    towerType: TowerTypeConfig.ARCHER,
    costGold: 50,
    damage: 22,
    range: 3.2,
    attackCooldownMs: 800,
    spriteKey: 'tower.undead.bone_archer',
    description: 'Necromantic archer nest built from cursed remains.',
  },
  {
    id: 'orc_spear_watchtower',
    name: 'Spear Watchtower',
    faction: BuilderFaction.ORC,
    towerType: TowerTypeConfig.ARCHER,
    costGold: 50,
    damage: 22,
    range: 3.2,
    attackCooldownMs: 800,
    spriteKey: 'tower.orc.spear_watchtower',
    description: 'A rugged orc platform hurling heavy spears.',
  },
  {
    id: 'human_guard_archer_tower',
    name: 'Guard Archer Tower',
    faction: BuilderFaction.HUMAN,
    towerType: TowerTypeConfig.ARCHER,
    costGold: 50,
    damage: 22,
    range: 3.2,
    attackCooldownMs: 800,
    spriteKey: 'tower.human.guard_archer',
    description: 'Disciplined marksmen watch over fortified walls.',
  },
  {
    id: 'elf_moon_archer_tower',
    name: 'Moon Archer Tower',
    faction: BuilderFaction.ELF,
    towerType: TowerTypeConfig.ARCHER,
    costGold: 50,
    damage: 22,
    range: 3.2,
    attackCooldownMs: 800,
    spriteKey: 'tower.elf.moon_archer',
    description: 'Moonlit archers strike swiftly from sacred boughs.',
  },
];
