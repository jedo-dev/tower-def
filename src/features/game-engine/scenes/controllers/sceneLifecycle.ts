import Phaser from 'phaser';
import { EMPTY_WAVE_ROUTES } from '../../../../entities/wave';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import {
  createTowerAnimations,
  createUnitWalkAnimations,
} from '../../runtime/animation/gameSceneAnimationRuntime';
import { applySpriteSheetFiltering } from '../../runtime/assets/gameSceneAssetLoader';
import { startMissingArtReport, stopMissingArtReport } from '../../runtime/assets/missingArtReport';
import { ensurePlaceholderTextures } from '../../runtime/assets/placeholderTexture';
import { destroyBattlefieldRenderState } from '../../runtime/battlefield/battlefieldRenderState';
import { destroySideScenery } from '../../runtime/battlefield/sideScenery';
import { registerResponsiveCamera } from '../../runtime/camera/gameSceneCameraRuntime';
import { drainCreepAdornmentPool } from '../../runtime/creep/creepAdornments';
import { applyEffectPipResolution } from '../../runtime/combat/creepEffectVisuals';
import { drainFloatingLabelPool } from '../../runtime/labels/floatingLabelPool';
import { registerFloatingLabels } from '../../runtime/labels/floatingLabelRuntime';
import { ensureCreepAdornmentTextures } from '../../runtime/creep/creepAdornmentTextures';
import {
  attachRoutePreviewGraphics,
  destroyRoutePreviewGraphics,
} from '../../runtime/grid/buildRoutePreviewRuntime';
import { clearTerrainSprites as clearTerrainSpritesRuntime } from '../../runtime/grid/gameSceneGridRenderer';
import { destroyGridOccupancyOverlay } from '../../runtime/grid/gridOccupancyOverlay';
import { destroyEndpointGates } from '../../runtime/grid/endpointGates';
import { destroyPathRibbon } from '../../runtime/grid/pathRibbonRenderer';
import {
  registerSceneAudioUnlock,
  registerScenePointerHandlers,
} from '../../runtime/input/gameSceneInputBindings';
import { createInputControllerState } from '../../runtime/input/gameSceneInputController';
import { clearFieldWaveSchedule } from '../../runtime/wave/fieldWaveSpawns';
import { BUILD_PREVIEW_RENDER_DEPTH, ROUTE_PREVIEW_RENDER_DEPTH } from '../gameScene.constants';
import { syncVisibleSideScenery } from './battlefieldViewController';
import { updateBuildPreview, updateGridOverlayVisualState } from './boardRenderController';
import { registerBridgeCommandHandlers } from './bridgeCommandRegistry';
import type { GameSceneContext } from './gameSceneContext';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import {
  handleGameOut,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleWheel,
} from './inputWiring';
import { drawGrid, loadSetupConfig } from './matchSetup';
import { ensureBaseAmbientPlaying } from './sceneAudio';
import { canPerformBuildActions, getBoardCamera } from './sceneQueries';

function registerInput(context: GameSceneContext): void {
  const { scene, state } = context;
  // Phaser tracks one touch pointer by default; pinch needs a second one.
  scene.input.addPointer(1);
  state.teardownCallbacks.push(
    registerScenePointerHandlers(scene, {
      onPointerMove: (pointer) => handlePointerMove(context, pointer),
      onPointerDown: (pointer) => handlePointerDown(context, pointer),
      onPointerUp: (pointer) => handlePointerUp(context, pointer),
      onWheel: (pointer, deltaY) => handleWheel(context, pointer, deltaY),
      onGameOut: () => handleGameOut(context),
    }),
  );
}

/** Damage number labels and effect pips follow the canvas pixel ratio. */
function registerLabels(context: GameSceneContext): void {
  const { scene, state } = context;
  state.teardownCallbacks.push(
    registerFloatingLabels({
      scene,
      pool: state.floatingLabelPool,
      onRasterScaleChanged: (rasterScale) => {
        applyEffectPipResolution(state.playerField.creeps, rasterScale);
        applyEffectPipResolution(state.opponentField.creeps, rasterScale);
      },
    }),
  );
}

