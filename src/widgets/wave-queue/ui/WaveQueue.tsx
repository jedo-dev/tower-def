import { memo } from 'react';
import styles from './WaveQueue.module.css';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { useOpponentFieldRemainingCreeps } from '../../../shared/lib/game-bridge/useOpponentFieldCreeps';
import type { RaceId } from '../../../shared/types/content-ids';
import { FactionEmblem } from '../../../shared/ui/faction-emblem';
import { UnitIcon } from '../../../shared/ui/unit-icon';
import { mapWaveQueueToViewModel, type WaveQueueGroup } from '../model/mapWaveQueueToViewModel';

/** The strip keeps the concept's four portraits; more types fold into "+N". */
const MAX_VISIBLE_GROUPS = 4;
/** Rendered side of the race emblem, in px; matches --match-plate-emblem-size. */
const EMBLEM_SIZE = 34;

export type WaveQueueProps = {
  /** The player's race, whose emblem leads the plate; omitted, the plate has none. */
  race?: RaceId | null;
};

function CreatureGroups({ groups }: { groups: WaveQueueGroup[] }) {
  const hiddenCount = groups.length - MAX_VISIBLE_GROUPS;
  return (
    <ul className={styles.groups} aria-label="Creatures">
      {groups.slice(0, MAX_VISIBLE_GROUPS).map((group) => (
        <li
          key={group.creepTypeId}
          className={styles.group}
          title={`${group.name} ${group.countLabel}`}
          aria-label={`${group.count} ${group.name}`}
          data-wave-group={group.creepTypeId}
        >
          <UnitIcon
            unitId={group.creepTypeId}
            label={group.name}
            faction={group.faction}
            className={styles.portrait}
          />
          <span className={styles.count} aria-hidden="true">
            {group.countLabel}
          </span>
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className={styles.more} aria-label={`${hiddenCount} more creature types`}>
          +{hiddenCount}
        </li>
      )}
    </ul>
  );
}

/**
 * The plate above the board (docs/design/match-screen-concept.webp): the
 * player's race emblem, "NEXT: WAVE 6" with "baseline + 3 enemy sends" under
 * it, and the known creatures as portraits with counts. During the wave it
 * names the wave, the creeps still to come and what is still walking.
 */
function WaveQueueComponent({ race = null }: WaveQueueProps) {
  const snapshot = useGameHudSnapshot();
  const opponentFieldRemaining = useOpponentFieldRemainingCreeps();
  const viewModel = mapWaveQueueToViewModel(snapshot, opponentFieldRemaining);

  return (
    <section className={`ui-panel ${styles.plate}`} aria-label="Wave queue">
      {race !== null && (
        <FactionEmblem race={race} size={EMBLEM_SIZE} decorative className={styles.emblem} />
      )}
      <div className={styles.titles}>
        <h2 className={styles.title}>{viewModel.headerLabel}</h2>
        {viewModel.enemyFieldStatus !== null ? (
          <p className={`${styles.subtitle} ${styles.enemyFieldStatus}`} role="status">
            {viewModel.enemyFieldStatus}
          </p>
        ) : (
          viewModel.subtitle !== null && <p className={styles.subtitle}>{viewModel.subtitle}</p>
        )}
      </div>
      {viewModel.groups.length > 0 && <CreatureGroups groups={viewModel.groups} />}
    </section>
  );
}

export const WaveQueue = memo(WaveQueueComponent);
