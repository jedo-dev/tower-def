import { Fragment } from 'react';
import { ARMOR_SHORT_LABELS } from '../model/combatTypeDisplay';
import type { CreepBranchViewModel } from '../model/types';
import { BranchGlyph } from '../../../shared/ui/branch-glyph';
import styles from './BestiaryPage.module.css';

export type CreepBranchTableProps = {
  branch: CreepBranchViewModel;
};

const COLUMN_COUNT = 5;

/** One creature talent branch: its name, pitch and a grade 1-4 table with a special line per grade. */
export function CreepBranchTable({ branch }: CreepBranchTableProps) {
  return (
    <section className={styles.branch} aria-label={branch.name} data-creep-branch={branch.id}>
      <header className={styles.branchHeader}>
        <BranchGlyph glyph={branch.glyph} branchId={branch.id} size="large" />
        <h4 className={styles.branchName}>{branch.name}</h4>
      </header>
      <p className={styles.branchDescription}>{branch.description}</p>
      <table className={styles.branchTable} aria-label={`${branch.name} grades`}>
        <thead>
          <tr>
            <th scope="col">Grade</th>
            <th scope="col">HP</th>
            <th scope="col">
              <abbr title="Speed">Spd</abbr>
            </th>
            <th scope="col">
              <abbr title={ARMOR_SHORT_LABELS.physical}>Phys</abbr>
            </th>
            <th scope="col">
              <abbr title={ARMOR_SHORT_LABELS.magical}>Mag</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {branch.grades.map((grade) => (
            <Fragment key={grade.level}>
              <tr className={styles.branchGradeRow}>
                <th scope="row" className={styles.branchGradeBadge}>
                  G{grade.level}
                </th>
                <td>{grade.health}</td>
                <td>{grade.speed}</td>
                <td>{grade.physicalArmor}</td>
                <td>{grade.magicalArmor}</td>
              </tr>
              <tr className={styles.branchSpecialRow}>
                <td colSpan={COLUMN_COUNT} className={styles.branchSpecial}>
                  {grade.special}
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}
