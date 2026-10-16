import type { CSSProperties } from 'react';
import { EnemyFaction, enemyFactions } from '../../../entities/enemy-faction';
import { getEnemyThemeColor } from './enemyThemeColor';
import { handleRadioGroupKeyDown } from '../../../shared/lib/radio-group';

export const ENEMY_FACTION_GROUP_LABEL = 'Enemy faction';

const ENEMY_FACTION_IDS: readonly EnemyFaction[] = enemyFactions.map((faction) => faction.id);

export type EnemyFactionStepProps = {
  selected: EnemyFaction;
  onSelect: (faction: EnemyFaction) => void;
};

/** Single choice of the opponent: a radio group, so the pick is announced. */
export function EnemyFactionStep({ selected, onSelect }: EnemyFactionStepProps) {
  return (
    <div
      className="setup-cards"
      role="radiogroup"
      aria-label={ENEMY_FACTION_GROUP_LABEL}
      onKeyDown={(event) => handleRadioGroupKeyDown(event, ENEMY_FACTION_IDS, selected, onSelect)}
    >
      {enemyFactions.map((faction) => {
        const isSelected = selected === faction.id;
        return (
          <button
            key={faction.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`setup-card${isSelected ? ' setup-card-selected' : ''}`}
            onClick={() => onSelect(faction.id)}
            style={{ '--card-theme': getEnemyThemeColor(faction.id) } as CSSProperties}
            data-sound="ui.faction_select"
          >
            <span className="setup-card-icon" aria-hidden="true" />
            <span className="setup-card-name">{faction.name}</span>
            <span className="setup-card-desc">{faction.description}</span>
            <span className="setup-card-tower">Creeps: {faction.creepStyle.split(',')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
