import { GameCanvas } from '../../widgets/game-canvas/ui/GameCanvas';
import { HudPanel } from '../../widgets/hud/ui/HudPanel';
import type { GameSetupConfig } from '../../shared/config/game-setup';
import './GamePage.css';

export type GamePageProps = {
  setup: GameSetupConfig | null;
};

export function GamePage({ setup }: GamePageProps) {
  return (
    <main className="game-page">
      <HudPanel setup={setup} />
      <GameCanvas setup={setup} />
    </main>
  );
}
