/** A stat column of the grade table; `title` is the hover hint on the header. */
export type BranchGradeColumn = {
  label: string;
  title?: string;
};

/** One grade of a branch: its number, one formatted value per stat column, and a special note. */
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
  /** Hover hint on the disabled Choose button; omitted when not provided. */
  disabledReason?: string;
};

export type BranchChooserDialogProps = {
  title: string;
  cards: readonly BranchChooserCard[];
  lockWarning: string;
  onConfirm: (branchId: string) => void;
  onCancel: () => void;
};
