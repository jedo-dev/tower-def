import styles from './BestiaryPage.module.css';

export type StatCell = {
  key: string;
  label: string;
  value: string;
  tone?: 'gold' | 'success';
  /** Tooltip explaining the stat, e.g. how hard hits land against an armor. */
  hint?: string;
  /** Decorative symbol shown before the value; hidden from assistive tech. */
  glyph?: string;
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
        <div key={cell.key} className={styles.stat} title={cell.hint}>
          <dt className={styles.statLabel}>{cell.label}</dt>
          <dd className={`${styles.statValue}${cell.tone ? ` ${TONE_CLASS[cell.tone]}` : ''}`}>
            {cell.glyph && <span aria-hidden="true">{`${cell.glyph} `}</span>}
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
