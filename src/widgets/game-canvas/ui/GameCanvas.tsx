import { memo, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../../../shared/lib/phaser/createGameConfig';
import './GameCanvas.css';

function GameCanvasComponent() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    const game = new Phaser.Game(createGameConfig(containerRef.current));
    gameRef.current = game;
    let lastWidth = 0;
    let lastHeight = 0;

    const handleContainerResize = () => {
      if (!containerRef.current) {
        return;
      }

      const nextWidth = Math.floor(containerRef.current.clientWidth);
      const nextHeight = Math.floor(containerRef.current.clientHeight);

      if (nextWidth <= 0 || nextHeight <= 0) {
        return;
      }

      if (nextWidth === lastWidth && nextHeight === lastHeight) {
        return;
      }

      lastWidth = nextWidth;
      lastHeight = nextHeight;
      game.scale.resize(nextWidth, nextHeight);
    };

    const observer = new ResizeObserver(() => {
      handleContainerResize();
    });
    observer.observe(containerRef.current);
    handleContainerResize();

    return () => {
      observer.disconnect();
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

export const GameCanvas = memo(GameCanvasComponent);

