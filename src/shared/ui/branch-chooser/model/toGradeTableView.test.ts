import { describe, expect, it } from 'vitest';
import { toGradeTableView } from './toGradeTableView';
import { UNCHANGED_GRADE_VALUE, type BranchGradeTableData } from './types';

const NONE = UNCHANGED_GRADE_VALUE;

function table(rows: BranchGradeTableData['rows']): BranchGradeTableData {
  return {
    ariaLabel: 'grades',
    gradeColumnLabel: 'Grade',
    statColumns: [{ label: 'DMG', title: 'Damage' }, { label: 'RNG' }, { label: 'SPD' }],
    specialColumnLabel: 'Special',
    rows,
  };
}

describe('toGradeTableView', () => {
  it('turns grades into columns and keeps only the stats that change', () => {
    const view = toGradeTableView(
      table([
        { grade: 4, stats: ['+2', NONE, NONE], special: NONE },
        { grade: 5, stats: ['+4', NONE, '-50ms'], special: NONE },
      ]),
    );

    expect(view.grades).toEqual([4, 5]);
    expect(view.statRows).toEqual([
      { label: 'DMG', title: 'Damage', values: ['+2', '+4'] },
      { label: 'SPD', title: undefined, unit: 'ms', values: [NONE, '-50'] },
    ]);
    expect(view.specials).toEqual([]);
  });

  it('keeps units in the cells when the values do not share one', () => {
    const view = toGradeTableView(
      table([
        { grade: 4, stats: ['+2%', NONE, NONE], special: NONE },
        { grade: 5, stats: ['+4', NONE, NONE], special: NONE },
      ]),
    );

    expect(view.statRows[0]).toEqual({ label: 'DMG', title: 'Damage', values: ['+2%', '+4'] });
  });

  it('drops the leading zero across a row that has a two-digit fraction', () => {
    const view = toGradeTableView(
      table([
        { grade: 4, stats: ['+0.3', NONE, NONE], special: NONE },
        { grade: 5, stats: ['+0.15', NONE, NONE], special: NONE },
        { grade: 6, stats: ['-0.05', NONE, NONE], special: NONE },
      ]),
    );

    expect(view.statRows[0]?.values).toEqual(['+.3', '+.15', '-.05']);
  });

  it('groups equal specials of consecutive grades and skips grades without one', () => {
    const view = toGradeTableView(
      table([
        { grade: 4, stats: [NONE, NONE, NONE], special: NONE },
        { grade: 5, stats: [NONE, NONE, NONE], special: 'Slow 20%' },
        { grade: 6, stats: [NONE, NONE, NONE], special: 'Slow 20%' },
        { grade: 7, stats: [NONE, NONE, NONE], special: 'Slow 30%' },
      ]),
    );

    expect(view.statRows).toEqual([]);
    expect(view.specials).toEqual([
      { gradesLabel: '5–6', text: 'Slow 20%' },
      { gradesLabel: '7', text: 'Slow 30%' },
    ]);
  });
});
