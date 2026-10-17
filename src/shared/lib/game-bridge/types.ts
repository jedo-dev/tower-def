export type GamePhase = 'build' | 'wave' | 'completed' | 'game-over';
import type { EffectId, TowerTypeId } from '../../types/content-ids';

/** Archetype the player can select to build; derived from tower content. */
export type HudTowerType = TowerTypeId;
export type HudFactionType = 'undead' | 'orc' | 'human' | 'elf';
export type BattlefieldView = 'player' | 'opponent';
export type MatchOutcomeStatus = 'active' | 'player-won' | 'player-lost' | 'draw';
/**
 * Why a finished match went the way it did: one side out (`knockout`), or both
 * out on the same wave and settled by `fewer-leaks` that wave, then by
 * `more-lives` before it, else `even` (a draw).
 */
export type MatchOutcomeReason = 'knockout' | 'fewer-leaks' | 'more-lives' | 'even';
export type DuelistSide = 'player' | 'opponent';
/** Simulation speed multiplier the player can pick in the match. */
export type GameSpeed = 1 | 2;
/** Where in the scene lifecycle an engine error escaped. */
export type EngineErrorPhase = 'boot' | 'preload' | 'create' | 'update' | 'command';
export type CreepSendRejectionReason =
  | 'insufficient_gold'
  | 'invalid_creep'
  | 'not_build_phase'
  | 'match_over'
  | 'wave_send_cap'
  | 'unit_type_send_cap';
/**
 * Why a tower build was refused. The two path reasons tell the builder which
 * creep size class the block would cut off: a small block seals everything,
 * a large block only the wide creeps.
 */
export type BuildRejectionReason =
  | 'cells_occupied'
  | 'insufficient_gold'
  | 'path_blocked_small'
  | 'path_blocked_large'
  | 'not_build_phase'
  | 'match_over'
  | 'opponent_view';

/** One creature in the wave strip, by its content unit id (e.g. `orc_grunt`). */
export type WaveQueueItem = {
  creepTypeId: string;
  index: number;
};

export type CreepSendQueueItem = {
  creepTypeId: string;
  index: number;
};

/** One talent branch of a sendable creature, as the send panel's develop chooser shows it. */
export type CreatureBranchOptionSnapshot = {
  id: string;
  name: string;
  description: string;
  /** This branch is the one chosen for the creature; the other is then locked for the match. */
  isChosen: boolean;
};

export type CreepSendUnitLimit = {
  creepTypeId: string;
  /** Per-type cap for this unit this wave (by tier). */
  cap: number;
  /** How many more of this unit fit this wave under both the type and the wave cap. */
  remaining: number;
  /** Both talent branches of the creature. */
  availableBranches: CreatureBranchOptionSnapshot[];
  /** Experience of the creature's tier a branch pick costs. */
  branchCostXp: number;
  /** Grade bought along the chosen branch, 0-4; the next send spawns at it. */
  grade: number;
  /** Experience the next grade costs; `null` at grade 4. */
  nextUpgradeCostXp: number | null;
};

/** A side's send capacity for the current wave; published on change, never per frame. */
export type CreepSendLimitsSnapshot = {
  owner: DuelistSide;
  waveSendCap: number;
  waveSendsRemaining: number;
  units: CreepSendUnitLimit[];
};

export type SelectedTowerOnHitEffect = {
  effectId: EffectId;
  magnitude?: number;
  durationMs?: number;
  maxStacks?: number;
};

/** One talent branch of the selected tower's type, as the develop chooser shows it. */
export type TowerBranchOptionSnapshot = {
  id: string;
  name: string;
  description: string;
  /** This branch is the one chosen for the type; the other is then locked for the match. */
  isChosen: boolean;
};

