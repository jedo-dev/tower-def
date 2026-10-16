import { Fragment } from 'react';
import type { TowerBranchViewModel } from '../model/types';
import { BranchGlyph } from '../../../shared/ui/branch-glyph';
import styles from './BestiaryPage.module.css';

export type TowerBranchTableProps = {
  branch: TowerBranchViewModel;
};

const COLUMN_COUNT = 5;

/** One talent branch: its name, pitch and a grade 4-7 table with a special line per grade. */
export function TowerBranchTable({ branch }: TowerBranchTableProps) {
  return (
    <section className={styles.branch} aria-label={branch.name} data-talent-branch={branch.id}>
      <header className={styles.branchHeader}>
        <BranchGlyph glyph={branch.glyph} branchId={branch.id} size="large" />
        <h4 className={styles.branchName}>{branch.name}</h4>
      </header>
      <p className={styles.branchDescription}>{branch.description}</p>
      <table className={styles.branchTable} aria-label={`${branch.name} grades`}>
        <thead>
          <tr>
            <th scope="col">Grade</th>
            <th scope="col">Dmg</th>
            <th scope="col">Range</th>
            <th scope="col">Reload</th>
            <th scope="col">Cost</th>
          </tr>
        </thead>
        <tbody>
          {branch.grades.map((grade) => (
            <Fragment key={grade.level}>
              <tr className={styles.branchGradeRow}>
                <th scope="row" className={styles.branchGradeBadge}>
                  G{grade.level}
                </th>
                <td>{grade.damage}</td>
                <td>{grade.range}</td>
                <td>{grade.cooldown}</td>
                <td className={styles.branchGradeCost}>{grade.upgradeCost}g</td>
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
