export type GamePhase = 'build' | 'wave' | 'completed' | 'game-over';
export type HudTowerType = 'archer';
export type HudFactionType = 'undead' | 'orc' | 'human' | 'elf';

export type GameHudSnapshot = {
  gold: number;
  lives: number;
  waveNumber: number;
  phase: GamePhase;
  canStartWave: boolean;
  selectedTowerType: HudTowerType | null;
  selectedFaction: HudFactionType;
  autoStartSecondsLeft: number | null;
};

export type GameCommandMap = {
  'start-wave': undefined;
  'select-tower': { towerType: HudTowerType | null };
  'select-faction': { faction: HudFactionType };
};
