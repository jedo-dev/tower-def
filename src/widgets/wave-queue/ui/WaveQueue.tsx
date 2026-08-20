import { memo, type CSSProperties } from 'react';
import './WaveQueue.css';
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
          className="wave-queue-icon"
          title={item.type}
        >
          <div className="wave-queue-sprite-viewport" aria-label={item.type}>
            <img
              src={CREEP_SPRITES[item.type]}
              alt={item.type}
              className="wave-queue-sprite-strip"
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
        <div className="wave-queue-more">+{items.length - MAX_VISIBLE_ICONS}</div>
      )}
    </>
  );
}

function WaveQueueComponent() {
  const snapshot = useGameHudSnapshot();
  const viewModel = mapWaveQueueToViewModel(snapshot);

  return (
    <div className="wave-queue" aria-label="Wave queue">
      <div className="wave-queue-header">
        <span className="wave-queue-label">{viewModel.headerLabel}</span>
        {viewModel.countLabel !== null && (
          <span className="wave-queue-count">{viewModel.countLabel}</span>
        )}
      </div>

      {viewModel.baselineHint !== null && (
        <div className="wave-queue-baseline-hint">{viewModel.baselineHint}</div>
      )}

      {viewModel.sections.map((section) => (
        <div key={section.key} className="wave-queue-section">
          {section.key !== 'live' && (
            <span className="wave-queue-section-label">{section.label}</span>
          )}
          <div className="wave-queue-content">
            <CreepIcons items={section.items} sectionKey={section.key} />
          </div>
        </div>
      ))}

      {viewModel.emptyText !== null && (
        <div className="wave-queue-empty">
          <span className="wave-queue-empty-text">{viewModel.emptyText}</span>
        </div>
      )}
    </div>
  );
}

export const WaveQueue = memo(WaveQueueComponent);
