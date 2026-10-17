import { UNCHANGED_GRADE_VALUE, type BranchGradeTableData } from './types';

/** One stat across every grade of a branch, e.g. "DMG: +4 +8 +12 +18". */
export type GradeStatRowView = {
  label: string;
  title?: string;
  /** Unit shared by every changed value, moved out of the cells ("ms", "%"). */
  unit?: string;
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

const UNIT_SUFFIX_PATTERN = /^[+-]?[\d.]+([a-z%]+)$/i;

/**
 * The unit every changed value of a stat ends with ("ms" in "-150ms"), or
 * an empty string when they do not share one. Factored out to the row
 * header so the narrow grade columns only carry numbers.
 */
function findSharedUnit(values: readonly string[]): string {
  const units = values
    .filter((value) => value !== UNCHANGED_GRADE_VALUE)
    .map((value) => UNIT_SUFFIX_PATTERN.exec(value)?.[1] ?? '');
  const [first = ''] = units;
  return first !== '' && units.every((unit) => unit === first) ? first : '';
}

const FINE_FRACTION_PATTERN = /\.\d{2,}/;
const LEADING_ZERO_PATTERN = /^([+-]?)0\./;

/**
 * "+0.15" → "+.15" for every value of a row that carries a two-digit
 * fraction anywhere, so the row stays uniform and fits a grade column.
 */
function compactFractions(values: readonly string[]): string[] {
  if (!values.some((value) => FINE_FRACTION_PATTERN.test(value))) {
    return [...values];
  }
  return values.map((value) => value.replace(LEADING_ZERO_PATTERN, '$1.'));
}

function toStatRow(label: string, title: string | undefined, values: string[]): GradeStatRowView {
  const unit = findSharedUnit(values);
  const withoutUnit =
    unit === ''
      ? values
      : values.map((value) =>
          value === UNCHANGED_GRADE_VALUE ? value : value.slice(0, -unit.length),
        );
  const compactValues = compactFractions(withoutUnit);
  return unit === ''
    ? { label, title, values: compactValues }
    : { label, title, unit, values: compactValues };
}

/**
 * Pivots a branch's per-grade rows into the card layout of the chooser:
 * one row per stat that changes at some grade (a stat unchanged at every
 * grade is dropped) and the specials grouped by runs of equal grades.
 */
export function toGradeTableView(table: BranchGradeTableData): GradeTableView {
  const statRows = table.statColumns
    .map((column, columnIndex) =>
      toStatRow(
        column.label,
        column.title,
        table.rows.map((row) => row.stats[columnIndex] ?? UNCHANGED_GRADE_VALUE),
      ),
    )
    .filter((statRow) => statRow.values.some((value) => value !== UNCHANGED_GRADE_VALUE));

  return {
    grades: table.rows.map((row) => row.grade),
    statRows,
    specials: collectSpecials(table),
  };
}