export type SelectedTowerSnapshot = {
  id: string;
  type: HudTowerType;
  /** Authored tower name, e.g. "Frost Wyrm Nest"; absent falls back to the archetype. */
  name?: string;
  /** Authored tower id; its level curve drives upgrades. Absent: the archetype curve. */
  buildableTowerId?: string;
  level: number;
  position: { x: number; y: number };
  cost: number;
  combatStats: {
    damage: number;
    range: number;
    attackCooldownMs: number;
    splashRadius?: number;
    /** Effects the tower applies at its current level, aura included. */
    onHitEffects?: SelectedTowerOnHitEffect[];
  };
  /** Both talent branches of the tower's type; empty for a tower built without content. */
  availableBranches: TowerBranchOptionSnapshot[];
  /** Branch chosen for the tower's type this match; `null` while the choice is open. */
  chosenBranchId: string | null;
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
    /** `null` while the match is active. */
    reason: MatchOutcomeReason | null;
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
  /**
   * The computer's sends: during a wave, the ones it made for this wave (now
   * incoming on the player's field); in the build phase, any queued for the
   * next wave. The computer decides at wave start, so that queue is usually empty.
   */
  opponentSendQueue: WaveQueueItem[];
  pendingCreepCount: number;
  /** The simulation is frozen (player pause or engine error); the HUD stays live. */
  isPaused: boolean;
  gameSpeed: GameSpeed;
  /**
   * The player's talent picks this match, race tower id to branch id. A type
   * missing here has no branch yet; restart and faction change clear it.
   */
  towerBranchChoices: Readonly<Record<string, string>>;
  /** The player's unspent creature experience per tier (1-6); a missing tier has 0. */
  creatureXpByTier: Readonly<Partial<Record<number, number>>>;
  /** The player's creature branch picks this match, unit id to branch id. */
  creatureBranchChoices: Readonly<Record<string, string>>;
  /** The player's bought creature grades, unit id to grade 1-4; missing means 0. */
  creatureGrades: Readonly<Record<string, number>>;
};

export type BoardZoomAction = 'in' | 'out' | 'reset';

export type GameCommandMap = {
  'start-wave': undefined;
  'select-tower': { towerType: HudTowerType | null };
  'select-faction': { faction: HudFactionType };
  'send-creep': { creepTypeId: string };
  'upgrade-tower': { towerId: string };
  /** Choose a talent branch for the type of this grade-3 tower; locks the other branch. */
  'choose-tower-branch': { towerId: string; branchId: string };
  /** Choose a talent branch for one of the player's sendable creatures, for experience. */
  'choose-creature-branch': { unitId: string; branchId: string };
  /** Buy the next grade of a creature along its chosen branch; applies to later sends. */
  'upgrade-creature': { unitId: string };
  'sell-tower': { towerId: string };
  'switch-battlefield-view': { view: BattlefieldView };
  'restart-match': undefined;
  'set-paused': { isPaused: boolean };
  'set-game-speed': { speed: GameSpeed };
  /** Board camera: step the zoom in or out around the viewport centre, or back to fit. */
  'zoom-board': { action: BoardZoomAction };
  /** The player confirmed leaving the match; the game page returns to the menu. */
  'quit-match': undefined;
};

export type GameEventMap = {
  /**
   * A match begins on a clean slate: at scene start and on every restart.
   * Per-match UI state (the duel event feed) resets on it.
   */
  'match-started': { trigger: 'setup' | 'restart' };
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
    /** The cap that was hit, for the send-limit reasons. */
    sendLimit?: number;
  };
  'send-queue-updated': {
    owner: DuelistSide;
    queue: CreepSendQueueItem[];
  };
  /** Emitted after a send, on the wave-start reset and when a match (re)starts. */
  'send-limits-updated': CreepSendLimitsSnapshot;
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
  /**
   * Creeps the computer's field still has to resolve this wave (alive plus not
   * yet spawned). Emitted only when the count changes (wave start, kill, leak,
   * match restart), never per frame.
   */
  'opponent-field-creeps-updated': {
    remaining: number;
  };
  /** A side's sent creeps leaked enough to steal lives for it this round. */
  'lives-stolen': {
    thief: DuelistSide;
    lives: number;
    hp: number;
  };
  /** A tower build the player attempted was refused; `anchor` is the block's top-left cell. */
  'build-rejected': {
    reason: BuildRejectionReason;
    towerType: HudTowerType;
    anchor: { x: number; y: number } | null;
  };
  /**
   * The player's side of a settled round: lives the leaks took (before any
   * life steal), kill bounty the wave paid and the income paid for the next
   * build phase (0 when the settle ended the match).
   */
  'round-settled': {
    round: number;
    livesLost: number;
    bountyEarned: number;
    incomePaid: number;
  };
  /**
   * An error escaped the scene lifecycle. The engine pauses itself; the game
   * page shows a recover state (restart run / back to menu).
   */
  'engine-error': {
    phase: EngineErrorPhase;
    message: string;
  };
};
