import { memo } from 'react';
import styles from './WaveQueue.module.css';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { useOpponentFieldRemainingCreeps } from '../../../shared/lib/game-bridge/useOpponentFieldCreeps';
import { UnitIcon } from '../../../shared/ui/unit-icon';
import { mapWaveQueueToViewModel, type WaveQueueIcon } from '../model/mapWaveQueueToViewModel';

const MAX_VISIBLE_ICONS = 8;

function CreepIcons({ items, sectionKey }: { items: WaveQueueIcon[]; sectionKey: string }) {
  return (
    <>
      {items.slice(0, MAX_VISIBLE_ICONS).map((item, position) => (
        <div key={`${sectionKey}-${position}`} className={styles.icon} title={item.name}>
          <UnitIcon
            unitId={item.creepTypeId}
            label={item.name}
            faction={item.faction}
            className={styles.portrait}
          />
        </div>
      ))}
      {items.length > MAX_VISIBLE_ICONS && (
        <div className={styles.more}>+{items.length - MAX_VISIBLE_ICONS}</div>
      )}
    </>
  );
}

function WaveQueueComponent() {
  const snapshot = useGameHudSnapshot();
  const opponentFieldRemaining = useOpponentFieldRemainingCreeps();
  const viewModel = mapWaveQueueToViewModel(snapshot, opponentFieldRemaining);

  return (
    <div className={styles.queue} aria-label="Wave queue">
      <div className={styles.header}>
        <span className={styles.label}>{viewModel.headerLabel}</span>
        {viewModel.countLabel !== null && (
          <span className={styles.count}>{viewModel.countLabel}</span>
        )}
      </div>

      {viewModel.baselineHint !== null && (
        <div className={styles.baselineHint}>{viewModel.baselineHint}</div>
      )}

      {viewModel.sections.map((section) => (
        <div key={section.key} className={styles.section}>
          {section.key !== 'live' && <span className={styles.sectionLabel}>{section.label}</span>}
          <div className={styles.content}>
            <CreepIcons items={section.items} sectionKey={section.key} />
          </div>
        </div>
      ))}

      {viewModel.enemyFieldStatus !== null && (
        <div className={styles.empty} role="status">
          <span className={styles.enemyFieldStatus}>{viewModel.enemyFieldStatus}</span>
        </div>
      )}

      {viewModel.emptyText !== null && (
        <div className={styles.empty}>
          <span className={styles.emptyText}>{viewModel.emptyText}</span>
        </div>
      )}
    </div>
  );
}

export const WaveQueue = memo(WaveQueueComponent);
