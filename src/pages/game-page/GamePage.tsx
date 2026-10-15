import { GameCanvas } from '../../widgets/game-canvas/ui/GameCanvas';
import { CreepSendPanel } from '../../widgets/creep-send-panel';
import { DuelEventFeed } from '../../widgets/duel-event-feed';
import { HudPanel } from '../../widgets/hud/ui/HudPanel';
import { MatchOutcomeOverlay } from '../../widgets/match-outcome';
import { TowerActionPanel } from '../../widgets/tower-action-panel';
import { WaveQueue } from '../../widgets/wave-queue';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import './GamePage.css';

export type GamePageProps = {
  setup: GameSetupConfig | null;
  onExit: () => void;
};

export function GamePage({ setup, onExit }: GamePageProps) {
  return (
    <main className="game-page">
      <div className="game-viewport">
        <div className="game-canvas-area">
          <WaveQueue />
          <DuelEventFeed />
          <GameCanvas setup={setup} />
          <TowerActionPanel />
        </div>
        <div className="game-panels">
          <CreepSendPanel setup={setup} />
          <HudPanel setup={setup} />
        </div>
        {/* Last child of the viewport: it covers both the battlefield and the
            control strip, and the modal makes those two siblings inert. */}
        <MatchOutcomeOverlay onExit={onExit} />
      </div>
    </main>
  );
}
