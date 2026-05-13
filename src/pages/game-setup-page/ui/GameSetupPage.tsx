import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { BuilderFaction, builderFactions, DEFAULT_BUILDER_FACTION } from '../../../entities/builder-faction';
import { EnemyFaction, enemyFactions, DEFAULT_ENEMY_FACTION } from '../../../entities/enemy-faction';
import { Difficulty, difficulties, DEFAULT_DIFFICULTY } from '../../../entities/difficulty';
import type { GameSetupConfig, AppRoute } from '../../../shared/config/game-setup';
import './GameSetupPage.css';

type SetupStep = 'builder-race' | 'enemy-faction' | 'difficulty' | 'summary';

export type GameSetupPageProps = {
  onStartGame: (config: GameSetupConfig) => void;
  onNavigate: (route: AppRoute) => void;
};

const STEP_TITLES: Record<SetupStep, string> = {
  'builder-race': 'Choose Your Race',
  'enemy-faction': 'Select Enemy Faction',
  difficulty: 'Choose Difficulty',
  summary: 'Match Summary',
};

const BUILDER_BACKGROUND_VIDEO: Partial<Record<BuilderFaction, string>> = {
  [BuilderFaction.UNDEAD]: '/assets/video/undead.mp4',
  [BuilderFaction.ORC]: '/assets/video/orc.mp4',
  [BuilderFaction.HUMAN]: '/assets/video/human.mp4',
  [BuilderFaction.ELF]: '/assets/video/elf.mp4',
};

