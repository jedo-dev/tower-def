import { TowerIcon } from '../../../../shared/ui/tower-icon';
import type { FactionThemeName } from '../../../../shared/constants/theme';
import { DAMAGE_STAT_KEYS } from '../../model/statReadings';
import type { TowerCardViewModel } from '../../model/types';
import { CodexIcon } from '../codex/CodexIcon';
import { Portrait } from '../codex/Portrait';
import { StatChips } from '../codex/StatChips';
import { DetailHeader, LevelColumns, LoreFold, SpecialLines } from './DetailParts';
import { TalentSection, type TalentBranchView } from './TalentSection';

export type TowerDetailProps = {
  tower: TowerCardViewModel;
  raceName: string;
  faction: FactionThemeName;
  nameId: string;
};

function toTalentBranches(tower: TowerCardViewModel): TalentBranchView[] {
  return tower.talentBranches.map((branch) => ({
    ...branch,
    grades: branch.grades.map((grade) => ({ ...grade, cost: grade.upgradeCost })),
  }));
}

/** Everything about one tower: base stats, level-ups, talents and lore. */
export function TowerDetail({ tower, raceName, faction, nameId }: TowerDetailProps) {
  const idPrefix = `codex-${tower.id}`;
  return (
    <>
      <DetailHeader
        nameId={nameId}
        name={tower.name}
        portrait={
          <Portrait size="large">
            <TowerIcon spriteKey={tower.spriteKey} label={tower.name} faction={faction} />
          </Portrait>
        }
        tags={[
          { key: 'race', label: raceName, tone: 'race' },
          {
            key: 'damage-type',
            label: tower.damageType.label,
            icon: <CodexIcon name={DAMAGE_STAT_KEYS[tower.damageType.type]} size="sm" />,
          },
          { key: 'archetype', label: tower.archetypeName },
        ]}
      />
      <StatChips stats={tower.headerStats} size="large" label="Base stats" />
      <SpecialLines
        label="Specials"
        lines={tower.specials.map((special) => `${special.label}: ${special.value}`)}
      />
      <LevelColumns idPrefix={idPrefix} levels={tower.levels} />
      {tower.talentBranches.length > 0 && (
        <TalentSection
          idPrefix={idPrefix}
          meta="Pick one at L3"
          branches={toTalentBranches(tower)}
        />
      )}
      <LoreFold description={tower.description} lore={tower.lore} />
    </>
  );
}
