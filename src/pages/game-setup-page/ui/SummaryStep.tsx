import type { CSSProperties } from 'react';
import type { BuilderFactionConfig } from '../../../entities/builder-faction';
import type { EnemyFactionConfig } from '../../../entities/enemy-faction';
import { ToggleSwitch } from '../../../shared/ui/toggle-switch';
import { getEnemyThemeColor } from './enemyThemeColor';

export type SummaryStepProps = {
  builder: BuilderFactionConfig;
  enemy: EnemyFactionConfig;
  difficultyName: string;
  starterTowerName: string;
  useDynamicEndpoints: boolean;
  onDynamicEndpointsChange: (useDynamicEndpoints: boolean) => void;
};

/** Last wizard step: every pick by its display name, plus the lane toggle. */
export function SummaryStep({
  builder,
  enemy,
  difficultyName,
  starterTowerName,
  useDynamicEndpoints,
  onDynamicEndpointsChange,
}: SummaryStepProps) {
  return (
    <div className="setup-summary">
      <div className="setup-summary-block">
        <span className="setup-summary-label">Builder Race</span>
        <span
          className="setup-summary-value"
          style={{ '--theme': builder.themeColor } as CSSProperties}
        >
          {builder.name}
        </span>
      </div>
      <div className="setup-summary-block">
        <span className="setup-summary-label">Enemy Faction</span>
        <span
          className="setup-summary-value"
          style={{ '--theme': getEnemyThemeColor(enemy.id) } as CSSProperties}
        >
          {enemy.name}
        </span>
      </div>
      <div className="setup-summary-block">
        <span className="setup-summary-label">Difficulty</span>
        <span className="setup-summary-value setup-summary-value-diff">{difficultyName}</span>
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
            onChange={(event) => onDynamicEndpointsChange(event.target.checked)}
            aria-label="Randomize entrance and exit positions on map edges"
            data-sound="ui.build_select"
          />
          <span className="setup-summary-value">
            {useDynamicEndpoints ? 'Random edges' : 'Classic lane'}
          </span>
        </span>
      </label>
    </div>
  );
}
