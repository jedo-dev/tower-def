import { EnemyFaction } from '../../../entities/enemy-faction';
import { FACTION_THEME_COLOR_VARS } from '../../../shared/constants/theme';

export function getEnemyThemeColor(faction: EnemyFaction): string {
  switch (faction) {
    case EnemyFaction.UNDEAD:
      return FACTION_THEME_COLOR_VARS.undead;
    case EnemyFaction.ORC:
      return FACTION_THEME_COLOR_VARS.orc;
    case EnemyFaction.HUMAN:
      return FACTION_THEME_COLOR_VARS.human;
    case EnemyFaction.ELF:
      return FACTION_THEME_COLOR_VARS.elf;
  }
}
