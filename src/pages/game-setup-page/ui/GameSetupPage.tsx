import { useState, useCallback } from 'react';
import { BuilderFaction, builderFactions } from '../../../entities/builder-faction';
import { EnemyFaction, enemyFactions } from '../../../entities/enemy-faction';
import { Difficulty, difficulties } from '../../../entities/difficulty';
import type { GameSetupConfig, AppRoute } from '../../../shared/config/game-setup';
import { DifficultyStep } from './DifficultyStep';
import { EnemyFactionStep } from './EnemyFactionStep';
import { formatTowerName } from '../model/formatTowerName';
import { readSetupSelection, rememberSetupSelection } from '../model/setupSelectionMemory';
import { getNextSetupStep, getPreviousSetupStep, type SetupStep } from '../model/setupSteps';
import { useBuilderRaceCarousel } from '../model/useBuilderRaceCarousel';
import { RaceStep } from './RaceStep';
import { SetupProgress } from './SetupProgress';
import { SummaryStep } from './SummaryStep';
import './GameSetupPage.css';

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

export function GameSetupPage({ onStartGame, onNavigate }: GameSetupPageProps) {
  const [step, setStep] = useState<SetupStep>('builder-race');
  // Picks start from the session memory: re-opening the wizard (or coming
  // back from a match) finds the last race, enemy and difficulty.
  const [builderRace, setBuilderRaceState] = useState<BuilderFaction>(
    () => readSetupSelection().builderRace,
  );
  const [enemyFactionSelected, setEnemyFactionState] = useState<EnemyFaction>(
    () => readSetupSelection().enemyFaction,
  );
  const [difficultySelected, setDifficultyState] = useState<Difficulty>(
    () => readSetupSelection().difficulty,
  );
  const setBuilderRace = useCallback((race: BuilderFaction) => {
    rememberSetupSelection({ builderRace: race });
    setBuilderRaceState(race);
  }, []);
  const setEnemyFactionSelected = useCallback((faction: EnemyFaction) => {
    rememberSetupSelection({ enemyFaction: faction });
    setEnemyFactionState(faction);
  }, []);
  const setDifficultySelected = useCallback((difficulty: Difficulty) => {
    rememberSetupSelection({ difficulty });
    setDifficultyState(difficulty);
  }, []);
  const [useDynamicEndpoints, setUseDynamicEndpoints] = useState(false);
  const { isRaceVisible, switchRace } = useBuilderRaceCarousel(builderRace, setBuilderRace);

  const handleNext = useCallback(() => {
    const nextStep = getNextSetupStep(step);
    if (nextStep !== null) {
      setStep(nextStep);
      return;
    }
    onStartGame({
      builderFaction: builderRace,
      enemyFaction: enemyFactionSelected,
      difficulty: difficultySelected,
      endpoints: useDynamicEndpoints
        ? { mode: 'dynamic', seed: Math.floor(Math.random() * 0x7fffffff) }
        : { mode: 'fixed' },
    });
  }, [
    step,
    builderRace,
    enemyFactionSelected,
    difficultySelected,
    useDynamicEndpoints,
    onStartGame,
  ]);

  const handleBack = useCallback(() => {
    const previousStep = getPreviousSetupStep(step);
    if (previousStep !== null) {
      setStep(previousStep);
      return;
    }
    onNavigate('start');
  }, [step, onNavigate]);

  const currentBuilderConfig =
    builderFactions.find((f) => f.id === builderRace) ?? builderFactions[0];
  const currentEnemyConfig =
    enemyFactions.find((f) => f.id === enemyFactionSelected) ?? enemyFactions[0];
  const currentDifficultyConfig =
    difficulties.find((d) => d.id === difficultySelected) ?? difficulties[0];
  const starterTowerName = formatTowerName(currentBuilderConfig.towerIds[0]);

  return (
    <main
      className={`game-setup-page${step === 'builder-race' ? ' game-setup-page-race-mode' : ''}`}
    >
      {step !== 'builder-race' && (
        <header className="setup-header">
          <button
            type="button"
            className="setup-back-button"
            onClick={handleBack}
            aria-label="Go back"
            data-sound="ui.close"
          >
            {'<'}
          </button>
          <h1 className="setup-title">{STEP_TITLES[step]}</h1>
          <SetupProgress step={step} />
        </header>
      )}

      <div className="setup-content">
        {step === 'builder-race' && (
          <RaceStep
            title={STEP_TITLES[step]}
            builderRace={builderRace}
            starterTowerName={starterTowerName}
            isRaceVisible={isRaceVisible}
            onSwitchRace={switchRace}
            onBack={handleBack}
            onChoose={handleNext}
          />
        )}

        {step === 'enemy-faction' && (
          <EnemyFactionStep selected={enemyFactionSelected} onSelect={setEnemyFactionSelected} />
        )}

        {step === 'difficulty' && (
          <DifficultyStep selected={difficultySelected} onSelect={setDifficultySelected} />
        )}

        {step === 'summary' && (
          <SummaryStep
            builder={currentBuilderConfig}
            enemy={currentEnemyConfig}
            difficultyName={currentDifficultyConfig.name}
            starterTowerName={starterTowerName}
            useDynamicEndpoints={useDynamicEndpoints}
            onDynamicEndpointsChange={setUseDynamicEndpoints}
          />
        )}
      </div>

      {step !== 'builder-race' && (
        <footer className="setup-footer">
          <button
            type="button"
            className={`setup-next-button${step === 'summary' ? ' setup-next-button--primary' : ''}`}
            onClick={handleNext}
            data-sound="ui.success"
          >
            {step === 'summary' ? 'Start Game' : 'Continue'}
          </button>
        </footer>
      )}
    </main>
  );
}
