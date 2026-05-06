import { memo } from 'react';
import './WaveQueue.css';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import type { HudCreepType } from '../../../shared/lib/game-bridge/types';
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

function WaveQueueComponent() {
  const snapshot = useGameHudSnapshot();
  const waveQueue = snapshot.waveQueue ?? [];
  const pendingCreepCount = snapshot.pendingCreepCount ?? 0;
  const phase = snapshot.phase;
  const waveNumber = snapshot.waveNumber;

  const showQueue = phase === 'build' || phase === 'wave';

  if (!showQueue || pendingCreepCount === 0) {
    return (
      <div className="wave-queue" aria-label="Wave queue">
        <div className="wave-queue-header">
          <span className="wave-queue-label">Wave {waveNumber}</span>
        </div>
        <div className="wave-queue-empty">
          <span className="wave-queue-empty-text">No enemies</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wave-queue" aria-label="Wave queue">
      <div className="wave-queue-header">
        <span className="wave-queue-label">Wave {waveNumber}</span>
        <span className="wave-queue-count">{pendingCreepCount} creeps</span>
      </div>
      <div className="wave-queue-content">
        {(waveQueue ?? []).slice(0, 8).map((item) => (
          <div
            key={`${item.type}-${item.index}`}
            className="wave-queue-icon"
            title={item.type}
          >
            <img
              src={CREEP_SPRITES[item.type]}
              alt={item.type}
              className="wave-queue-sprite"
            />
          </div>
        ))}
        {waveQueue.length > 8 && (
          <div className="wave-queue-more">+{waveQueue.length - 8}</div>
        )}
      </div>
    </div>
  );
}

export const WaveQueue = memo(WaveQueueComponent);
