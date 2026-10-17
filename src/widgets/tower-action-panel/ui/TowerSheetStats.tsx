import styles from './TowerActionPanel.module.css';
import type { TowerSheetStatTile } from '../model/mapTowerSheetStats';

/**
 * Damage / Range / Cooldown (and Splash when the tower has one) as tiles: the
 * live value in the display face, the next level's value in green after it.
 * A description list, so each value is announced with its stat name.
 */
export function TowerSheetStats({ tiles }: { tiles: TowerSheetStatTile[] }) {
  return (
    <dl className={styles.tiles} data-tile-count={tiles.length}>
      {tiles.map((tile) => (
        <div key={tile.key} className={styles.tile}>
          <dt className={styles.tileLabel}>{tile.name}</dt>
          <dd className={styles.tileValues}>
            <span className={styles.tileValue}>{tile.value}</span>
            {tile.nextValue !== null && (
              <span className={styles.tileNext}>
                <span aria-hidden="true">→ </span>
                <span className={styles.visuallyHidden}>next level </span>
                {tile.nextValue}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
