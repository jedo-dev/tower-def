import type { FactionThemeName } from '../../../../shared/constants/theme';
import styles from './Codex.module.css';

const RACE_ACCENT_CLASS: Record<FactionThemeName, string> = {
  undead: styles.raceUndead,
  orc: styles.raceOrc,
  human: styles.raceHuman,
  elf: styles.raceElf,
};

/** Class that sets the `--race-*` accent variables for a faction's codex pages. */
export function raceAccentClass(faction: FactionThemeName): string {
  return RACE_ACCENT_CLASS[faction];
}
