import { UNCHANGED_GRADE_VALUE, type BranchGradeTableData } from './types';

/** One stat across every grade of a branch, e.g. "DMG: +4 +8 +12 +18". */
export type GradeStatRowView = {
  label: string;
  title?: string;
  values: readonly string[];
};

/** A special note and the run of consecutive grades that share it. */
export type GradeSpecialView = {
  /** "4" for one grade, "5–7" for a run. */
  gradesLabel: string;
  text: string;
};

/** The grade table turned sideways: grades as columns, changing stats as rows. */
export type GradeTableView = {
  grades: readonly number[];
  statRows: readonly GradeStatRowView[];
  specials: readonly GradeSpecialView[];
};

function formatGradeRun(first: number, last: number): string {
  return first === last ? String(first) : `${first}–${last}`;
}

function collectSpecials(table: BranchGradeTableData): GradeSpecialView[] {
  const specials: GradeSpecialView[] = [];
  let runStart = 0;

  for (let index = 1; index <= table.rows.length; index += 1) {
    const runRow = table.rows[runStart];
    const row = table.rows[index];
    if (row !== undefined && row.special === runRow.special) {
      continue;
    }
    if (runRow.special !== UNCHANGED_GRADE_VALUE) {
      const lastRow = table.rows[index - 1];
      specials.push({
        gradesLabel: formatGradeRun(runRow.grade, lastRow.grade),
        text: runRow.special,
      });
    }
    runStart = index;
  }

  return specials;
}

/**
 * Pivots a branch's per-grade rows into the card layout of the chooser:
 * one row per stat that changes at some grade (a stat unchanged at every
 * grade is dropped) and the specials grouped by runs of equal grades.
 */
export function toGradeTableView(table: BranchGradeTableData): GradeTableView {
  const statRows = table.statColumns
    .map((column, columnIndex) => ({
      label: column.label,
      title: column.title,
      values: table.rows.map((row) => row.stats[columnIndex] ?? UNCHANGED_GRADE_VALUE),
    }))
    .filter((statRow) => statRow.values.some((value) => value !== UNCHANGED_GRADE_VALUE));

  return {
    grades: table.rows.map((row) => row.grade),
    statRows,
    specials: collectSpecials(table),
  };
}
