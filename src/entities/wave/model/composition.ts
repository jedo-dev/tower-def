import type { UnitConfig, UnitId } from '../../unit/model/types';

export type WaveCompositionEntry = {
  unit: UnitConfig;
  source: 'baseline' | 'player-send' | 'opponent-send';
};

export type WaveComposition = {
  waveId: string;
  round: number;
  entries: WaveCompositionEntry[];
};

export type WavePreviewUnitLine = {
  unitId: UnitId;
  name: string;
  tier: number;
  count: number;
  source: WaveCompositionEntry['source'];
};

export type WavePreviewSummary = {
  waveId: string;
  round: number;
  totalCount: number;
  lines: WavePreviewUnitLine[];
  baselineCount: number;
  playerSendCount: number;
  opponentSendCount: number;
};
