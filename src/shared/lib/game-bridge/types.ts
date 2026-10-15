export type GamePhase = 'build' | 'wave' | 'completed' | 'game-over';
import type { EffectId, TowerTypeId } from '../../types/content-ids';

/** Archetype the player can select to build; derived from tower content. */
export type HudTowerType = TowerTypeId;
export type HudFactionType = 'undead' | 'orc' | 'human' | 'elf';
export type HudCreepType = 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle';
export type BattlefieldView = 'player' | 'opponent';
export type MatchOutcomeStatus = 'active' | 'player-won' | 'player-lost' | 'draw';
/**
 * Why a finished match went the way it did: one side out (`knockout`), or both
 * out on the same wave and settled by `fewer-leaks` that wave, then by
 * `more-lives` before it, else `even` (a draw).
 */
export type MatchOutcomeReason = 'knockout' | 'fewer-leaks' | 'more-lives' | 'even';
export type DuelistSide = 'player' | 'opponent';
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

export type WaveQueueItem = {
  type: HudCreepType;
  index: number;
};

export type CreepSendQueueItem = {
  creepTypeId: string;
  index: number;
};

export type CreepSendUnitLimit = {
  creepTypeId: string;
  /** Per-type cap for this unit this wave (by tier). */
  cap: number;
  /** How many more of this unit fit this wave under both the type and the wave cap. */
  remaining: number;
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

export type SelectedTowerSnapshot = {
  id: string;
  type: HudTowerType;
  /** Authored tower name, e.g. "Frost Wyrm Nest"; absent falls back to the archetype. */
  name?: string;
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
};
