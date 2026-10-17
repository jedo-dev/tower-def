import styles from './BranchCard.module.css';
import { toGradeTableView } from '../model/toGradeTableView';
import type { BranchGradeTableData } from '../model/types';

type BranchGradeTableProps = {
  table: BranchGradeTableData;
};

/**
 * Compact grade table of one branch card: a column per grade, a row per stat
 * that changes, then the grade specials as short lines under the table.
 */
export function BranchGradeTable({ table }: BranchGradeTableProps) {
  const view = toGradeTableView(table);

  return (
    <div className={styles.gradesBlock}>
      <table className={styles.grades} aria-label={table.ariaLabel}>
        <thead>
          <tr>
            <th scope="col" className={styles.gradesCorner}>
              {table.gradeColumnLabel}
            </th>
            {view.grades.map((grade) => (
              <th key={grade} scope="col">
                {grade}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.statRows.map((statRow) => (
            <tr key={statRow.label}>
              <th scope="row" title={statRow.title}>
                {statRow.label}
              </th>
              {statRow.values.map((value, index) => (
                <td key={view.grades[index] ?? index}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {view.specials.length > 0 && (
        <ul className={styles.specials} aria-label={table.specialColumnLabel}>
          {view.specials.map((special) => (
            <li key={special.gradesLabel}>
              <span className={styles.specialGrades}>{special.gradesLabel}</span> {special.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
