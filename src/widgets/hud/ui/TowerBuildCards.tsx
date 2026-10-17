import { memo } from 'react';
import styles from './TowerBuildCards.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import type { FactionThemeName } from '../../../shared/constants/theme';
import { RaceId } from '../../../shared/types/content-ids';
import { TowerIcon } from '../../../shared/ui/tower-icon';
import { BranchGlyph } from '../../../shared/ui/branch-glyph';
import { mapRaceRosterToBuildOptions } from '../model/mapRaceRosterToBuildOptions';

export type TowerBuildCardsProps = {
  setup: GameSetupConfig | null;
};

export const BUILD_PHASE_ONLY_HINT = 'Build phase only';
export const BUILDABLE_TOWERS_LABEL = 'Buildable towers';
export const PICK_TOWER_HINT = 'Pick a tower, then tap the board';

function joinClassNames(...classNames: (string | false)[]): string {
  return classNames.filter(Boolean).join(' ');
}

/**
 * The TOWERS tab of the dock: one card per tower the player's race builds.
 * A tap picks the tower for placement (a second tap drops the pick); a card
 * the player cannot afford is disabled and says how much gold is missing.
 * Recomputed per HUD snapshot event (gold, selection), never per frame.
 */
function TowerBuildCardsComponent({ setup }: TowerBuildCardsProps) {
  const snapshot = useGameHudSnapshot();
  const raceId = setup?.builderFaction ?? RaceId.UNDEAD;
  const faction = raceId.toLowerCase() as FactionThemeName;
  const options = mapRaceRosterToBuildOptions({
    raceId,
    gold: snapshot.gold,
    selectedTowerType: snapshot.selectedTowerType,
    towerBranchChoices: snapshot.towerBranchChoices,
  });
  // Towers go down in the build phase only; mid-wave the cards say so.
  const isBuildLocked = snapshot.phase === 'wave';

  const selectedOption = options.find((option) => option.isSelected);
  const note = isBuildLocked
    ? BUILD_PHASE_ONLY_HINT
    : selectedOption
      ? `Tap the board to build ${selectedOption.name}`
      : PICK_TOWER_HINT;

  return (
    <div className={styles.panel}>
      <p className={styles.note} role={isBuildLocked ? 'note' : undefined} data-tower-note="">
        {note}
      </p>
      <div className={styles.cards} role="group" aria-label={BUILDABLE_TOWERS_LABEL}>
        {options.map((option) => (
          <button
            key={option.towerId}
            type="button"
            className={joinClassNames(
              'ui-slot',
              styles.card,
              option.isSelected && styles.cardSelected,
              isBuildLocked && styles.cardLocked,
            )}
            disabled={!option.isAffordable && !option.isSelected}
            aria-disabled={isBuildLocked || undefined}
            aria-pressed={option.isSelected}
            aria-label={option.ariaLabel}
            title={isBuildLocked ? BUILD_PHASE_ONLY_HINT : option.tooltip}
            data-tower-card={option.towerId}
            onClick={() => {
              if (isBuildLocked) return;
              sendGameCommand('select-tower', {
                towerType: option.isSelected ? null : option.towerType,
              });
            }}
          >
            <span className={styles.portrait}>
              <TowerIcon
                towerId={option.towerId}
                spriteKey={option.spriteKey}
                label={option.name}
                faction={faction}
              />
              {option.chosenBranch && (
                <BranchGlyph
                  glyph={option.chosenBranch.glyph}
                  branchId={option.chosenBranch.id}
                  className={styles.branch}
                />
              )}
            </span>
            <span className={styles.name}>{option.name}</span>
            {option.disabledReason !== null && !option.isSelected ? (
              <span className={styles.reason} aria-hidden="true" data-tower-card-reason="">
                {option.disabledReason}
              </span>
            ) : (
              <span className={styles.price} aria-hidden="true" title={option.effectHint}>
                <span className={`ui-icon-coin ${styles.coin}`} />${option.costGold}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export const TowerBuildCards = memo(TowerBuildCardsComponent);
