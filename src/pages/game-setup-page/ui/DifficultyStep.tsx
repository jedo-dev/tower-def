import { getComputerDifficultyPreset } from '../../../entities/computer-opponent';
import { Difficulty, difficulties } from '../../../entities/difficulty';
import { handleRadioGroupKeyDown } from '../../../shared/lib/radio-group';

export const DIFFICULTY_GROUP_LABEL = 'Difficulty';

const DIFFICULTY_IDS: readonly Difficulty[] = difficulties.map((difficulty) => difficulty.id);

export type DifficultyStepProps = {
  selected: Difficulty;
  onSelect: (difficulty: Difficulty) => void;
};

/** Single choice of the computer's strength: a radio group of rows. */
export function DifficultyStep({ selected, onSelect }: DifficultyStepProps) {
  return (
    <div
      className="setup-cards setup-cards-vertical"
      role="radiogroup"
      aria-label={DIFFICULTY_GROUP_LABEL}
      onKeyDown={(event) => handleRadioGroupKeyDown(event, DIFFICULTY_IDS, selected, onSelect)}
    >
      {difficulties.map((difficulty) => {
        const isSelected = selected === difficulty.id;
        return (
          <button
            key={difficulty.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`setup-difficulty-btn${isSelected ? ' setup-difficulty-btn-selected' : ''}`}
            onClick={() => onSelect(difficulty.id)}
            data-sound="ui.build_select"
          >
            <span className="setup-difficulty-name">{difficulty.name}</span>
            <span className="setup-difficulty-desc">{difficulty.description}</span>
            <span className="setup-difficulty-modifiers">
              <span className="setup-difficulty-chip">
                AI {getComputerDifficultyPreset(difficulty.id).name}
              </span>
              <span className="setup-difficulty-chip">Equal stats &amp; gold</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
