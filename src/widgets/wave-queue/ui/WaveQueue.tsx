import { memo, type CSSProperties } from 'react';
import styles from './WaveQueue.module.css';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import type { HudCreepType, WaveQueueItem } from '../../../shared/lib/game-bridge/types';
import { mapWaveQueueToViewModel } from '../model/mapWaveQueueToViewModel';
import skeletonSprite from '../../../shared/sprite/skeleton.svg';
import ghoulSprite from '../../../shared/sprite/ghoul.svg';
import cryptFiendSprite from '../../../shared/sprite/undead_crypt_fiend.svg';
import gargoyleSprite from '../../../shared/sprite/undead_gargoyle.svg';

const CREEP_SPRITES: Record<HudCreepType, string> = {
  skeleton: skeletonSprite,
  ghoul: ghoulSprite,
  crypt_fiend: cryptFiendSprite,
  gargoyle: gargoyleSprite,
};

const CREEP_SHEET_FRAMES = 4;
const MAX_VISIBLE_ICONS = 8;

function CreepIcons({ items, sectionKey }: { items: WaveQueueItem[]; sectionKey: string }) {
  return (
    <>
      {items.slice(0, MAX_VISIBLE_ICONS).map((item) => (
        <div
          key={`${sectionKey}-${item.type}-${item.index}`}
          className={styles.icon}
          title={item.type}
        >
          <div className={styles.spriteViewport} aria-label={item.type}>
            <img
              src={CREEP_SPRITES[item.type]}
              alt={item.type}
              className={styles.spriteStrip}
              style={
                {
                  '--wave-queue-frames': CREEP_SHEET_FRAMES,
                  '--wave-queue-anim-delay': `${(item.index % CREEP_SHEET_FRAMES) * -0.15}s`,
                } as CSSProperties
              }
            />
          </div>
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
  const viewModel = mapWaveQueueToViewModel(snapshot);

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
          {section.key !== 'live' && (
            <span className={styles.sectionLabel}>{section.label}</span>
          )}
          <div className={styles.content}>
            <CreepIcons items={section.items} sectionKey={section.key} />
          </div>
        </div>
      ))}

      {viewModel.emptyText !== null && (
        <div className={styles.empty}>
          <span className={styles.emptyText}>{viewModel.emptyText}</span>
        </div>
      )}
    </div>
  );
}

export const WaveQueue = memo(WaveQueueComponent);
