import { TowerTypeId } from '../../../shared/types/content-ids';
import type { BattlefieldView, GameHudSnapshot } from '../../../shared/lib/game-bridge/types';

export type HudViewModel = {
  phaseLabel: string;
  selectedTowerLabel: string;
  modeLabel: string;
  isStartWaveDisabled: boolean;
  isArcherSelected: boolean;
  pressure: HudPressureViewModel;
  duel: HudDuelViewModel;
};

export type HudDuelViewModel = {
  playerLine: string;
  opponentLine: string;
  ariaLabel: string;
};

export type HudPressureLevel = 'none' | 'low' | 'medium' | 'high';

export type HudPressureViewModel = {
  level: HudPressureLevel;
  label: string;
  detail: string;
  queuedCount: number;
  incomingCount: number;
  ariaLabel: string;
};

export type BattlefieldViewToggleViewModel = {
  isVisible: boolean;
  isOpponentActive: boolean;
  label: string;
  ariaLabel: string;
  nextView: BattlefieldView;
};

export function mapHudSnapshotToViewModel(snapshot: GameHudSnapshot): HudViewModel {
  const phaseLabel = snapshot.phase === 'game-over' ? 'Game Over' : snapshot.phase;
  const selectedTowerLabel = snapshot.selectedTowerType === null
    ? 'None'
    : snapshot.selectedTowerType === TowerTypeId.SPLASH ? 'Plague' : 'Archer';
  const modeLabel = snapshot.selectedTowerType === null
    ? 'Tap a tower to inspect'
    : `Build: ${selectedTowerLabel}`;
  const isWaveActive = snapshot.phase === 'wave';

  return {
    phaseLabel,
    selectedTowerLabel,
    modeLabel,
    isStartWaveDisabled: isWaveActive || !snapshot.canStartWave,
    isArcherSelected: snapshot.selectedTowerType === TowerTypeId.SINGLE,
    pressure: mapHudPressureToViewModel(snapshot),
    duel: mapHudDuelToViewModel(snapshot),
  };
}

export function mapHudDuelToViewModel(snapshot: GameHudSnapshot): HudDuelViewModel {
  const playerLine = `You +${snapshot.income}`;
  const opponentLine = `Enemy ${snapshot.opponentLives} HP · +${snapshot.opponentIncome}`;

  return {
    playerLine,
    opponentLine,
    ariaLabel:
      `Your income ${snapshot.income} gold per round. ` +
      `Opponent has ${snapshot.opponentLives} lives and income ${snapshot.opponentIncome}. ` +
      `Opponent queued ${snapshot.opponentSendQueue.length} sends, you queued ${snapshot.playerSendQueue.length}`,
  };
}

export function mapHudPressureToViewModel(snapshot: GameHudSnapshot): HudPressureViewModel {
  const queuedCount = snapshot.opponentSendQueue.length;
  const incomingCount = snapshot.phase === 'wave' ? snapshot.pendingCreepCount : 0;
  const pressureCount = snapshot.phase === 'wave' ? incomingCount : queuedCount;
  const level = mapPressureLevel(pressureCount);
  const label = snapshot.phase === 'wave' ? `Incoming ${incomingCount}` : `Enemy sends ${queuedCount}`;
  const detail = snapshot.phase === 'wave'
    ? `${queuedCount} queued by enemy`
    : queuedCount === 0
      ? 'No pressure queued'
      : 'Queued for next wave';

  return {
    level,
    label,
    detail,
    queuedCount,
    incomingCount,
    ariaLabel: `${label}. ${detail}. Pressure ${level}`,
  };
}

function mapPressureLevel(count: number): HudPressureLevel {
  if (count >= 8) {
    return 'high';
  }
  if (count >= 4) {
    return 'medium';
  }
  if (count > 0) {
    return 'low';
  }
  return 'none';
}

export function mapBattlefieldViewToggleToViewModel(
  snapshot: GameHudSnapshot,
  activeView: BattlefieldView,
): BattlefieldViewToggleViewModel {
  const isOpponentActive = activeView === 'opponent';

  return {
    isVisible: snapshot.phase === 'wave',
    isOpponentActive,
    label: isOpponentActive ? 'Mine' : 'Enemy',
    ariaLabel: isOpponentActive ? 'Show player battlefield' : 'Show opponent battlefield',
    nextView: isOpponentActive ? 'player' : 'opponent',
  };
}

