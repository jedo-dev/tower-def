import styles from './Codex.module.css';

export type SectionHeadProps = {
  id: string;
  title: string;
  meta?: string;
  /** Heading level inside the page or the detail dialog. */
  level?: 2 | 3;
};

/** Gold small-caps title, a race-tinted rule and a short note on the right. */
export function SectionHead({ id, title, meta, level = 2 }: SectionHeadProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div className={styles.sectionHead}>
      <Heading id={id} className={styles.sectionTitle}>
        {title}
      </Heading>
      <span className={styles.sectionRule} aria-hidden="true" />
      {meta && <span className={styles.sectionMeta}>{meta}</span>}
    </div>
  );
}
