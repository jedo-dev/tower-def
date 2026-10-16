import styles from './BranchChooserDialog.module.css';
import type { BranchGradeTableData } from '../model/types';

type BranchGradeTableProps = {
  table: BranchGradeTableData;
};

/** Per-grade stat deltas of one branch, with a trailing free-text "Special" column. */
export function BranchGradeTable({ table }: BranchGradeTableProps) {
  return (
    <table className={styles.grades} aria-label={table.ariaLabel}>
      <thead>
        <tr>
          <th scope="col">{table.gradeColumnLabel}</th>
          {table.statColumns.map((column) => (
            <th key={column.label} scope="col" title={column.title}>
              {column.label}
            </th>
          ))}
          <th scope="col">{table.specialColumnLabel}</th>
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.grade}>
            <th scope="row">{row.grade}</th>
            {row.stats.map((stat, index) => (
              <td key={table.statColumns[index]?.label ?? index}>{stat}</td>
            ))}
            <td className={styles.special}>{row.special}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
