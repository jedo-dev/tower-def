import type { CSSProperties } from 'react';
import { BuilderFaction, builderFactions } from '../../../entities/builder-faction';
import type { RaceSwitchDirection } from '../model/useBuilderRaceCarousel';
import { SetupProgress } from './SetupProgress';
import { FactionEmblem } from '../../../shared/ui/faction-emblem';

/** Side of the race emblem above the builder race name, in px. */
const RACE_EMBLEM_SIZE = 56;

const BUILDER_BACKGROUND_VIDEO: Partial<Record<BuilderFaction, string>> = {
  [BuilderFaction.UNDEAD]: '/assets/video/undead.mp4',
  [BuilderFaction.ORC]: '/assets/video/orc.mp4',
  [BuilderFaction.HUMAN]: '/assets/video/human.mp4',
  [BuilderFaction.ELF]: '/assets/video/elf.mp4',
};

export type RaceStepProps = {
  title: string;
  builderRace: BuilderFaction;
  starterTowerName: string;
  isRaceVisible: boolean;
  onSwitchRace: (direction: RaceSwitchDirection) => void;
  onBack: () => void;
  onChoose: () => void;
};

/** Full-screen race carousel: video preview, prev/next arrows and the pick. */
export function RaceStep({
  title,
  builderRace,
  starterTowerName,
  isRaceVisible,
  onSwitchRace,
  onBack,
  onChoose,
}: RaceStepProps) {
  const builderConfig = builderFactions.find((f) => f.id === builderRace) ?? builderFactions[0];
  const builderVideo = BUILDER_BACKGROUND_VIDEO[builderRace];
  const builderRaceIndex = Math.max(
    0,
    builderFactions.findIndex((faction) => faction.id === builderRace),
  );

  return (
    <div className="setup-race-selector">
      <div className="setup-race-topbar">
        <button
          type="button"
          className="setup-back-button"
          onClick={onBack}
          aria-label="Go back"
          data-sound="ui.close"
        >
          {'<'}
        </button>
        <h1 className="setup-race-title">{title}</h1>
        <SetupProgress step="builder-race" />
      </div>

      <div
        className={`setup-race-preview${isRaceVisible ? ' setup-race-preview-visible' : ''}`}
        style={{ '--card-theme': builderConfig.themeColor } as CSSProperties}
      >
        <div className="setup-race-media">
          {builderVideo ? (
            <video
              key={builderRace}
              className="setup-race-preview-video"
              src={builderVideo}
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
          onClick={() => onSwitchRace('prev')}
          aria-label="Previous race"
          disabled={!isRaceVisible}
          data-sound="ui.faction_select"
        >
          {'<'}
        </button>

        <button
          type="button"
          className="setup-race-arrow setup-race-arrow-right"
          onClick={() => onSwitchRace('next')}
          aria-label="Next race"
          disabled={!isRaceVisible}
          data-sound="ui.faction_select"
        >
          {'>'}
        </button>

        <div className="setup-race-info">
          <FactionEmblem
            race={builderConfig.id}
            size={RACE_EMBLEM_SIZE}
            decorative
            className="setup-race-emblem"
          />
          <h2 className="setup-card-name">{builderConfig.name}</h2>
          <p className="setup-card-desc">{builderConfig.description}</p>
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
        onClick={onChoose}
        data-sound="ui.success"
      >
        Choose
      </button>
    </div>
  );
}
