export type GamePhase = 'build' | 'wave' | 'completed' | 'game-over';
export type HudTowerType = 'archer' | 'splash';
export type HudFactionType = 'undead' | 'orc' | 'human' | 'elf';
export type HudCreepType = 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle';
export type BattlefieldView = 'player' | 'opponent';

export type WaveQueueItem = {
  type: HudCreepType;
  index: number;
};

export type SelectedTowerSnapshot = {
  id: string;
  type: HudTowerType;
  level: number;
  position: { x: number; y: number };
  cost: number;
  combatStats: {
    damage: number;
    range: number;
    attackCooldownMs: number;
    splashRadius?: number;
  };
};

export type GameHudSnapshot = {
  gold: number;
  lives: number;
  opponentGold: number;
  opponentIncome: number;
  builderFactionName: string;
  waveNumber: number;
  phase: GamePhase;
  canStartWave: boolean;
  selectedTowerType: HudTowerType | null;
  selectedFaction: HudFactionType;
  autoStartSecondsLeft: number | null;
  waveQueue: WaveQueueItem[];
  opponentSendQueue: WaveQueueItem[];
  pendingCreepCount: number;
};

export type GameCommandMap = {
  'start-wave': undefined;
  'select-tower': { towerType: HudTowerType | null };
  'select-faction': { faction: HudFactionType };
  'upgrade-tower': { towerId: string };
  'sell-tower': { towerId: string };
  'switch-battlefield-view': { view: BattlefieldView };
};

export type GameEventMap = {
  'selected-tower': { tower: SelectedTowerSnapshot | null };
  'battlefield-view-changed': {
    activeView: BattlefieldView;
    requestedView: BattlefieldView;
    accepted: boolean;
    reason?: 'not_battle_phase';
  };
};
