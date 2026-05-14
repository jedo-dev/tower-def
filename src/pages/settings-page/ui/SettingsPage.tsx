import type { AppRoute } from '../../../shared/config/game-setup';
import './SettingsPage.css';

export type SettingsPageProps = {
  onNavigate: (route: AppRoute) => void;
  sfxVolume: number;
  ambientVolume: number;
  onSfxVolumeChange: (volume: number) => void;
  onAmbientVolumeChange: (volume: number) => void;
};

export function SettingsPage({
  onNavigate,
  sfxVolume,
  ambientVolume,
  onSfxVolumeChange,
  onAmbientVolumeChange,
}: SettingsPageProps) {
  return (
    <main className="settings-page">
      <header className="settings-header">
        <button
          type="button"
          className="settings-back-button"
          onClick={() => onNavigate('start')}
          aria-label="Go back"
          data-sound="ui.close"
        >
          {'<'}
        </button>
        <h1 className="settings-title">Settings</h1>
        <div style={{ width: 44 }} />
      </header>

      <div className="settings-content">
        <div className="settings-section">
          <label className="settings-label" htmlFor="sfx-volume">
            Sound Effects
          </label>
          <input
            id="sfx-volume"
            type="range"
            min="0"
            max="100"
            value={sfxVolume * 100}
            onChange={(e) => onSfxVolumeChange(Number(e.target.value) / 100)}
            className="settings-slider"
          />
          <span className="settings-value">{Math.round(sfxVolume * 100)}%</span>
        </div>

        <div className="settings-section">
          <label className="settings-label" htmlFor="ambient-volume">
            Ambient Music
          </label>
          <input
            id="ambient-volume"
            type="range"
            min="0"
            max="100"
            value={ambientVolume * 100}
            onChange={(e) => onAmbientVolumeChange(Number(e.target.value) / 100)}
            className="settings-slider"
          />
          <span className="settings-value">{Math.round(ambientVolume * 100)}%</span>
        </div>
      </div>
    </main>
  );
}
