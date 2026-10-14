import styles from './BestiaryPage.module.css';

export type StatCell = {
  key: string;
  label: string;
  value: string;
  tone?: 'gold' | 'success';
};

const TONE_CLASS: Record<NonNullable<StatCell['tone']>, string> = {
  gold: styles.statValueGold,
  success: styles.statValueSuccess,
};

/** Compact label/value grid shared by the creep and tower cards. */
export function StatGrid({ cells }: { cells: readonly StatCell[] }) {
  return (
    <dl className={styles.statGrid}>
      {cells.map((cell) => (
        <div key={cell.key} className={styles.stat}>
          <dt className={styles.statLabel}>{cell.label}</dt>
          <dd className={`${styles.statValue}${cell.tone ? ` ${TONE_CLASS[cell.tone]}` : ''}`}>
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
