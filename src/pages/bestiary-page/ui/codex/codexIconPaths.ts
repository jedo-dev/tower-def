import type { StatKey } from '../../model/types';

/** Line pictograms of the codex, drawn on a 16x16 grid with round strokes. */
export type CodexIconName = StatKey | 'chevronLeft' | 'chevronRight' | 'chevronDown';

export const CODEX_ICON_PATHS: Record<CodexIconName, readonly string[]> = {
  physical: ['M13.5 2.5L6.5 9.5M13.5 2.5H11M13.5 2.5V5M4.2 8.2l3.6 3.6M5.8 10.2L2.5 13.5'],
  magical: ['M8 1.8l1.8 4 4.3.4-3.3 2.9 1 4.2L8 11.1l-3.8 2.2 1-4.2-3.3-2.9 4.3-.4z'],
  percent: [
    'M12.5 3.5l-9 9',
    'M6.5 4.6a1.9 1.9 0 1 1-3.8 0a1.9 1.9 0 1 1 3.8 0',
    'M13.3 11.4a1.9 1.9 0 1 1-3.8 0a1.9 1.9 0 1 1 3.8 0',
  ],
  range: [
    'M13.3 8a5.3 5.3 0 1 1-10.6 0a5.3 5.3 0 1 1 10.6 0',
    'M9.8 8a1.8 1.8 0 1 1-3.6 0a1.8 1.8 0 1 1 3.6 0',
    'M8 1v2.4M8 12.6V15M1 8h2.4M12.6 8H15',
  ],
  reload: [
    'M4 2h8M4 14h8M5 2v1.6c0 2 3 3 3 4.4s-3 2.4-3 4.4V14M11 2v1.6c0 2-3 3-3 4.4s3 2.4 3 4.4V14',
  ],
  health: [
    'M8 13.6S2.4 10.2 2.4 6.2A2.8 2.8 0 0 1 8 4.9a2.8 2.8 0 0 1 5.6 1.3c0 4-5.6 7.4-5.6 7.4z',
  ],
  speed: ['M5 2.5h4v5.8l3.6 1.6a1.5 1.5 0 0 1 .9 1.4V13H2.5v-2.6L5 8.8zM2.5 11h11'],
  physicalArmor: ['M8 1.8l5 1.8v4c0 3.2-2.2 5.4-5 6.6-2.8-1.2-5-3.4-5-6.6v-4z'],
  magicalArmor: [
    'M8 1.8l5 1.8v4c0 3.2-2.2 5.4-5 6.6-2.8-1.2-5-3.4-5-6.6v-4zM8 4.6v6.4M6 6.2l2 1.6 2-1.6',
  ],
  gold: [
    'M13.5 8a5.5 5.5 0 1 1-11 0a5.5 5.5 0 1 1 11 0',
    'M10.6 8a2.6 2.6 0 1 1-5.2 0a2.6 2.6 0 1 1 5.2 0',
  ],
  income: ['M8 13.5V3M4 7l4-4 4 4'],
  chevronLeft: ['M10 3L5 8l5 5'],
  chevronRight: ['M6 3l5 5-5 5'],
  chevronDown: ['M3 6l5 5 5-5'],
};
