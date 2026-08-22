import { memo, type CSSProperties } from 'react';
import styles from './UnitIcon.module.css';
import { tryResolveUnitSpriteSheet } from '../../../constants/sprites';
import { PlaceholderIcon } from '../../placeholder-icon';
import type { FactionThemeName } from '../../../constants/theme';

export type UnitIconProps = {
  /** Content id of the unit, e.g. `orc_grunt`. */
  unitId: string;
  /** Display name, used for the accessible label. */
  label: string;
  /** Accent for the fallback chip when the unit has no sheet yet. */
  faction?: FactionThemeName;
  /** Set when the icon is the entire content of a button, so it claims 44x44. */
  interactive?: boolean;
  className?: string;
};

function joinClassNames(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Shows the creep the way the battlefield does: the first frame of the row that
 * faces the camera. Units whose art has not been drawn keep the question chip,
 * so the HUD never shows a broken image.
 */
function UnitIconComponent({ unitId, label, faction, interactive, className }: UnitIconProps) {
  const sheet = tryResolveUnitSpriteSheet(unitId);

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

  return (
    <span
      className={joinClassNames(styles.icon, interactive && styles.iconInteractive, className)}
      style={
        {
          backgroundImage: `url(${sheet.url})`,
          '--unit-icon-columns': sheet.layout.columns,
          '--unit-icon-rows': sheet.layout.rows,
        } as CSSProperties
      }
      role="img"
      aria-label={label}
    />
  );
}

export const UnitIcon = memo(UnitIconComponent);
