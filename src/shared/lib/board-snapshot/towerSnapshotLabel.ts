import { BOARD_SNAPSHOT_TOWER_KIND_GLYPH } from '../../constants/board-snapshot';
import type { TowerTypeId } from '../../types/content-ids';

/** Level a tower is built at; only levels above it are written on the board. */
const BASE_TOWER_LEVEL = 1;

/**
 * Label of a tower on the ASCII board: its kind glyph, then its level when it
 * has been upgraded. A level 1 single-target tower (a maze wall) stays `#`.
 */
export function towerSnapshotLabel(towerType: TowerTypeId, level: number): string {
  const kind = BOARD_SNAPSHOT_TOWER_KIND_GLYPH[towerType];
  return level > BASE_TOWER_LEVEL ? `${kind}${level}` : kind;
}
