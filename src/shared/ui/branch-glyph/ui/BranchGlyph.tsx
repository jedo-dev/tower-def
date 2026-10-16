import { useState } from 'react';
import styles from './BranchGlyph.module.css';
import { toTalentIconSource } from '../model/toTalentIconSource';

export type BranchGlyphSize = 'small' | 'large';

export type BranchGlyphProps = {
  glyph: string;
  /** Content id of the branch; shows its painted icon, the glyph stays as fallback. */
  branchId?: string;
  size?: BranchGlyphSize;
  /** Hover hint; screen readers get the branch from the owning control's label. */
  title?: string;
  className?: string;
};

/**
 * Mark of the branch a tower or creature follows: its painted talent icon, or
 * a small gold Roman-numeral badge when the icon is missing or fails to load.
 * Decorative for screen readers.
 */
export function BranchGlyph({
  glyph,
  branchId,
  size = 'small',
  title,
  className,
}: BranchGlyphProps) {
  const [failedBranchId, setFailedBranchId] = useState<string | null>(null);
  const showsIcon = branchId !== undefined && branchId !== failedBranchId;
  const classNames = [
    styles.glyph,
    size === 'large' ? styles.large : undefined,
    showsIcon ? styles.icon : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} title={title} aria-hidden="true" data-testid="branch-glyph">
      {showsIcon ? (
        <img
          className={styles.image}
          src={toTalentIconSource(branchId)}
          alt=""
          draggable={false}
          decoding="async"
          onError={() => setFailedBranchId(branchId)}
        />
      ) : (
        glyph
      )}
    </span>
  );
}
