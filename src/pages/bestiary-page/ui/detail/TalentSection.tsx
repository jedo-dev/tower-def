import { useState } from 'react';
import { BranchGlyph } from '../../../../shared/ui/branch-glyph';
import type { StatReadingViewModel } from '../../model/types';
import { CodexIcon } from '../codex/CodexIcon';
import { SectionHead } from '../codex/SectionHead';
import { deltaToneClass } from '../codex/deltaToneClass';
import codex from '../codex/Codex.module.css';
import detail from './Detail.module.css';
import styles from './Talent.module.css';

/** One grade as the talent section shows it, for towers (4-7) and creatures (1-4). */
export type TalentGradeView = {
  level: number;
  stats: readonly StatReadingViewModel[];
  comparedTo: string;
  special: string;
  /** Upgrade price on the stepper; creature grades are free and pass null. */
  cost: number | null;
};

export type TalentBranchView = {
  id: string;
  name: string;
  glyph: string;
  description: string;
  grades: readonly TalentGradeView[];
};

export type TalentSectionProps = {
  idPrefix: string;
  meta: string;
  branches: readonly TalentBranchView[];
};

const NO_SPECIAL = '—';

/**
 * Both talent branches behind a two-segment toggle: one branch at a time,
 * its grades as a stepper and the picked grade's stats with deltas.
 */
export function TalentSection({ idPrefix, meta, branches }: TalentSectionProps) {
  const [branchIndex, setBranchIndex] = useState(0);
  const [gradeIndex, setGradeIndex] = useState(0);
  const branch = branches[branchIndex] ?? branches[0];
  if (!branch) {
    return null;
  }
  const grade = branch.grades[Math.min(gradeIndex, branch.grades.length - 1)];
  const headingId = `${idPrefix}-talent`;

  return (
    <section className={detail.section} aria-labelledby={headingId}>
      <SectionHead id={headingId} title="Talent" meta={meta} level={3} />
      <div className={styles.toggle} role="group" aria-label="Talent branch">
        {branches.map((candidate, index) => {
          const isSelected = index === branchIndex;
          return (
            <button
              key={candidate.id}
              type="button"
              className={`${codex.pressable} ${styles.branchButton}${isSelected ? ` ${styles.branchSelected}` : ''}`}
              aria-pressed={isSelected}
              onClick={() => setBranchIndex(index)}
              data-talent-branch={candidate.id}
              data-sound="ui.build_select"
            >
              <BranchGlyph
                glyph={candidate.glyph}
                branchId={candidate.id}
                size="large"
                className={styles.branchIcon}
              />
              <span className={styles.branchText}>
                <span className={styles.branchKicker}>{`Branch ${candidate.glyph}`}</span>
                <span className={styles.branchName}>{candidate.name}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.pitch}>{branch.description}</p>

      <div className={styles.steps} role="group" aria-label={`${branch.name} grade`}>
        {branch.grades.map((candidate, index) => {
          const isSelected = candidate === grade;
          const state = isSelected
            ? styles.stepSelected
            : candidate.level < grade.level
              ? styles.stepDone
              : '';
          const price = candidate.cost === null ? '' : `, ${candidate.cost} gold`;
          return (
            <button
              key={candidate.level}
              type="button"
              className={`${codex.pressable} ${styles.step} ${state}`}
              aria-pressed={isSelected}
              aria-label={`Grade ${candidate.level}${price}`}
              onClick={() => setGradeIndex(index)}
            >
              {`G${candidate.level}`}
              {candidate.cost !== null && (
                <span className={styles.stepSub} aria-hidden="true">
                  <CodexIcon name="gold" size="xs" />
                  {candidate.cost}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        className={`${codex.frame} ${codex.frameFlat} ${styles.grade}`}
        aria-live="polite"
        data-talent-grade={grade.level}
      >
        <div className={styles.gradeHead}>
          <h4 className={styles.gradeTitle}>{`G${grade.level} · ${branch.name}`}</h4>
          <span className={styles.gradeNote}>{`change vs ${grade.comparedTo}`}</span>
        </div>
        <ul className={styles.gradeStats} aria-label={`Grade ${grade.level} stats`}>
          {grade.stats.map((stat) => (
            <li key={stat.key} className={styles.gradeStat} title={stat.label}>
              <span className={styles.gradeValue}>
                <CodexIcon name={stat.key} />
                <span className={codex.visuallyHidden}>{`${stat.label}: `}</span>
                {stat.value}
              </span>
              <span
                className={`${styles.gradeDelta} ${stat.delta ? deltaToneClass(stat.delta.tone) : codex.neutral}`}
              >
                {stat.delta?.text ?? (stat.key === 'gold' ? 'gold' : NO_SPECIAL)}
              </span>
            </li>
          ))}
        </ul>
        {grade.special !== NO_SPECIAL && (
          <p className={detail.special}>
            <span className={detail.rune} aria-hidden="true" />
            <span>{grade.special}</span>
          </p>
        )}
      </div>
    </section>
  );
}
