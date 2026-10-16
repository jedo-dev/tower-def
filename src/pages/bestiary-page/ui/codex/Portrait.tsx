import type { ReactNode } from 'react';
import styles from './Portrait.module.css';

export type PortraitProps = {
  /** The sprite icon (TowerIcon / UnitIcon); it reads the size variables of the slot. */
  children: ReactNode;
  /** Tier number or damage type pictogram pinned to the corner. */
  badge?: ReactNode;
  badgeKind?: 'tier' | 'type';
  size?: 'small' | 'large';
};

export function Portrait({ children, badge, badgeKind = 'tier', size = 'small' }: PortraitProps) {
  return (
    <span className={size === 'large' ? `${styles.portrait} ${styles.large}` : styles.portrait}>
      {children}
      {badge !== undefined && (
        <span
          className={badgeKind === 'type' ? `${styles.badge} ${styles.badgeType}` : styles.badge}
          aria-hidden="true"
        >
          {badge}
        </span>
      )}
    </span>
  );
}
