import { memo } from 'react';
import styles from './PlaceholderIcon.module.css';
import {
  FACTION_THEME_COLOR_VARS,
  type FactionThemeName,
} from '../../../constants/theme';

export const PLACEHOLDER_ICON_GLYPH = '?';

export type PlaceholderIconProps = {
  /** What the missing art belongs to, used for the accessible label. */
  label: string;
  /** Colours the chip with the race accent when the content belongs to one. */
  faction?: FactionThemeName;
  /** Set when the chip is the entire content of a button, so it claims 44x44. */
  interactive?: boolean;
  className?: string;
};

function joinClassNames(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Stands in for artwork that does not exist yet. Same promise as the in-game
 * placeholder texture: never an empty box, never a broken image, and obviously
 * unfinished rather than quietly wrong.
 */
function PlaceholderIconComponent({
  label,
  faction,
  interactive = false,
  className,
}: PlaceholderIconProps) {
  return (
    <span
      className={joinClassNames(
        styles.icon,
        interactive && styles.iconInteractive,
        faction && styles.tinted,
        className,
      )}
      style={faction ? { '--placeholder-icon-accent': FACTION_THEME_COLOR_VARS[faction] } as React.CSSProperties : undefined}
      role="img"
      aria-label={`${label}: artwork pending`}
    >
      {PLACEHOLDER_ICON_GLYPH}
    </span>
  );
}

export const PlaceholderIcon = memo(PlaceholderIconComponent);
