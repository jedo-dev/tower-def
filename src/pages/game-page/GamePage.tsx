import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from '../../widgets/game-canvas/ui/GameCanvas';
import { CreepSendPanel } from '../../widgets/creep-send-panel';
import { DuelEventFeed } from '../../widgets/duel-event-feed';
import { HudPanel } from '../../widgets/hud/ui/HudPanel';
import { WaveTowerInfoBar } from '../../widgets/hud/ui/WaveTowerInfoBar';
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

export function GamePage({ setup, onExit }: GamePageProps) {
  useMatchUnloadGuard();
  // Landscape phones put the board beside the controls. The canvas keeps its
  // Phaser game across the switch (same element, memoised widget); the engine
  // re-fits the camera on the resulting resize.
  const isLandscapeLayout = useLandscapeLayout();
  // Portrait accordion: the build drawer and the send cards share the strip
  // under the battlefield, so opening one folds the other to its header.
  const [isHudExpanded, setIsHudExpanded] = useState(false);
  // A selected tower opens its sheet in the dock slot: the send panel and the
  // build drawer step aside (kept mounted, so their tab and scroll survive)
  // and the HUD status rows stay. In portrait the strip keeps the dock's
  // height so the board never moves; landscape has a column to spare.
  // The wave folds the dock (send panel, build drawer, sheet) away and the
  // board takes the height; only the HUD status rows stay. Everything stays
  // mounted, so the dock comes back as it was when the wave settles. The
  // strip changes height once per phase change, so the camera re-fits once.
  const isWavePhase = useIsWavePhase();
  const selectedTower = useSelectedTower();
  // The engine upgrades and sells in the build phase only: mid-wave a
  // selected tower gets a read-only line in the feed strip instead.
  const isTowerSheetOpen = selectedTower !== null && !isWavePhase;
  const waveTower = isWavePhase ? selectedTower : null;
  const panelsRef = useRef<HTMLDivElement>(null);
  // The lock and its measurement belong to the build phase's dock.
  useStripHeightLock(panelsRef, {
    isLocked: isTowerSheetOpen && !isLandscapeLayout,
    isMeasuring: !isTowerSheetOpen && !isWavePhase && !isLandscapeLayout,
  });
  // Expanding the HUD asks for the build drawer, so it closes the sheet.
  const handleHudToggle = useCallback(
    (isExpanded: boolean): void => {
      setIsHudExpanded(isExpanded);
      if (isExpanded && isTowerSheetOpen) {
        clearSelectedTower();
      }
    },
    [isTowerSheetOpen],
  );

  // The confirmed quit is a typed command: the engine freezes the field and
  // the page leaves. Unmounting the canvas destroys the game.
  useEffect(() => onGameCommand('quit-match', () => onExit()), [onExit]);

  return (
    <main className={isLandscapeLayout ? `game-page ${LANDSCAPE_LAYOUT_CLASS_NAME}` : 'game-page'}>
      <div className="game-viewport">
        <div className="game-canvas-area">
          <WaveQueue />
          <GameCanvas setup={setup} />
        </div>
        {/* Between the board and the panels: never over board cells. The
            match controls share the strip so they never cover cells either. */}
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
          <div className="game-dock-slot" inert={isWavePhase}>
            <div className="game-dock" inert={isTowerSheetOpen}>
              <CreepSendPanel setup={setup} isCompact={isHudExpanded} />
            </div>
            {!isWavePhase && <TowerActionPanel />}
          </div>
          <HudPanel
            setup={setup}
            isExpanded={isHudExpanded && !isTowerSheetOpen}
            onToggleExpanded={handleHudToggle}
            isDrawerAvailable={!isWavePhase}
          />
        </div>
        {/* Last children of the viewport: they cover both the battlefield and
            the control strip, and a modal makes the siblings inert. */}
        <MatchOutcomeOverlay onExit={onExit} />
        <EngineErrorOverlay onExit={onExit} />
      </div>
    </main>
  );
}
