import type Phaser from 'phaser';
import { DEFAULT_BUILDER_FACTION } from '../../../../entities/builder-faction';
import {
  createComputerDecisionDebugRecorder,
  createComputerMazePlanMemory,
  type ComputerDecisionDebugRecorder,
  type ComputerMazePlanMemory,
  type LeakHistoryEntry,
} from '../../../../entities/computer-opponent';
import { createInitialDuelMatchState, type DuelMatchState } from '../../../../entities/duel-match';
import { DEFAULT_DIFFICULTY, type Difficulty } from '../../../../entities/difficulty';
import type { GameSetupEndpoints } from '../../../../shared/config/game-setup';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type {
  BattlefieldView,
  HudFactionType,
  MatchOutcomeReason,
  MatchOutcomeStatus,
} from '../../../../shared/lib/game-bridge/types';
import type { EdgeEndpoints } from '../../../../shared/lib/grid/generateEdgeEndpoints';
import { RaceId, type TowerTypeId } from '../../../../shared/types/content-ids';
import type { GridModel } from '../../../../shared/types/grid';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import {
  createBattlefieldRenderState,
  type BattlefieldRenderState,
} from '../../runtime/battlefield/battlefieldRenderState';
import {
  createSideSceneryLayer,
  type SideSceneryLayer,
} from '../../runtime/battlefield/sideScenery';
import type { BoardCameraState } from '../../runtime/camera/gameSceneCameraRuntime';
import {
  createFloatingLabelPool,
  type FloatingLabelPool,
} from '../../runtime/labels/floatingLabelPool';
import {
  createCreepAdornmentPool,
  type CreepAdornmentPool,
} from '../../runtime/creep/creepAdornments';
import {
  createSentCreepDeathTally,
  type SentCreepDeathTally,
} from '../../runtime/duel/sentCreepOutcomeTally';
import {
  createBuildRoutePreviewRuntime,
  type BuildRoutePreviewRuntime,
} from '../../runtime/grid/buildRoutePreviewRuntime';
import type { GridRendererState } from '../../runtime/grid/gameSceneGridRenderer';
import { createPathRibbonState } from '../../runtime/grid/pathRibbonRenderer';
import {
  createInputControllerState,
  type InputControllerState,
} from '../../runtime/input/gameSceneInputController';
import { createGameClockState, type GameClockState } from '../../runtime/time/gameClock';
import {
  createOpponentFieldWaveState,
  type FieldSpawnState,
} from '../../runtime/wave/fieldWaveSpawns';
import {
  createPlayerWaveRuntimeState,
  type WaveRuntimeState,
} from '../../runtime/wave/gameSceneWaveRuntime';
import {
  createOpponentFieldCreepsPublisher,
  type OpponentFieldCreepsPublisher,
} from '../../runtime/wave/opponentFieldCreepsPublisher';
import {
  createSharedBaselineWaveSource,
  type SharedBaselineWaveSource,
} from '../../runtime/wave/sharedBaselineWave';
import type { GameAudioManager } from '../../sound/GameAudioManager';
import { DEFAULT_MAP_SEED, ENTRANCE_CELL, EXIT_CELL } from '../gameScene.constants';

/**
 * Every piece of mutable runtime state GameScene owns. The scene controllers
 * read and write it through one shared record, so no state is duplicated
 * between them.
 */
