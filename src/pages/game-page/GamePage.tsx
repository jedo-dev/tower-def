import { useState, useRef, useEffect } from 'react';
import { GameCanvas, type GameCanvasRef } from '../../widgets/game-canvas/ui/GameCanvas';
import { HudPanel } from '../../widgets/hud/ui/HudPanel';
import { WaveQueue } from '../../widgets/wave-queue';
import type { GameSetupConfig, AppRoute } from '../../shared/config/game-setup';
import './GamePage.css';

export type GamePageProps = {
  setup: GameSetupConfig | null;
  onNavigate?: (route: AppRoute) => void;
  sfxVolume?: number;
  ambientVolume?: number;
  onSfxVolumeChange?: (volume: number) => void;
  onAmbientVolumeChange?: (volume: number) => void;
};

type ModalContent = 'menu' | 'settings' | null;

export function GamePage({ 
  setup, 
  onNavigate,
  sfxVolume = 0.2,
  ambientVolume = 0.15,
  onSfxVolumeChange,
  onAmbientVolumeChange
}: GamePageProps) {
  const [modalContent, setModalContent] = useState<ModalContent>(null);
  const gameCanvasRef = useRef<GameCanvasRef>(null);

  // Sync volume changes to game canvas
  useEffect(() => {
    if (gameCanvasRef.current) {
      gameCanvasRef.current.setSfxVolume(sfxVolume);
    }
  }, [sfxVolume]);

  useEffect(() => {
    if (gameCanvasRef.current) {
      gameCanvasRef.current.setAmbientVolume(ambientVolume);
    }
  }, [ambientVolume]);

  const handleOpenMenu = () => {
    gameCanvasRef.current?.pause();
    setModalContent('menu');
  };

  const handleCloseModal = () => {
    setModalContent(null);
    gameCanvasRef.current?.resume();
  };

  const handleOpenSettings = () => {
    gameCanvasRef.current?.pause();
    setModalContent('settings');
  };

  const handleExit = () => {
    if (onNavigate) {
      onNavigate('start');
    }
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSfxVolumeChange) {
      onSfxVolumeChange(Number(e.target.value) / 100);
    }
  };

  const handleAmbientVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onAmbientVolumeChange) {
      onAmbientVolumeChange(Number(e.target.value) / 100);
    }
  };

  return (
    <main className="game-page">
      <div className="game-viewport">
        <WaveQueue />
        <GameCanvas ref={gameCanvasRef} setup={setup} />
        <button
          type="button"
          className="game-menu-button"
          onClick={handleOpenMenu}
          aria-label="Open menu"
          data-sound="ui.open"
        >
          ☰
        </button>
        <HudPanel setup={setup} />
      </div>

      {modalContent && (
        <div className="game-modal-overlay" onClick={handleCloseModal}>
          <div className="game-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="game-modal-back"
              onClick={handleCloseModal}
              aria-label="Go back"
              data-sound="ui.close"
            >
              {'<'}
            </button>

            {modalContent === 'menu' && (
              <div className="game-modal-menu">
                <h2 className="game-modal-title">Menu</h2>
                <div className="game-modal-buttons">
                  <button
                    type="button"
                    className="game-modal-button"
                    onClick={handleOpenSettings}
                    data-sound="ui.click"
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    className="game-modal-button game-modal-button-exit"
                    onClick={handleExit}
                    data-sound="ui.click"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}

            {modalContent === 'settings' && (
              <div className="game-modal-settings">
                <h2 className="game-modal-title">Settings</h2>
                <div className="game-modal-settings-content">
                  <div className="game-modal-setting">
                    <label className="game-modal-setting-label" htmlFor="game-sfx-volume">
                      Sound Effects
                    </label>
                    <input
                      id="game-sfx-volume"
                      type="range"
                      min="0"
                      max="100"
                      value={sfxVolume * 100}
                      onChange={handleSfxVolumeChange}
                      className="game-modal-slider"
                    />
                    <span className="game-modal-setting-value">{Math.round(sfxVolume * 100)}%</span>
                  </div>
                  <div className="game-modal-setting">
                    <label className="game-modal-setting-label" htmlFor="game-ambient-volume">
                      Ambient Music
                    </label>
                    <input
                      id="game-ambient-volume"
                      type="range"
                      min="0"
                      max="100"
                      value={ambientVolume * 100}
                      onChange={handleAmbientVolumeChange}
                      className="game-modal-slider"
                    />
                    <span className="game-modal-setting-value">{Math.round(ambientVolume * 100)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
