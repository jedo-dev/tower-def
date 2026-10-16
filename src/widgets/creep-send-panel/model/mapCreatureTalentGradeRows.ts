import type {
  CreatureAbilities,
  CreatureGradeStats,
  CreatureTalentBranchDefinition,
} from '../../../entities/unit';

/**
 * One row of a creature branch card's grade table: what grade 1-4 of the
 * branch changes against the authored (grade 0) creature.
 */
export type CreatureGradeRow = {
  grade: number;
  healthDelta: string;
  speedDelta: string;
  physicalArmorDelta: string;
  magicalArmorDelta: string;
  /** The grade's abilities on one line; `—` without any. */
  special: string;
};

/** Shown for an unchanged stat and for a grade with nothing special. */
export const NO_CHANGE_MARK = '—';
const SPECIAL_SEPARATOR = ' · ';
const STAT_EPSILON = 1e-6;
const MILLISECONDS_PER_SECOND = 1000;

function formatDelta(difference: number, fractionDigits: number): string {
  if (Math.abs(difference) < STAT_EPSILON) {
    return NO_CHANGE_MARK;
  }
  const sign = difference > 0 ? '+' : '-';
  return `${sign}${Number(Math.abs(difference).toFixed(fractionDigits))}`;
}

function formatMultiplier(multiplier: number): string {
  return `x${Number(multiplier.toFixed(2))}`;
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function formatSeconds(milliseconds: number): string {
  return `${Number((milliseconds / MILLISECONDS_PER_SECOND).toFixed(1))}s`;
}

/** 2nd, 3rd, 4th, 11th, 22nd. */
export function formatOrdinal(value: number): string {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${value}th`;
  }
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th';
  return `${value}${suffix}`;
}

function toLabel(key: string): string {
  return key.replace(/_/g, ' ');
}

function describeResistances(abilities: CreatureAbilities): string[] {
  return Object.entries(abilities.effectResistance ?? {}).flatMap(([effect, multiplier]) => {
    if (multiplier === undefined) {
      return [];
    }
    return multiplier === 0
      ? [`Immune to ${toLabel(effect)}`]
      : [`${toLabel(effect)} ${formatMultiplier(multiplier)}`];
  });
}

function describeIncomingDamage(abilities: CreatureAbilities): string[] {
  return Object.entries(abilities.incomingDamageMultipliers ?? {}).flatMap(([shape, multiplier]) =>
    multiplier === undefined ? [] : [`${shape} damage ${formatMultiplier(multiplier)}`],
  );
}

function describeSurvival(abilities: CreatureAbilities): string[] {
  const phrases: string[] = [];
  if (abilities.dodgeEveryNthShot !== undefined) {
    phrases.push(`Dodges every ${formatOrdinal(abilities.dodgeEveryNthShot)} shot`);
  }
  if (abilities.healthRegenPerSecond !== undefined) {
    const pause = abilities.regenPausedByPoison ? ' unless poisoned' : '';
    phrases.push(`Regen ${abilities.healthRegenPerSecond}/s${pause}`);
  }
  if (abilities.shieldHp !== undefined) {
    const recharge =
      abilities.shieldRechargeMs === undefined
        ? ''
        : `, refills after ${formatSeconds(abilities.shieldRechargeMs)}`;
    phrases.push(`Shield ${abilities.shieldHp}${recharge}`);
  }
  if (abilities.secondLife !== undefined) {
    const { hpShare, speedMultiplier, immuneToChill } = abilities.secondLife;
    const speed =
      speedMultiplier === undefined ? '' : ` ${formatMultiplier(speedMultiplier)} speed`;
    const chill = immuneToChill ? ', chill-immune' : '';
    phrases.push(`Second life at ${formatPercent(hpShare)}${speed}${chill}`);
  }
  if (abilities.startInvisibleMs !== undefined) {
    phrases.push(`Invisible ${formatSeconds(abilities.startInvisibleMs)}`);
  }
  return phrases;
}

function describeMovement(abilities: CreatureAbilities): string[] {
  const phrases: string[] = [];
  if (abilities.speedBoostBelowHpShare !== undefined) {
    const { hpShare, speedMultiplier } = abilities.speedBoostBelowHpShare;
    phrases.push(`${formatMultiplier(speedMultiplier)} speed below ${formatPercent(hpShare)} HP`);
  }
  if (abilities.speedBoostLastRouteShare !== undefined) {
    const { routeShare, speedMultiplier } = abilities.speedBoostLastRouteShare;
    phrases.push(
      `${formatMultiplier(speedMultiplier)} speed on last ${formatPercent(routeShare)} of route`,
    );
  }
  return phrases;
}

function describeEconomy(abilities: CreatureAbilities): string[] {
  const phrases: string[] = [];
  if (abilities.leakLivesTaken !== undefined) {
    phrases.push(`Leak takes ${abilities.leakLivesTaken} lives`);
  }
  if (abilities.leakGoldToSender !== undefined) {
    phrases.push(`Leak +${abilities.leakGoldToSender} gold`);
  }
  if (abilities.killGoldPenaltyToDefender !== undefined) {
    phrases.push(`Kill costs defender ${abilities.killGoldPenaltyToDefender} gold`);
  }
  if (abilities.freeNthSend !== undefined) {
    phrases.push(`Every ${formatOrdinal(abilities.freeNthSend)} send free`);
  }
  return phrases;
}

/** Every ability a creature grade carries, in a fixed order, as short phrases. */
export function describeCreatureAbilities(abilities: CreatureAbilities | undefined): string[] {
  if (abilities === undefined) {
    return [];
  }
  return [
    ...describeResistances(abilities),
    ...describeIncomingDamage(abilities),
    ...describeSurvival(abilities),
    ...describeMovement(abilities),
    ...describeEconomy(abilities),
  ];
}

/** The one-line "special" of a grade: its abilities, or `—` without any. */
export function describeCreatureGradeSpecial(abilities: CreatureAbilities | undefined): string {
  const phrases = describeCreatureAbilities(abilities);
  return phrases.length === 0 ? NO_CHANGE_MARK : phrases.join(SPECIAL_SEPARATOR);
}

export function mapCreatureTalentGradeRows(
  base: CreatureGradeStats,
  branch: Pick<CreatureTalentBranchDefinition, 'grades'>,
): CreatureGradeRow[] {
  return branch.grades.map((grade) => ({
    grade: grade.level,
    healthDelta: formatDelta(grade.health - base.health, 0),
    speedDelta: formatDelta(grade.speed - base.speed, 2),
    physicalArmorDelta: formatDelta(grade.physicalArmor - base.physicalArmor, 0),
    magicalArmorDelta: formatDelta(grade.magicalArmor - base.magicalArmor, 0),
    special: describeCreatureGradeSpecial(grade.abilities),
  }));
}
