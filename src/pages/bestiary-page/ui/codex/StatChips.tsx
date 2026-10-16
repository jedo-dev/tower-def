import type { StatReadingViewModel } from '../../model/types';
import { CodexIcon } from './CodexIcon';
import styles from './Codex.module.css';

export type StatChipsProps = {
  stats: readonly StatReadingViewModel[];
  /** Tiles show small chips; the detail header shows large ones that share the row. */
  size?: 'small' | 'large';
  /** List label for assistive tech; leave it out when the owner already speaks the stats. */
  label?: string;
};

/**
 * A row of pictogram + value chips. With a label it is a list whose items
 * speak the stat name; without one it is decorative phrasing content that
 * may sit inside a button.
 */
export function StatChips({ stats, size = 'small', label }: StatChipsProps) {
  const className = size === 'large' ? `${styles.chips} ${styles.chipsLarge}` : styles.chips;

  if (label === undefined) {
    return (
      <span className={className} aria-hidden="true">
        {stats.map((stat) => (
          <span key={stat.key} className={styles.chip}>
            <CodexIcon name={stat.key} />
            {stat.value}
          </span>
        ))}
      </span>
    );
  }

  return (
    <ul className={className} aria-label={label}>
      {stats.map((stat) => (
        <li key={stat.key} className={styles.chip} title={stat.label}>
          <CodexIcon name={stat.key} />
          <span className={styles.visuallyHidden}>{`${stat.label}: `}</span>
          {stat.value}
        </li>
      ))}
    </ul>
  );
}
