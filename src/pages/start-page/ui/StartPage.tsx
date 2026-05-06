import type { AppRoute } from '../../../shared/config/game-setup';
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
          <h1 className="start-title">Tower Defense</h1>
          <p className="start-subtitle">Warcraft-inspired pixel TD prototype</p>
        </div>

        <div className="start-emblem">
          <div className="start-emblem-inner" />
        </div>

        <nav className="start-menu">
          <button
            type="button"
            className="start-button start-button-primary"
            onClick={() => onNavigate('setup')}
          >
            New Game
          </button>
          <button
            type="button"
            className="start-button start-button-disabled"
            disabled
          >
            Settings
          </button>
          <button
            type="button"
            className="start-button start-button-disabled"
            disabled
          >
            Exit
          </button>
        </nav>

        <footer className="start-footer">
          <p>v0.1.0-alpha</p>
        </footer>
      </div>
    </main>
  );
}
