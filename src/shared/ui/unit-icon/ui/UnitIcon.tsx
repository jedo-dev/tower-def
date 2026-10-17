import { memo, useState, type CSSProperties } from 'react';
import styles from './UnitIcon.module.css';
import { tryResolveUnitSpriteSheet } from '../../../constants/sprites';
import { PlaceholderIcon } from '../../placeholder-icon';
import type { FactionThemeName } from '../../../constants/theme';
import { toUnitPortraitSource } from '../model/toUnitPortraitSource';

export type UnitIconProps = {
  /** Content id of the unit, e.g. `orc_grunt`. */
  unitId: string;
  /** Display name, used for the accessible label. */
  label: string;
  /** Accent for the fallback chip when the unit has no art yet. */
  faction?: FactionThemeName;
  /** Set when the icon is the entire content of a button, so it claims 44x44. */
  interactive?: boolean;
  className?: string;
};

function joinClassNames(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Shows the unit's painted portrait (a bust cut by tools/slice-portraits.py).
 * When the portrait fails to load it falls back to the battlefield sprite: the
 * first frame of the row that faces the camera. Units with no art at all keep
 * the question chip, so the HUD never shows a broken image.
 */
function UnitIconComponent({ unitId, label, faction, interactive, className }: UnitIconProps) {
  const [failedPortraitUnitId, setFailedPortraitUnitId] = useState<string | null>(null);
  const frameClassName = (variantClassName: string | undefined) =>
    joinClassNames(styles.icon, variantClassName, interactive && styles.iconInteractive, className);

  if (unitId !== failedPortraitUnitId) {
    return (
      <span className={frameClassName(styles.portrait)} role="img" aria-label={label}>
        <img
          className={styles.portraitImage}
          src={toUnitPortraitSource(unitId)}
          alt=""
          draggable={false}
          decoding="async"
          onError={() => setFailedPortraitUnitId(unitId)}
        />
      </span>
    );
  }

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
      className={frameClassName(styles.sprite)}
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
