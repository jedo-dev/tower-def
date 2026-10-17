import { memo, useState, type CSSProperties } from 'react';
import styles from './TowerIcon.module.css';
import { tryResolveTowerSpriteSheet } from '../../../constants/sprites';
import { PlaceholderIcon } from '../../placeholder-icon';
import type { FactionThemeName } from '../../../constants/theme';
import { toTowerIconSource } from '../model/toTowerIconSource';

export type TowerIconProps = {
  /** Content id of the race tower, e.g. `orc_tar_pit`; absent skips the painted icon. */
  towerId?: string;
  /** Sprite key of the tower sheet, e.g. `tower.elf.moon_archer`, shown when the icon fails. */
  spriteKey?: string;
  /** Display name, used for the accessible label. */
  label: string;
  /** Accent for the fallback chip when the tower has no art yet. */
  faction?: FactionThemeName;
  /** Set when the icon is the entire content of a button, so it claims 44x44. */
  interactive?: boolean;
  className?: string;
};

function joinClassNames(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Shows the tower's painted icon (cut by tools/slice-portraits.py). When the
 * icon fails to load it falls back to the battlefield sheet's first idle
 * frame. Towers with no art at all keep the question chip, so a menu never
 * shows a broken image.
 */
function TowerIconComponent({
  towerId,
  spriteKey,
  label,
  faction,
  interactive,
  className,
}: TowerIconProps) {
  const [failedIconTowerId, setFailedIconTowerId] = useState<string | null>(null);
  const frameClassName = (variantClassName: string | undefined) =>
    joinClassNames(styles.icon, variantClassName, interactive && styles.iconInteractive, className);

  if (towerId !== undefined && towerId !== failedIconTowerId) {
    return (
      <span className={frameClassName(styles.painted)} role="img" aria-label={label}>
        <img
          className={styles.paintedImage}
          src={toTowerIconSource(towerId)}
          alt=""
          draggable={false}
          decoding="async"
          onError={() => setFailedIconTowerId(towerId)}
        />
      </span>
    );
  }

  const sheet = spriteKey === undefined ? null : tryResolveTowerSpriteSheet(spriteKey);
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
      className={frameClassName(styles.sprite)}
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