export function GameSetupPage({ onStartGame, onNavigate }: GameSetupPageProps) {
  const [step, setStep] = useState<SetupStep>('builder-race');
  const [builderRace, setBuilderRace] = useState<BuilderFaction>(DEFAULT_BUILDER_FACTION);
  const [enemyFactionSelected, setEnemyFactionSelected] = useState<EnemyFaction>(DEFAULT_ENEMY_FACTION);
  const [difficultySelected, setDifficultySelected] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [isRaceVisible, setIsRaceVisible] = useState(true);
  const transitionTimeoutRef = useRef<number | null>(null);

  const handleNext = useCallback(() => {
    switch (step) {
      case 'builder-race':
        setStep('enemy-faction');
        break;
      case 'enemy-faction':
        setStep('difficulty');
        break;
      case 'difficulty':
        setStep('summary');
        break;
      case 'summary':
        onStartGame({
          builderFaction: builderRace,
          enemyFaction: enemyFactionSelected,
          difficulty: difficultySelected,
        });
        break;
    }
  }, [step, builderRace, enemyFactionSelected, difficultySelected, onStartGame]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'builder-race':
        onNavigate('start');
        break;
      case 'enemy-faction':
        setStep('builder-race');
        break;
      case 'difficulty':
        setStep('enemy-faction');
        break;
      case 'summary':
        setStep('difficulty');
        break;
    }
  }, [step, onNavigate]);

  const currentBuilderConfig = builderFactions.find((f) => f.id === builderRace) ?? builderFactions[0];
  const currentEnemyConfig = enemyFactions.find((f) => f.id === enemyFactionSelected) ?? enemyFactions[0];
  const currentDifficultyConfig = difficulties.find((d) => d.id === difficultySelected) ?? difficulties[0];
  const currentBuilderIndex = builderFactions.findIndex((f) => f.id === builderRace);
  const currentBuilderVideo = BUILDER_BACKGROUND_VIDEO[builderRace];

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const switchBuilderRaceWithFade = useCallback(
    (nextRace: BuilderFaction) => {
      if (nextRace === builderRace) {
        return;
      }

      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }

      setIsRaceVisible(false);
      transitionTimeoutRef.current = window.setTimeout(() => {
        setBuilderRace(nextRace);
        setIsRaceVisible(true);
        transitionTimeoutRef.current = null;
      }, 180);
    },
    [builderRace],
  );

  const handleBuilderRaceSwitch = useCallback(
    (direction: 'prev' | 'next') => {
      const factionCount = builderFactions.length;
      if (factionCount === 0) {
        return;
      }

      const currentIndex = builderFactions.findIndex((f) => f.id === builderRace);
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        direction === 'next'
          ? (safeCurrentIndex + 1) % factionCount
          : (safeCurrentIndex - 1 + factionCount) % factionCount;

      switchBuilderRaceWithFade(builderFactions[nextIndex].id);
    },
    [builderRace, switchBuilderRaceWithFade],
  );

  return (
    <main className={`game-setup-page${step === 'builder-race' ? ' game-setup-page-race-mode' : ''}`}>
      {step !== 'builder-race' && (
        <header className="setup-header">
          <button type="button" className="setup-back-button" onClick={handleBack} aria-label="Go back" data-sound="ui.close">
            {'<'}
          </button>
          <h1 className="setup-title">{STEP_TITLES[step]}</h1>
          <div className="setup-progress">
            {['builder-race', 'enemy-faction', 'difficulty', 'summary'].map((s, idx) => (
              <div
                key={s}
                className={`setup-progress-dot${step === s ? ' setup-progress-dot-active' : ''}${
                  ['builder-race', 'enemy-faction', 'difficulty', 'summary'].indexOf(step) > idx
                    ? ' setup-progress-dot-complete'
                    : ''
                }`}
              />
            ))}
          </div>
        </header>
      )}

      <div className="setup-content">
        {step === 'builder-race' && (
          <div className="setup-race-selector">
            <div className="setup-race-topbar">
              <button type="button" className="setup-back-button" onClick={handleBack} aria-label="Go back" data-sound="ui.close">
                {'<'}
              </button>
              <div className="setup-progress">
                {builderFactions.map((faction) => (
                  <div
                    key={faction.id}
                    className={`setup-progress-dot${builderRace === faction.id ? ' setup-progress-dot-active' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className={`setup-race-preview${isRaceVisible ? ' setup-race-preview-visible' : ''}`}>
              {currentBuilderVideo ? (
                <video
                  key={builderRace}
                  className="setup-race-preview-video"
                  src={currentBuilderVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden
                />
              ) : null}

              <div
                className="setup-race-preview-overlay"
                style={{ '--card-theme': currentBuilderConfig.themeColor } as CSSProperties}
                aria-hidden
              />

              <button
                type="button"
                className="setup-race-arrow setup-race-arrow-left"
                onClick={() => handleBuilderRaceSwitch('prev')}
                aria-label="Previous race"
                disabled={!isRaceVisible}
                data-sound="ui.faction_select"
              >
                {'<'}
              </button>

              <button
                type="button"
                className="setup-race-arrow setup-race-arrow-right"
                onClick={() => handleBuilderRaceSwitch('next')}
                aria-label="Next race"
                disabled={!isRaceVisible}
                data-sound="ui.faction_select"
              >
                {'>'}
              </button>

              <div className="setup-race-info">
                <h2 className="setup-card-name">{currentBuilderConfig.name}</h2>
                <p className="setup-card-desc">{currentBuilderConfig.description}</p>
                <p className="setup-card-tower">
                  Starter: {currentBuilderConfig.towerIds[0]?.replace('_tower', '') || 'None'}
                </p>
              </div>
            </div>

            <div className="setup-race-index" aria-live="polite">
              {currentBuilderIndex + 1} / {builderFactions.length}
            </div>

            <button type="button" className="setup-next-button" onClick={handleNext} data-sound="ui.success">
              Choose Race
            </button>
          </div>
        )}

        {step === 'enemy-faction' && (
          <div className="setup-cards">
            {enemyFactions.map((faction) => (
              <button
                key={faction.id}
                type="button"
                className={`setup-card${enemyFactionSelected === faction.id ? ' setup-card-selected' : ''}`}
                onClick={() => setEnemyFactionSelected(faction.id)}
                style={{ '--card-theme': getEnemyThemeColor(faction.id) } as CSSProperties}
                data-sound="ui.faction_select"
              >
                <div className="setup-card-icon" />
                <h2 className="setup-card-name">{faction.name}</h2>
                <p className="setup-card-desc">{faction.description}</p>
                <p className="setup-card-tower">Creeps: {faction.creepStyle.split(',')[0]}</p>
              </button>
            ))}
          </div>
        )}

        {step === 'difficulty' && (
          <div className="setup-cards setup-cards-vertical">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                type="button"
                className={`setup-difficulty-btn${difficultySelected === diff.id ? ' setup-difficulty-btn-selected' : ''}`}
                onClick={() => setDifficultySelected(diff.id)}
                data-sound="ui.build_select"
              >
                <span className="setup-difficulty-name">{diff.name}</span>
                <span className="setup-difficulty-desc">{diff.description}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'summary' && (
          <div className="setup-summary">
            <div className="setup-summary-block">
              <span className="setup-summary-label">Builder Race</span>
              <span className="setup-summary-value" style={{ '--theme': currentBuilderConfig.themeColor } as CSSProperties}>
                {currentBuilderConfig.name}
              </span>
            </div>
            <div className="setup-summary-block">
              <span className="setup-summary-label">Enemy Faction</span>
              <span className="setup-summary-value" style={{ '--theme': getEnemyThemeColor(enemyFactionSelected) } as CSSProperties}>
                {currentEnemyConfig.name}
              </span>
            </div>
            <div className="setup-summary-block">
              <span className="setup-summary-label">Difficulty</span>
              <span className="setup-summary-value setup-summary-value-diff">{currentDifficultyConfig.name}</span>
            </div>
            <div className="setup-summary-block">
              <span className="setup-summary-label">Starter Tower</span>
              <span className="setup-summary-value">
                {currentBuilderConfig.towerIds[0]?.replace(/_/g, ' ').replace('undead ', '') || 'Basic'}
              </span>
            </div>
          </div>
        )}
      </div>

      {step !== 'builder-race' && (
        <footer className="setup-footer">
          <button type="button" className="setup-next-button" onClick={handleNext} data-sound="ui.success">
            {step === 'summary' ? 'Start Game' : 'Continue'}
          </button>
        </footer>
      )}
    </main>
  );
}

function getEnemyThemeColor(faction: EnemyFaction): string {
  switch (faction) {
    case EnemyFaction.UNDEAD:
      return '#5c8cff';
    case EnemyFaction.ORC:
      return '#d97b39';
    case EnemyFaction.HUMAN:
      return '#5e94d6';
    case EnemyFaction.ELF:
      return '#6bbf89';
  }
}
