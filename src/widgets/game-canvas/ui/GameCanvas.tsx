import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../../../shared/lib/phaser/createGameConfig';
import './GameCanvas.css';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    const game = new Phaser.Game(createGameConfig(containerRef.current));
    gameRef.current = game;

    const handleViewportResize = () => {
      if (!containerRef.current) {
        return;
      }

      const { clientWidth, clientHeight } = containerRef.current;
      game.scale.resize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleViewportResize);
    handleViewportResize();

    return () => {
      window.removeEventListener('resize', handleViewportResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="game-canvas-shell">
      <div ref={containerRef} className="game-canvas-container" />
    </div>
  );
}


