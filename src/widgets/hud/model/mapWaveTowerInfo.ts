import type { SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';

/** One read-only line about the tower selected while the wave runs. */
export type WaveTowerInfo = {
  name: string;
  detail: string;
  note: string;
  ariaLabel: string;
};

/** Shown for a tower built without authored content (no name in the snapshot). */
export const WAVE_TOWER_FALLBACK_NAME = 'Tower';
/** Upgrade, sell and develop are build-phase actions in the engine rules. */
export const WAVE_TOWER_LOCKED_NOTE = 'Upgrade and sell in the build phase';

export function mapWaveTowerInfo(tower: SelectedTowerSnapshot): WaveTowerInfo {
  const name = tower.name ?? WAVE_TOWER_FALLBACK_NAME;
  const { damage } = tower.combatStats;
  return {
    name,
    detail: `Lv ${tower.level} · ${damage} dmg`,
    note: WAVE_TOWER_LOCKED_NOTE,
    ariaLabel: `${name}, level ${tower.level}, ${damage} damage. ${WAVE_TOWER_LOCKED_NOTE}`,
  };
}
