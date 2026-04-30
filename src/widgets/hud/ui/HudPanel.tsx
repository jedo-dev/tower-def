import './HudPanel.css';

const HUD_VALUES = {
  gold: 100,
  lives: 20,
  wave: '0 / 0',
} as const;

export function HudPanel() {
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
        <button type="button" className="hud-button" disabled>
          Build (stub)
        </button>
        <button type="button" className="hud-button hud-button-primary" disabled>
          Start Wave (stub)
        </button>
      </div>
    </section>
  );
}
