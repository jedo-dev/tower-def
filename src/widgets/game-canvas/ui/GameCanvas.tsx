import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import Phaser from 'phaser';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { createGameConfig } from '../../../shared/lib/phaser/createGameConfig';
import './GameCanvas.css';

export type GameCanvasProps = {
  setup: GameSetupConfig | null;
};

export type GameCanvasRef = {
  pause: () => void;
  resume: () => void;
  setSfxVolume: (volume: number) => void;
  setAmbientVolume: (volume: number) => void;
};

function GameCanvasComponent({ setup }: GameCanvasProps, ref: React.RefCallback<GameCanvasRef>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sfxVolumeRef = useRef(0.2);
  const ambientVolumeRef = useRef(0.15);

  const pause = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.scene.pause('default');
    }
  }, []);

  const resume = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.scene.resume('default');
    }
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    sfxVolumeRef.current = volume;
    // Apply to Phaser game if needed
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('default');
      if (scene && 'setSfxVolume' in scene) {
        (scene as unknown as { setSfxVolume: (v: number) => void }).setSfxVolume(volume);
      }
    }
  }, []);

  const setAmbientVolume = useCallback((volume: number) => {
    ambientVolumeRef.current = volume;
    // Apply to Phaser game if needed
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('default');
      if (scene && 'setAmbientVolume' in scene) {
        (scene as unknown as { setAmbientVolume: (v: number) => void }).setAmbientVolume(volume);
      }
    }
  }, []);

  useImperativeHandle(ref, () => ({
    pause,
    resume,
    setSfxVolume,
    setAmbientVolume,
  }), [pause, resume, setSfxVolume, setAmbientVolume]);

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
  }, [setup]);

  return (
    <div className="game-canvas-shell">
      <div ref={containerRef} className="game-canvas-container" />
    </div>
  );
}

export const GameCanvas = forwardRef<GameCanvasRef, GameCanvasProps>(GameCanvasComponent);
