import styles from './TowerActionPanel.module.css';
import type { TowerNextLevelPreview } from '../model/mapTowerNextLevelPreview';

export const NEXT_LEVEL_PREVIEW_LABEL = 'Next level';

/** The dimmed "NEXT:" line: changed stats with their deltas, then effects. */
export function NextLevelPreview({ preview }: { preview: TowerNextLevelPreview }) {
  if (preview.statDeltas.length === 0 && preview.effectLines.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.next}
      role="group"
      aria-label={`${NEXT_LEVEL_PREVIEW_LABEL} ${preview.level}`}
    >
      <span className={styles.nextLabel} aria-hidden="true">
        NEXT:
      </span>
      <ul className={styles.nextList}>
        {preview.statDeltas.map((stat) => (
          <li key={stat.key} className={styles.nextItem}>
            <span className={styles.nextItemLabel} aria-hidden="true">
              {stat.shortLabel}
            </span>
            <span className={styles.visuallyHidden}>{stat.name}</span> {stat.value}{' '}
            <span className={styles.nextDelta}>({stat.delta})</span>
          </li>
        ))}
        {preview.effectLines.map((line) => (
          <li key={`effect-${line.key}`} className={styles.nextItem}>
            <span className={styles.nextItemLabel}>{line.label}</span> {line.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
