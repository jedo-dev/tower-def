import { memo } from 'react';
import './HudPanel.css';
import { createInitialPlayerResources } from '../../../entities/player-resources';

const INITIAL_PLAYER_RESOURCES = createInitialPlayerResources();

const HUD_VALUES = {
  gold: INITIAL_PLAYER_RESOURCES.gold,
  lives: INITIAL_PLAYER_RESOURCES.lives,
  wave: '0 / 0',
} as const;

function HudPanelComponent() {
  return (
    <section className="hud-panel" aria-label="Game HUD">
      <div className="hud-stats">
        <p className="hud-stat">
          <span className="hud-label">Gold</span>
          <span className="hud-value">{HUD_VALUES.gold}</span>
        </p>
        <p className="hud-stat">
          <span className="hud-label">Lives</span>
          <span className="hud-value">{HUD_VALUES.lives}</span>
        </p>
        <p className="hud-stat">
          <span className="hud-label">Wave</span>
          <span className="hud-value">{HUD_VALUES.wave}</span>
        </p>
      </div>

      <div className="hud-actions">
        <button
          type="button"
          className="hud-button"
          aria-label="Build tower (coming soon)"
          disabled
        >
          Build (stub)
        </button>
        <button
          type="button"
          className="hud-button"
          aria-label="Sell tower (coming soon)"
          disabled
        >
          Sell (stub)
        </button>
        <button
          type="button"
          className="hud-button hud-button-primary"
          aria-label="Start wave (coming soon)"
          disabled
        >
          Start Wave (stub)
        </button>
      </div>
    </section>
  );
}

export const HudPanel = memo(HudPanelComponent);

