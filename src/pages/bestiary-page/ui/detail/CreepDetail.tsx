import { UnitIcon } from '../../../../shared/ui/unit-icon';
import type { FactionThemeName } from '../../../../shared/constants/theme';
import type { CreepCardViewModel } from '../../model/types';
import { CodexIcon } from '../codex/CodexIcon';
import { Portrait } from '../codex/Portrait';
import { StatChips } from '../codex/StatChips';
import codex from '../codex/Codex.module.css';
import { DetailHeader, LoreFold, SpecialLines } from './DetailParts';
import { TalentSection, type TalentBranchView } from './TalentSection';
import sections from './Sections.module.css';

export type CreepDetailProps = {
  creep: CreepCardViewModel;
  faction: FactionThemeName;
  nameId: string;
};

function toTalentBranches(creep: CreepCardViewModel): TalentBranchView[] {
  return creep.talentBranches.map((branch) => ({
    ...branch,
    grades: branch.grades.map((grade) => ({ ...grade, cost: null })),
  }));
}

/** Send cost, kill reward, income bonus and the per-wave cap of one creature type. */
function EconomyRow({ creep }: { creep: CreepCardViewModel }) {
  const { economy } = creep;
  return (
    <dl className={sections.economy} aria-label="Economy">
      <div className={sections.economyCell} title="Gold to send one">
        <dt className={sections.economyLabel}>Send</dt>
        <dd className={sections.economyValue}>
          <CodexIcon name="gold" />
          {economy.sendCost}
        </dd>
      </div>
      <div className={sections.economyCell} title="Gold for killing one">
        <dt className={sections.economyLabel}>Kill</dt>
        <dd className={sections.economyValue}>
          <CodexIcon name="gold" />
          {`+${creep.rewardGold}`}
        </dd>
      </div>
      <div className={sections.economyCell} title="Income bonus per send">
        <dt className={sections.economyLabel}>Income</dt>
        <dd className={`${sections.economyValue} ${codex.good}`}>
          <CodexIcon name="income" />
          {`+${economy.incomeBonus}`}
        </dd>
      </div>
      <div className={sections.economyCell} title="Most of this creature per wave">
        <dt className={sections.economyLabel}>Cap</dt>
        <dd className={sections.economyValue}>
          {economy.perWaveCap}
          <span className={sections.economyUnit}>/wave</span>
        </dd>
      </div>
    </dl>
  );
}

/** Everything about one creature: body, economy, abilities, talents and lore. */
export function CreepDetail({ creep, faction, nameId }: CreepDetailProps) {
  return (
    <>
      <DetailHeader
        nameId={nameId}
        name={creep.name}
        portrait={
          <Portrait size="large">
            <UnitIcon unitId={creep.id} label={creep.name} faction={faction} />
          </Portrait>
        }
        tags={[
          { key: 'tier', label: `T${creep.tier}`, tone: 'tier' },
          { key: 'traits', label: creep.traitsLabel },
          { key: 'unlock', label: `Wave ${creep.economy.unlockWave}+`, tone: 'race' },
        ]}
      />
      <StatChips stats={creep.bodyStats} size="large" label="Base stats" />
      <EconomyRow creep={creep} />
      <SpecialLines label="Abilities" lines={creep.abilities === null ? [] : [creep.abilities]} />
      {creep.talentBranches.length > 0 && (
        <TalentSection
          idPrefix={`codex-${creep.id}`}
          meta="Pick one per match"
          branches={toTalentBranches(creep)}
        />
      )}
      <LoreFold description={creep.description} lore={creep.lore} />
    </>
  );
}
