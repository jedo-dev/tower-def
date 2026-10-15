import type { CSSProperties } from 'react';
import type { AppRoute } from '../../../shared/config/game-setup';
import './SettingsPage.css';

// Drives the filled part of the range track (WebKit has no native progress).
function fillStyle(volume: number): CSSProperties {
  return { '--fill': `${Math.round(volume * 100)}%` } as CSSProperties;
}

export const MUTE_TOGGLE_LABEL = 'Mute all sound';

export type SettingsPageProps = {
  onNavigate: (route: AppRoute) => void;
  sfxVolume: number;
  ambientVolume: number;
  isMuted: boolean;
  onSfxVolumeChange: (volume: number) => void;
  onAmbientVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
};

export function SettingsPage({
  onNavigate,
  sfxVolume,
  ambientVolume,
  isMuted,
  onSfxVolumeChange,
  onAmbientVolumeChange,
  onMuteToggle,
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
        <button
          type="button"
          className="settings-mute-button"
          onClick={onMuteToggle}
          aria-label={MUTE_TOGGLE_LABEL}
          aria-pressed={isMuted}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="settings-mute-icon" aria-hidden>
            {isMuted ? '\u{1F507}' : '\u{1F50A}'}
          </span>
        </button>
      </header>

      <div className="settings-content" data-muted={isMuted || undefined}>
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
            style={fillStyle(sfxVolume)}
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
            style={fillStyle(ambientVolume)}
          />
          <span className="settings-value">{Math.round(ambientVolume * 100)}%</span>
        </div>

        {isMuted && (
          <p className="settings-muted-note" role="status">
            All sound is muted. Slider values are kept.
          </p>
        )}
      </div>
    </main>
  );
}
