import { useEffect, useState } from 'react';
import { GameCanvas } from '../../widgets/game-canvas/ui/GameCanvas';
import { CreepSendPanel } from '../../widgets/creep-send-panel';
import { DuelEventFeed } from '../../widgets/duel-event-feed';
import { HudPanel } from '../../widgets/hud/ui/HudPanel';
import { MatchControls } from '../../widgets/match-controls';
import { MatchOutcomeOverlay } from '../../widgets/match-outcome';
import { TowerActionPanel } from '../../widgets/tower-action-panel';
import { WaveQueue } from '../../widgets/wave-queue';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import { LANDSCAPE_LAYOUT_CLASS_NAME } from '../../shared/constants/layout';
import { onGameCommand } from '../../shared/lib/game-bridge/bridge';
import { useLandscapeLayout } from '../../shared/lib/viewport-layout';
import { EngineErrorOverlay } from './ui/EngineErrorOverlay';
import { useMatchUnloadGuard } from './ui/useMatchUnloadGuard';
import './GamePage.css';

export type GamePageProps = {
  setup: GameSetupConfig | null;
  onExit: () => void;
};

export function GamePage({ setup, onExit }: GamePageProps) {
  useMatchUnloadGuard();
  // Landscape phones put the board beside the controls. The canvas keeps its
  // Phaser game across the switch (same element, memoised widget); the engine
  // re-fits the camera on the resulting resize.
  const isLandscapeLayout = useLandscapeLayout();
  // Portrait accordion: the build drawer and the send cards share the strip
  // under the battlefield, so opening one folds the other to its header.
  const [isHudExpanded, setIsHudExpanded] = useState(false);

  // The confirmed quit is a typed command: the engine freezes the field and
  // the page leaves. Unmounting the canvas destroys the game.
  useEffect(() => onGameCommand('quit-match', () => onExit()), [onExit]);

  return (
    <main className={isLandscapeLayout ? `game-page ${LANDSCAPE_LAYOUT_CLASS_NAME}` : 'game-page'}>
      <div className="game-viewport">
        <div className="game-canvas-area">
          <WaveQueue />
          <MatchControls />
          <GameCanvas setup={setup} />
          <TowerActionPanel />
        </div>
        {/* Between the board and the panels: never over board cells. */}
        <DuelEventFeed />
        <div className="game-panels">
          <CreepSendPanel setup={setup} isCompact={isHudExpanded} />
          <HudPanel setup={setup} isExpanded={isHudExpanded} onToggleExpanded={setIsHudExpanded} />
        </div>
        {/* Last children of the viewport: they cover both the battlefield and
            the control strip, and a modal makes the siblings inert. */}
        <MatchOutcomeOverlay onExit={onExit} />
        <EngineErrorOverlay onExit={onExit} />
      </div>
    </main>
  );
}