function publishInitialRegistry(context: GameSceneContext): void {
  const { scene, state } = context;
  scene.registry.set('economy.gold', state.runState.playerGold);
  scene.registry.set('economy.lives', state.duelMatchState.player.hp);
  scene.registry.set('phase.build.active', canPerformBuildActions(state));
  scene.registry.set('phase.game.over', state.runState.isGameOver);
  scene.registry.set('economy.earlyWaveStartBonus.granted', false);
}

/** Phaser `create`: loads the setup, draws the board and wires input, audio and the bridge. */
export function createScene(context: GameSceneContext): void {
  const { scene, state } = context;
  state.isSceneCleanedUp = false;
  startMissingArtReport();
  ensurePlaceholderTextures(scene);
  ensureCreepAdornmentTextures(scene);
  loadSetupConfig(context);
  scene.cameras.main.setBackgroundColor('#1a1f2c');
  scene.cameras.main.roundPixels = true;
  applySpriteSheetFiltering(scene);
  state.boardCamera = null;
  state.teardownCallbacks.push(registerResponsiveCamera(scene, getBoardCamera(context)));
  drawGrid(context);
  syncVisibleSideScenery(context);
  registerLabels(context);
  registerInput(context);
  state.buildPreviewOverlay = scene.add.graphics();
  state.buildPreviewOverlay.setDepth(BUILD_PREVIEW_RENDER_DEPTH);
  attachRoutePreviewGraphics(state.routePreview, scene.add.graphics(), ROUTE_PREVIEW_RENDER_DEPTH);
  scene.input.mouse?.disableContextMenu();
  state.teardownCallbacks.push(
    registerSceneAudioUnlock(
      scene,
      () => state.soundManager,
      () => ensureBaseAmbientPlaying(state),
    ),
  );
  createUnitWalkAnimations(scene);
  createTowerAnimations(scene);
  registerBridgeCommandHandlers(context);
  publishInitialRegistry(context);
  updateGridOverlayVisualState(state);
  // Draws the build-phase routes before the first pointer move.
  updateBuildPreview(context);
  publishHudSnapshot(state);
  publishGameEvent('match-started', { trigger: 'setup' });
  const shutdown = (): void => handleSceneShutdown(context);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, shutdown);
  scene.events.once(Phaser.Scenes.Events.DESTROY, shutdown);
}

function destroyBoardGraphics(context: GameSceneContext): void {
  const { state } = context;
  destroyBattlefieldRenderState(state.playerField);
  destroyBattlefieldRenderState(state.opponentField);
  destroySideScenery(state.sideScenery);
  // After both fields released their creeps' adornments into the pool.
  drainCreepAdornmentPool(state.creepAdornmentPool);
  drainFloatingLabelPool(state.floatingLabelPool);
  state.buildPreviewOverlay?.destroy();
  state.buildPreviewOverlay = null;
  destroyRoutePreviewGraphics(state.routePreview);
  state.pathCellKeys.clear();
  state.gridRendererState.gridGraphics?.destroy();
  state.gridRendererState.gridGraphics = null;
  destroyGridOccupancyOverlay(state.gridRendererState);
  clearTerrainSpritesRuntime(state.gridRendererState);
  destroyEndpointGates(state.gridRendererState.endpointGates);
  destroyPathRibbon(state.gridRendererState.pathRibbon);
}

/** Scene shutdown or destroy: releases every subscription, sprite and sound once. */
export function handleSceneShutdown(context: GameSceneContext): void {
  const { state } = context;
  if (state.isSceneCleanedUp) {
    return;
  }

  state.isSceneCleanedUp = true;

  stopMissingArtReport();
  state.teardownCallbacks.forEach((teardown) => teardown());
  state.teardownCallbacks.length = 0;

  destroyBoardGraphics(context);
  state.runState.activeCreepRoutes = EMPTY_WAVE_ROUTES;
  state.runState.pendingWaveSpawns = [];
  clearFieldWaveSchedule(state.opponentWave);
  state.gridModel = null;
  state.runState.nextWaveStartsAtMs = null;
  state.placedTowerCostsByCellKey.clear();
  state.inputControllerState = createInputControllerState();
  state.devFpsReportElapsedMs = 0;
  state.runState.lastPublishedAutoStartSecondsLeft = null;
  state.soundManager?.destroy();
  state.soundManager = null;
  state.hoveredCell = null;
  state.hoveredBuildAnchor = null;
  state.pendingPlacementAnchor = null;
}
