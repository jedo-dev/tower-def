import styles from './CreatureTalentMarks.module.css';
import { BranchGlyph } from '../../../shared/ui/branch-glyph';
import type { CreatureTalentViewModel } from '../model/mapCreatureTalentState';

export type CreatureTalentMarksProps = {
  talent: CreatureTalentViewModel;
};

/**
 * The talent overlay of a creature card, decorative for screen readers (the
 * card's label carries the same facts): branch glyph and "G2/4" in the top
 * corners, the tier's experience toward the next purchase as a bar along the
 * bottom edge. Absolutely placed, so the card does not grow.
 */
export function CreatureTalentMarks({ talent }: CreatureTalentMarksProps) {
  return (
    <>
      {talent.chosenBranch && (
        <BranchGlyph
          glyph={talent.chosenBranch.glyph}
          title={talent.chosenBranch.name}
          className={styles.glyph}
        />
      )}
      {talent.gradeBadge && (
        <span className={styles.grade} aria-hidden="true" data-creature-grade="true">
          {talent.gradeBadge}
        </span>
      )}
      <span className={styles.xpTrack} aria-hidden="true" data-creature-xp="true">
        <span
          className={styles.xpFill}
          style={{ transform: `scaleX(${talent.xpProgress})` }}
          data-full={talent.xpProgress >= 1 || undefined}
        />
      </span>
    </>
  );
}
