import { useState, useCallback } from 'react';
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
  'difficulty': 'Choose Difficulty',
  'summary': 'Match Summary',
};

export function GameSetupPage({ onStartGame, onNavigate }: GameSetupPageProps) {
  const [step, setStep] = useState<SetupStep>('builder-race');
  const [builderRace, setBuilderRace] = useState<BuilderFaction>(DEFAULT_BUILDER_FACTION);
  const [enemyFactionSelected, setEnemyFactionSelected] = useState<EnemyFaction>(DEFAULT_ENEMY_FACTION);
  const [difficultySelected, setDifficultySelected] = useState<Difficulty>(DEFAULT_DIFFICULTY);

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

  return (
    <main className="game-setup-page">
      <header className="setup-header">
        <button
          type="button"
          className="setup-back-button"
          onClick={handleBack}
          aria-label="Go back"
        >
          ←
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

      <div className="setup-content">
        {step === 'builder-race' && (
          <div className="setup-cards">
            {builderFactions.map((faction) => (
              <button
                key={faction.id}
                type="button"
                className={`setup-card${builderRace === faction.id ? ' setup-card-selected' : ''}`}
                onClick={() => setBuilderRace(faction.id)}
                style={{ '--card-theme': faction.themeColor } as React.CSSProperties}
              >
                <div className="setup-card-icon" />
                <h2 className="setup-card-name">{faction.name}</h2>
                <p className="setup-card-desc">{faction.description}</p>
                <p className="setup-card-tower">Starter: {faction.towerIds[0]?.replace('_tower', '') || 'None'}</p>
              </button>
            ))}
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
                style={{ '--card-theme': getEnemyThemeColor(faction.id) } as React.CSSProperties}
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
              <span className="setup-summary-value" style={{ '--theme': currentBuilderConfig.themeColor } as React.CSSProperties}>
                {currentBuilderConfig.name}
              </span>
            </div>
            <div className="setup-summary-block">
              <span className="setup-summary-label">Enemy Faction</span>
              <span className="setup-summary-value" style={{ '--theme': getEnemyThemeColor(enemyFactionSelected) } as React.CSSProperties}>
                {currentEnemyConfig.name}
              </span>
            </div>
            <div className="setup-summary-block">
              <span className="setup-summary-label">Difficulty</span>
              <span className="setup-summary-value setup-summary-value-diff">
                {currentDifficultyConfig.name}
              </span>
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

      <footer className="setup-footer">
        <button
          type="button"
          className="setup-next-button"
          onClick={handleNext}
        >
          {step === 'summary' ? 'Start Game' : 'Continue'}
        </button>
      </footer>
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
