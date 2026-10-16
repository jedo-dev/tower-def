import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { BuilderFaction, builderFactions } from '../../../entities/builder-faction';
import { EnemyFaction, enemyFactions } from '../../../entities/enemy-faction';
import { Difficulty, difficulties } from '../../../entities/difficulty';
import type { GameSetupConfig, AppRoute } from '../../../shared/config/game-setup';
import { ToggleSwitch } from '../../../shared/ui/toggle-switch';
import { DifficultyStep } from './DifficultyStep';
import { EnemyFactionStep } from './EnemyFactionStep';
import { getEnemyThemeColor } from './enemyThemeColor';
import { readSetupSelection, rememberSetupSelection } from '../model/setupSelectionMemory';
import type { SetupStep } from '../model/setupSteps';
import { SetupProgress } from './SetupProgress';
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

const BUILDER_BACKGROUND_VIDEO: Partial<Record<BuilderFaction, string>> = {
  [BuilderFaction.UNDEAD]: '/assets/video/undead.mp4',
  [BuilderFaction.ORC]: '/assets/video/orc.mp4',
  [BuilderFaction.HUMAN]: '/assets/video/human.mp4',
  [BuilderFaction.ELF]: '/assets/video/elf.mp4',
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
          endpoints: useDynamicEndpoints
            ? { mode: 'dynamic', seed: Math.floor(Math.random() * 0x7fffffff) }
            : { mode: 'fixed' },
        });
        break;
    }
  }, [
    step,
    builderRace,
    enemyFactionSelected,
    difficultySelected,
    useDynamicEndpoints,
    onStartGame,
  ]);

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

  const currentBuilderConfig =
    builderFactions.find((f) => f.id === builderRace) ?? builderFactions[0];
  const currentEnemyConfig =
    enemyFactions.find((f) => f.id === enemyFactionSelected) ?? enemyFactions[0];
  const currentDifficultyConfig =
    difficulties.find((d) => d.id === difficultySelected) ?? difficulties[0];
  const currentBuilderVideo = BUILDER_BACKGROUND_VIDEO[builderRace];
  const builderRaceIndex = Math.max(
    0,
    builderFactions.findIndex((faction) => faction.id === builderRace),
  );
  const starterTowerName = formatTowerName(currentBuilderConfig.towerIds[0]);

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
    [builderRace, setBuilderRace],
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
          <div className="setup-race-selector">
            <div className="setup-race-topbar">
              <button
                type="button"
                className="setup-back-button"
                onClick={handleBack}
                aria-label="Go back"
                data-sound="ui.close"
              >
                {'<'}
              </button>
              <h1 className="setup-race-title">{STEP_TITLES[step]}</h1>
              <SetupProgress step={step} />
            </div>

            <div
              className={`setup-race-preview${isRaceVisible ? ' setup-race-preview-visible' : ''}`}
              style={{ '--card-theme': currentBuilderConfig.themeColor } as CSSProperties}
            >
              <div className="setup-race-media">
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

                <div className="setup-race-preview-overlay" aria-hidden />
              </div>

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
                  Starter Tower
                  <span className="setup-card-tower-value">{starterTowerName}</span>
                </p>
                <p className="setup-race-counter" aria-live="polite">
                  <span aria-hidden="true">
                    {builderRaceIndex + 1} / {builderFactions.length}
                  </span>
                  <span className="setup-visually-hidden">
                    Race {builderRaceIndex + 1} of {builderFactions.length}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              className="setup-next-button"
              onClick={handleNext}
              data-sound="ui.success"
            >
              Choose
            </button>
          </div>
        )}

        {step === 'enemy-faction' && (
          <EnemyFactionStep selected={enemyFactionSelected} onSelect={setEnemyFactionSelected} />
        )}

        {step === 'difficulty' && (
          <DifficultyStep selected={difficultySelected} onSelect={setDifficultySelected} />
        )}

        {step === 'summary' && (
          <div className="setup-summary">
            <div className="setup-summary-block">
              <span className="setup-summary-label">Builder Race</span>
              <span
                className="setup-summary-value"
                style={{ '--theme': currentBuilderConfig.themeColor } as CSSProperties}
              >
                {currentBuilderConfig.name}
              </span>
            </div>
            <div className="setup-summary-block">
              <span className="setup-summary-label">Enemy Faction</span>
              <span
                className="setup-summary-value"
                style={{ '--theme': getEnemyThemeColor(enemyFactionSelected) } as CSSProperties}
              >
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
              <span className="setup-summary-value">{starterTowerName}</span>
            </div>
            <label className="setup-summary-block setup-endpoints-toggle">
              <span className="setup-summary-label">Dynamic Entrances</span>
              <span className="setup-endpoints-control">
                <ToggleSwitch
                  checked={useDynamicEndpoints}
                  onChange={(event) => setUseDynamicEndpoints(event.target.checked)}
                  aria-label="Randomize entrance and exit positions on map edges"
                  data-sound="ui.build_select"
                />
                <span className="setup-summary-value">
                  {useDynamicEndpoints ? 'Random edges' : 'Classic lane'}
                </span>
              </span>
            </label>
          </div>
        )}
      </div>

      {step !== 'builder-race' && (
        <footer className="setup-footer">
          <button
            type="button"
            className="setup-next-button"
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

function formatTowerName(towerId: string | undefined): string {
  if (!towerId) {
    return 'None';
  }

  return towerId
    .replace(/_tower$/i, '')
    .split('_')
    .filter((chunk) => chunk.length > 0 && chunk.toLowerCase() !== 'undead')
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
}
