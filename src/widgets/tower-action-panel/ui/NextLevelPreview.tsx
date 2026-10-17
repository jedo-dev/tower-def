import styles from './TowerActionPanel.module.css';
import type { TowerNextLevelPreview } from '../model/mapTowerNextLevelPreview';
import { mapTowerSheetNextItems } from '../model/mapTowerSheetStats';

export const NEXT_LEVEL_PREVIEW_LABEL = 'Next level';

/**
 * The sheet's one-line forecast: "NEXT Lv 5 · +7 damage · +0.3 range · −0.05s",
 * then any effect the upgrade changes. It ellipsizes rather than wrapping, so
 * the sheet keeps its height; the full text stays in the accessible name.
 */
export function NextLevelPreview({ preview }: { preview: TowerNextLevelPreview }) {
  const items = mapTowerSheetNextItems(preview);
  if (items.length === 0) {
    return null;
  }
  const levelLabel = `NEXT Lv ${preview.level}`;

  return (
    <div
      className={styles.next}
      role="group"
      aria-label={`${NEXT_LEVEL_PREVIEW_LABEL} ${preview.level}`}
      title={[levelLabel, ...items].join(' · ')}
    >
      <span className={styles.nextLabel}>{levelLabel}</span>
      <ul className={styles.nextList}>
        {items.map((item) => (
          <li key={item} className={styles.nextItem}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
