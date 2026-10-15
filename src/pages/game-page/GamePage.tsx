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
import { onGameCommand } from '../../shared/lib/game-bridge/bridge';
import { EngineErrorOverlay } from './ui/EngineErrorOverlay';
import { useMatchUnloadGuard } from './ui/useMatchUnloadGuard';
import './GamePage.css';

export type GamePageProps = {
  setup: GameSetupConfig | null;
  onExit: () => void;
};

export function GamePage({ setup, onExit }: GamePageProps) {
  useMatchUnloadGuard();
  // Portrait accordion: the build drawer and the send cards share the strip
  // under the battlefield, so opening one folds the other to its header.
  const [isHudExpanded, setIsHudExpanded] = useState(false);

  // The confirmed quit is a typed command: the engine freezes the field and
  // the page leaves. Unmounting the canvas destroys the game.
  useEffect(() => onGameCommand('quit-match', () => onExit()), [onExit]);

  return (
    <main className="game-page">
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
