export type GamePhase = 'build' | 'wave' | 'completed' | 'game-over';
export type HudTowerType = 'archer' | 'splash';
export type HudFactionType = 'undead' | 'orc' | 'human' | 'elf';
export type HudCreepType = 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle';
export type BattlefieldView = 'player' | 'opponent';
export type MatchOutcomeStatus = 'active' | 'player-won' | 'player-lost' | 'draw';
export type DuelistSide = 'player' | 'opponent';
export type CreepSendRejectionReason =
  | 'insufficient_gold'
  | 'invalid_creep'
  | 'not_build_phase'
  | 'match_over';

export type WaveQueueItem = {
  type: HudCreepType;
  index: number;
};

export type CreepSendQueueItem = {
  creepTypeId: string;
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
  income: number;
  lives: number;
  opponentGold: number;
  opponentIncome: number;
  opponentLives: number;
  matchOutcome: {
    status: MatchOutcomeStatus;
    winner: HudFactionType | null;
  };
  builderFactionName: string;
  waveNumber: number;
  phase: GamePhase;
  canStartWave: boolean;
  selectedTowerType: HudTowerType | null;
  selectedFaction: HudFactionType;
  autoStartSecondsLeft: number | null;
  waveQueue: WaveQueueItem[];
  playerSendQueue: WaveQueueItem[];
  opponentSendQueue: WaveQueueItem[];
  pendingCreepCount: number;
};

export type GameCommandMap = {
  'start-wave': undefined;
  'select-tower': { towerType: HudTowerType | null };
  'select-faction': { faction: HudFactionType };
  'send-creep': { creepTypeId: string };
  'upgrade-tower': { towerId: string };
  'sell-tower': { towerId: string };
  'switch-battlefield-view': { view: BattlefieldView };
  'restart-match': undefined;
};

export type GameEventMap = {
  'selected-tower': { tower: SelectedTowerSnapshot | null };
  'battlefield-view-changed': {
    activeView: BattlefieldView;
    requestedView: BattlefieldView;
    accepted: boolean;
    reason?: 'not_battle_phase';
  };
  'creep-send-rejected': {
    creepTypeId: string;
    reason: CreepSendRejectionReason;
    gold: number;
    requiredGold?: number;
  };
  'send-queue-updated': {
    owner: DuelistSide;
    queue: CreepSendQueueItem[];
  };
  'income-updated': {
    owner: DuelistSide;
    income: number;
    delta: number;
  };
  'opponent-hp-updated': {
    hp: number;
    previousHp: number;
    delta: number;
  };
};
