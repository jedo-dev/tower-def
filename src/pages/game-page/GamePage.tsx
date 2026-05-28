import { GameCanvas } from '../../widgets/game-canvas/ui/GameCanvas';
import { HudPanel } from '../../widgets/hud/ui/HudPanel';
import { TowerActionPanel } from '../../widgets/tower-action-panel';
import { WaveQueue } from '../../widgets/wave-queue';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import './GamePage.css';

export type GamePageProps = {
  setup: GameSetupConfig | null;
};

export function GamePage({ setup }: GamePageProps) {
  return (
    <main className="game-page">
      <div className="game-viewport">
        <WaveQueue />
        <GameCanvas setup={setup} />
        <TowerActionPanel />
        <HudPanel setup={setup} />
      </div>
    </main>
  );
}
