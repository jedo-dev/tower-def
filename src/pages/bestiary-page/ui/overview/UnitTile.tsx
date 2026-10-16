import type { ReactNode } from 'react';
import type { StatReadingViewModel } from '../../model/types';
import { StatChips } from '../codex/StatChips';
import codex from '../codex/Codex.module.css';
import styles from './Overview.module.css';

export type UnitTileProps = {
  /** Content id; tiles are found by it to hand focus back when the detail closes. */
  entryId: string;
  name: string;
  subtitle: string;
  portrait: ReactNode;
  stats: readonly StatReadingViewModel[];
  onOpen: () => void;
};

/** One tower or creature of the overview: tap opens its detail view. */
export function UnitTile({ entryId, name, subtitle, portrait, stats, onOpen }: UnitTileProps) {
  const detailsId = `codex-tile-${entryId}-details`;
  return (
    <button
      type="button"
      className={`${codex.frame} ${codex.pressable} ${styles.tile}`}
      aria-label={name}
      aria-describedby={detailsId}
      aria-haspopup="dialog"
      data-codex-tile={entryId}
      onClick={onOpen}
      data-sound="ui.open"
    >
      <span className={styles.tileTop}>
        {portrait}
        <span className={styles.tileIdentity}>
          <span className={styles.tileName}>{name}</span>
          <span className={styles.tileSub}>{subtitle}</span>
        </span>
      </span>
      <span id={detailsId} className={codex.visuallyHidden}>
        {`${subtitle}. ${stats.map((stat) => `${stat.label}: ${stat.value}`).join(', ')}`}
      </span>
      <StatChips stats={stats} />
    </button>
  );
}
