import { memo, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig, destroyGame } from '../../../features/game-engine';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { publishGameEvent } from '../../../shared/lib/game-bridge/bridge';
import { logError } from '../../../shared/lib/logging/devLog';
import './GameCanvas.css';

export type GameCanvasProps = {
  setup: GameSetupConfig | null;
};

function describeBootError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'The game engine failed to start';
}

function GameCanvasComponent({ setup }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    // Creating the game can throw before any scene exists (no canvas or WebGL
    // context); report it on the bridge so the page shows its recover state.
    let game: Phaser.Game;
    try {
      game = new Phaser.Game(createGameConfig(containerRef.current));
    } catch (error) {
      const message = describeBootError(error);
      logError('engine', `Game boot failed: ${message}`, error);
      publishGameEvent('engine-error', { phase: 'boot', message });
      return;
    }
    gameRef.current = game;

    return () => {
      destroyGame(game);
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
