import { memo, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../../../shared/lib/phaser/createGameConfig';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import './GameCanvas.css';

export type GameCanvasProps = {
  setup: GameSetupConfig | null;
};

function GameCanvasComponent({ setup }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    const game = new Phaser.Game(createGameConfig(containerRef.current));
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [setup]);

  return (
    <div className="game-canvas-shell">
      <div ref={containerRef} className="game-canvas-container" />
    </div>
  );
}

export const GameCanvas = memo(GameCanvasComponent);
