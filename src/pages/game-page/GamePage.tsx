import { useEffect, useRef } from 'react';
import { GameCanvas } from '../../widgets/game-canvas/ui/GameCanvas';
import { DuelEventFeed } from '../../widgets/duel-event-feed';
import { MatchStatusBar, WaveTowerInfoBar } from '../../widgets/hud';
import { MatchControls } from '../../widgets/match-controls';
import { MatchOutcomeOverlay } from '../../widgets/match-outcome';
import { TowerActionPanel } from '../../widgets/tower-action-panel';
import { WaveQueue } from '../../widgets/wave-queue';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import { LANDSCAPE_LAYOUT_CLASS_NAME } from '../../shared/constants/layout';
import { onGameCommand } from '../../shared/lib/game-bridge/bridge';
import {
  clearSelectedTower,
  useSelectedTower,
} from '../../shared/lib/game-bridge/useSelectedTower';
import { useLandscapeLayout } from '../../shared/lib/viewport-layout';
import { EngineErrorOverlay } from './ui/EngineErrorOverlay';
import { MatchDock } from './ui/MatchDock';
import { useIsWavePhase } from './ui/useIsWavePhase';
import { useMatchUnloadGuard } from './ui/useMatchUnloadGuard';
import { useStripHeightLock } from './ui/useStripHeightLock';
import './GamePage.css';

export type GamePageProps = {
  setup: GameSetupConfig | null;
  onExit: () => void;
};

function mapPanelsClassName(isTowerSheetOpen: boolean, isWavePhase: boolean): string {
  if (isWavePhase) {
    return 'game-panels game-panels--wave';
  }
  return isTowerSheetOpen ? 'game-panels game-panels--sheet-open' : 'game-panels';
}

/**
 * The match screen (docs/design/match-screen-concept.webp). Portrait, top to
 * bottom: the next-wave plate, the framed board, the event row (duel feed and
 * pause / speed / quit), then the control strip: the status bar and the
 * tabbed dock. Landscape keeps the board at full height on the left and
 * stacks the rest in a column on the right.
 */
export function GamePage({ setup, onExit }: GamePageProps) {
  useMatchUnloadGuard();
  // Landscape phones put the board beside the controls. The canvas keeps its
  // Phaser game across the switch (same element, memoised widget); the engine
  // re-fits the camera on the resulting resize.
  const isLandscapeLayout = useLandscapeLayout();
  // A selected tower opens its sheet in the dock slot: the dock steps aside
  // (kept mounted, so its tab, develop mode and scroll survive) and the
  // status bar stays. In portrait the strip keeps the dock's height so the
  // board never moves; landscape has a column to spare.
  // The wave folds the dock (and the sheet) away and the board takes the
  // height; only the status bar stays. Everything stays mounted, so the dock
  // comes back as it was when the wave settles. The strip changes height once
  // per phase change, so the camera re-fits once.
  const isWavePhase = useIsWavePhase();
  const selectedTower = useSelectedTower();
  // The engine upgrades and sells in the build phase only: mid-wave a
  // selected tower gets a read-only line in the feed slot instead.
  const isTowerSheetOpen = selectedTower !== null && !isWavePhase;
  const waveTower = isWavePhase ? selectedTower : null;
  const panelsRef = useRef<HTMLDivElement>(null);
  // The lock and its measurement belong to the build phase's dock.
  useStripHeightLock(panelsRef, {
    isLocked: isTowerSheetOpen && !isLandscapeLayout,
    isMeasuring: !isTowerSheetOpen && !isWavePhase && !isLandscapeLayout,
  });

  // The confirmed quit is a typed command: the engine freezes the field and
  // the page leaves. Unmounting the canvas destroys the game.
  useEffect(() => onGameCommand('quit-match', () => onExit()), [onExit]);

  return (
    <main className={isLandscapeLayout ? `game-page ${LANDSCAPE_LAYOUT_CLASS_NAME}` : 'game-page'}>
      <div className="game-viewport">
        <div className="game-plate-slot">
          <WaveQueue race={setup?.builderFaction ?? null} />
        </div>
        <div className="game-canvas-area">
          <GameCanvas setup={setup} />
        </div>
        {/* Between the board and the strip: never over board cells. */}
        <div className="game-feed-row">
          <div className="game-feed-slot">
            <div className="game-feed-slot__feed" inert={waveTower !== null}>
              <DuelEventFeed />
            </div>
            {waveTower && <WaveTowerInfoBar tower={waveTower} onClose={clearSelectedTower} />}
          </div>
          <MatchControls />
        </div>
        <div ref={panelsRef} className={mapPanelsClassName(isTowerSheetOpen, isWavePhase)}>
          <MatchStatusBar setup={setup} />
          <div className="game-dock-slot" inert={isWavePhase}>
            <div className="game-dock" inert={isTowerSheetOpen}>
              <MatchDock setup={setup} />
            </div>
            {!isWavePhase && <TowerActionPanel />}
          </div>
        </div>
        {/* Last children of the viewport: they cover the whole screen, and a
            modal makes the siblings inert. */}
        <MatchOutcomeOverlay onExit={onExit} />
        <EngineErrorOverlay onExit={onExit} />
      </div>
    </main>
  );
}
