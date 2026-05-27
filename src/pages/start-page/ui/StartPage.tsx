import type { AppRoute } from '../../../shared/config/game-setup';
import { FantasyButton } from '../../../shared/ui/fantasy-button';
import './StartPage.css';

export type StartPageProps = {
  onNavigate: (route: AppRoute) => void;
};

export function StartPage({ onNavigate }: StartPageProps) {
  return (
    <main className="start-page">
      <video
        className="start-page-video"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      >
        <source src="/assets/video/background.mp4" type="video/mp4" />
      </video>
      <div className="start-page-video-overlay" aria-hidden />
      <div className="start-page-content">
        <div className="start-title-block">
          <div className="start-title-crest" aria-hidden />
          <h1 className="start-title">Tower Defense</h1>
          <p className="start-subtitle">Protect your kingdom</p>
        </div>

        <div className="start-emblem">
          <div className="start-emblem-inner" />
        </div>

        <nav className="start-menu">
          <FantasyButton
            className="start-button-primary"
            tone="ember"
            onClick={() => onNavigate('setup')}
          >
            New Game
          </FantasyButton>
          <FantasyButton
            className="start-button-secondary"
            tone="steel"
            onClick={() => onNavigate('settings')}
          >
            Settings
          </FantasyButton>
          <FantasyButton
            className="start-button-secondary start-button-danger"
            tone="emerald"
            onClick={() => onNavigate('start')}
          >
            Exit
          </FantasyButton>
        </nav>

        <div className="start-actions" aria-hidden>
          <button type="button" className="start-action-icon">
            <span>🏆</span>
          </button>
          <button type="button" className="start-action-icon">
            <span>★</span>
          </button>
          <button type="button" className="start-action-icon">
            <span>⚙</span>
          </button>
        </div>

        <footer className="start-footer">
          <p>v0.1.0-alpha</p>
        </footer>
      </div>
    </main>
  );
}
