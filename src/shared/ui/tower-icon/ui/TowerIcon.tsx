import { memo, type CSSProperties } from 'react';
import styles from './TowerIcon.module.css';
import { tryResolveTowerSpriteSheet } from '../../../constants/sprites';
import { PlaceholderIcon } from '../../placeholder-icon';
import type { FactionThemeName } from '../../../constants/theme';

export type TowerIconProps = {
  /** Sprite key of the tower, e.g. `tower.elf.moon_archer`. */
  spriteKey: string;
  /** Display name, used for the accessible label. */
  label: string;
  /** Accent for the fallback chip when the tower has no sheet yet. */
  faction?: FactionThemeName;
  /** Set when the icon is the entire content of a button, so it claims 44x44. */
  interactive?: boolean;
  className?: string;
};

function joinClassNames(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Shows the tower the way the battlefield does at rest: its first idle frame.
 * Towers whose art has not been drawn keep the question chip, so a menu never
 * shows a broken image.
 */
function TowerIconComponent({ spriteKey, label, faction, interactive, className }: TowerIconProps) {
  const sheet = tryResolveTowerSpriteSheet(spriteKey);

  if (!sheet) {
    return (
      <PlaceholderIcon
        label={label}
        faction={faction}
        interactive={interactive}
        className={className}
      />
    );
  }

  const column = sheet.portraitFrame % sheet.layout.columns;
  const row = Math.floor(sheet.portraitFrame / sheet.layout.columns);

  return (
    <span
      className={joinClassNames(styles.icon, interactive && styles.iconInteractive, className)}
      style={
        {
          backgroundImage: `url(${sheet.url})`,
          '--tower-icon-columns': sheet.layout.columns,
          '--tower-icon-rows': sheet.layout.rows,
          '--tower-icon-column': column,
          '--tower-icon-row': row,
        } as CSSProperties
      }
      role="img"
      aria-label={label}
    />
  );
}

export const TowerIcon = memo(TowerIconComponent);
