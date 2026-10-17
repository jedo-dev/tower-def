import type { CSSProperties } from 'react';
import { EnemyFaction, enemyFactions } from '../../../entities/enemy-faction';
import { getEnemyThemeColor } from './enemyThemeColor';
import { handleRadioGroupKeyDown } from '../../../shared/lib/radio-group';
import { FactionEmblem } from '../../../shared/ui/faction-emblem';

/** Side of the race emblem on an enemy faction card, in px. */
const ENEMY_EMBLEM_SIZE = 56;

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
            <FactionEmblem
              race={faction.id}
              size={ENEMY_EMBLEM_SIZE}
              decorative
              className="setup-card-icon"
            />
            <span className="setup-card-name">{faction.name}</span>
            <span className="setup-card-desc">{faction.description}</span>
            <span className="setup-card-tower">Creeps: {faction.creepStyle.split(',')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