export type GameSceneState = {
  isSceneCleanedUp: boolean;
  hoveredCell: GridPosition | null;
  hoveredBuildAnchor: GridPosition | null;
  /** Block armed by a first touch tap; the preview stays on it until it is built or moved. */
  pendingPlacementAnchor: GridPosition | null;
  /** Input modality from the pointer event type: finger or mouse/pen. */
  isLastPointerTouch: boolean;
  gridModel: GridModel | null;
  readonly gridRendererState: GridRendererState;
  buildPreviewOverlay: Phaser.GameObjects.Graphics | null;
  readonly routePreview: BuildRoutePreviewRuntime;
  pathCellKeys: Set<string>;
  /** A build or sell changed the board since the path tiles were last drawn. */
  arePathTilesStale: boolean;
  readonly placedTowerCostsByCellKey: Map<string, number>;
  readonly playerField: BattlefieldRenderState;
  readonly opponentField: BattlefieldRenderState;
  /** Painted strips beside the board, in the race of the field in view. */
  readonly sideScenery: SideSceneryLayer;
  /** Released creep shadows, rings and health bars of both fields, for the next spawns. */
  readonly creepAdornmentPool: CreepAdornmentPool;
  /** Pre-created damage number labels shared by both fields (tower-def-0zc). */
  readonly floatingLabelPool: FloatingLabelPool;
  /**
   * Long-lived state owned by the wave/movement runtime modules; the player
   * creep list is shared with playerField (see createPlayerWaveRuntimeState).
   */
  readonly runState: WaveRuntimeState;
  /** The computer field's spawn schedule; its creep list is opponentField's. */
  readonly opponentWave: FieldSpawnState;
  /** Lets the HUD say the round still waits on the computer's field. */
  readonly opponentFieldCreepsPublisher: OpponentFieldCreepsPublisher;
  readonly teardownCallbacks: Array<() => void>;
  selectedTowerType: TowerTypeId | null;
  selectedBuilderFactionId: RaceId;
  selectedFaction: HudFactionType;
  selectedDifficulty: Difficulty;
  duelMatchState: DuelMatchState;
  opponentLeakHistory: LeakHistoryEntry[];
  /** Sent creeps that died this wave, by field; read by the round settle. */
  readonly sentCreepDeaths: SentCreepDeathTally;
  /** The computer's sends for the running wave; its live queue is drained at wave start. */
  opponentSendsThisWave: readonly string[];
  readonly computerDecisionRecorder: ComputerDecisionDebugRecorder;
  readonly computerMazePlanMemory: ComputerMazePlanMemory;
  matchOutcomeStatus: MatchOutcomeStatus;
  matchWinner: HudFactionType | null;
  matchOutcomeReason: MatchOutcomeReason | null;
  activeBattlefieldView: BattlefieldView;
  mapSeed: number;
  setupEndpoints: GameSetupEndpoints | undefined;
  baselineWaves: SharedBaselineWaveSource;
  mapEndpoints: EdgeEndpoints;
  inputControllerState: InputControllerState;
  /** Created with the scene systems: `scale` is not available in the constructor. */
  boardCamera: BoardCameraState | null;
  devFpsReportElapsedMs: number;
  soundManager: GameAudioManager | null;
  /** Simulation time: paused and sped up independently of Phaser's clock. */
  readonly gameClock: GameClockState;
  /** Set when a lifecycle step threw; the loop idles until a restart clears it. */
  hasEngineError: boolean;
};

export function createGameSceneState(): GameSceneState {
  const playerField = createBattlefieldRenderState();
  const opponentField = createBattlefieldRenderState();
  return {
    isSceneCleanedUp: false,
    hoveredCell: null,
    hoveredBuildAnchor: null,
    pendingPlacementAnchor: null,
    isLastPointerTouch: false,
    gridModel: null,
    gridRendererState: {
      gridGraphics: null,
      occupancyGraphics: null,
      terrainSprites: [],
      gridLabels: [],
      endpointMarkers: [],
      pathRibbon: createPathRibbonState(),
    },
    buildPreviewOverlay: null,
    routePreview: createBuildRoutePreviewRuntime(),
    pathCellKeys: new Set<string>(),
    arePathTilesStale: false,
    placedTowerCostsByCellKey: new Map<string, number>(),
    playerField,
    opponentField,
    sideScenery: createSideSceneryLayer(),
    creepAdornmentPool: createCreepAdornmentPool(),
    floatingLabelPool: createFloatingLabelPool(),
    runState: createPlayerWaveRuntimeState(playerField),
    opponentWave: createOpponentFieldWaveState(opponentField),
    opponentFieldCreepsPublisher: createOpponentFieldCreepsPublisher((remaining) =>
      publishGameEvent('opponent-field-creeps-updated', { remaining }),
    ),
    teardownCallbacks: [],
    selectedTowerType: null,
    selectedBuilderFactionId: DEFAULT_BUILDER_FACTION,
    selectedFaction: 'undead',
    selectedDifficulty: DEFAULT_DIFFICULTY,
    duelMatchState: createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD),
    opponentLeakHistory: [],
    sentCreepDeaths: createSentCreepDeathTally(),
    opponentSendsThisWave: [],
    computerDecisionRecorder: createComputerDecisionDebugRecorder(),
    computerMazePlanMemory: createComputerMazePlanMemory(),
    matchOutcomeStatus: 'active',
    matchWinner: null,
    matchOutcomeReason: null,
    activeBattlefieldView: 'player',
    mapSeed: DEFAULT_MAP_SEED,
    setupEndpoints: undefined,
    baselineWaves: createSharedBaselineWaveSource(DEFAULT_MAP_SEED),
    mapEndpoints: { entrance: ENTRANCE_CELL, exit: EXIT_CELL },
    inputControllerState: createInputControllerState(),
    boardCamera: null,
    devFpsReportElapsedMs: 0,
    soundManager: null,
    gameClock: createGameClockState(),
    hasEngineError: false,
  };
}
