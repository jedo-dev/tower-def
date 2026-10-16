import { useCallback, useEffect, useRef, useState } from 'react';
import { BuilderFaction, builderFactions } from '../../../entities/builder-faction';

/** How long the race preview stays faded out before the next race shows. */
export const RACE_FADE_DURATION_MS = 180;

export type RaceSwitchDirection = 'prev' | 'next';

export type BuilderRaceCarousel = {
  isRaceVisible: boolean;
  switchRace: (direction: RaceSwitchDirection) => void;
};

/**
 * Race carousel with a fade: the preview hides, the race changes after the
 * fade, then the preview shows again. A pending switch outlives the race
 * step and is only cancelled when the page unmounts.
 */
export function useBuilderRaceCarousel(
  builderRace: BuilderFaction,
  setBuilderRace: (race: BuilderFaction) => void,
): BuilderRaceCarousel {
  const [isRaceVisible, setIsRaceVisible] = useState(true);
  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const switchRaceWithFade = useCallback(
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
      }, RACE_FADE_DURATION_MS);
    },
    [builderRace, setBuilderRace],
  );

  const switchRace = useCallback(
    (direction: RaceSwitchDirection) => {
      const factionCount = builderFactions.length;
      if (factionCount === 0) {
        return;
      }

      const currentIndex = builderFactions.findIndex((faction) => faction.id === builderRace);
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        direction === 'next'
          ? (safeCurrentIndex + 1) % factionCount
          : (safeCurrentIndex - 1 + factionCount) % factionCount;

      switchRaceWithFade(builderFactions[nextIndex].id);
    },
    [builderRace, switchRaceWithFade],
  );

  return { isRaceVisible, switchRace };
}
