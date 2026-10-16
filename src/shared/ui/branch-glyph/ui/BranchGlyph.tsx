import styles from './BranchGlyph.module.css';

export type BranchGlyphProps = {
  glyph: string;
  /** Hover hint; screen readers get the branch from the owning control's label. */
  title?: string;
  className?: string;
};

/** Small gold badge marking the branch a tower type follows. Decorative for screen readers. */
export function BranchGlyph({ glyph, title, className }: BranchGlyphProps) {
  return (
    <span
      className={className ? `${styles.glyph} ${className}` : styles.glyph}
      title={title}
      aria-hidden="true"
      data-testid="branch-glyph"
    >
      {glyph}
    </span>
  );
}
