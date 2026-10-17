/**
 * Value of a stat a grade leaves unchanged. A stat that shows it at every
 * grade is left out of the card's table, which lists only what changes.
 */
export const UNCHANGED_GRADE_VALUE = '—';

/** A stat row of the grade table; `title` is the hover hint on its header. */
export type BranchGradeColumn = {
  label: string;
  title?: string;
};

/** One grade of a branch: its number, one formatted value per stat, and a special note. */
export type BranchGradeRow = {
  grade: number;
  stats: readonly string[];
  special: string;
};

export type BranchGradeTableData = {
  ariaLabel: string;
  gradeColumnLabel: string;
  statColumns: readonly BranchGradeColumn[];
  specialColumnLabel: string;
  rows: readonly BranchGradeRow[];
};

export type BranchChooserPrice = {
  /** Visible price, e.g. "$40" or "40 XP". */
  label: string;
  /** Spoken price used inside button labels, e.g. "40 gold". */
  accessibleLabel: string;
};

export type BranchChooserCard = {
  id: string;
  name: string;
  description: string;
  glyph: string;
  price: BranchChooserPrice;
  grades: BranchGradeTableData;
  isDisabled: boolean;
  /** Why Confirm is unavailable for this card (e.g. "Not enough gold"), shown under the footer. */
  disabledReason?: string;
};

/** Remaining build-phase time shown as a chip in the header. */
export type BranchChooserCountdown = {
  /** Visible time, e.g. "0:21". */
  label: string;
  /** Spoken form, e.g. "Build phase ends in 21 seconds". */
  accessibleLabel: string;
};

export type BranchChooserDialogProps = {
  /** Dialog name, e.g. "Develop Bone Archer"; shown uppercased with a "·" after the verb. */
  title: string;
  cards: readonly BranchChooserCard[];
  lockWarning: string;
  onConfirm: (branchId: string) => void;
  onCancel: () => void;
  /** Header chip with the build-phase auto-start countdown; hidden when omitted. */
  countdown?: BranchChooserCountdown;
};
