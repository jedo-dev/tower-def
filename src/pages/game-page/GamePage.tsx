import { GameCanvas } from '../../widgets/game-canvas/ui/GameCanvas';
import { HudPanel } from '../../widgets/hud/ui/HudPanel';
import './GamePage.css';

export function GamePage() {
  return (
    <main className="game-page">
      <HudPanel />
      <GameCanvas />
    </main>
  );
}
