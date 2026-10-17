import { describe, expect, it } from 'vitest';
import { resolveUnitConfigById } from '../../../unit/model/registry';
import { CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED } from '../damage-placement/constants';
import { valueCreatureBranch } from './branchValuation';
import { CREATURE_VALUATION as V } from './constants';
import { fullContext, PHYSICAL_SINGLE_FIELD } from './creatureDevelopmentFixtures';
import { computeCreatureValue, computeInvisibleExposureShare } from './creatureValue';
import type { CreatureGradeStats } from '../../../unit/model/content/creatureTalentContent';

const SPEED = 1;
const MS_PER_APPROACH = (V.INVISIBLE_APPROACH_CELLS / CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED) * 1000;

function invisibleFor(startInvisibleMs: number): CreatureGradeStats {
  return {
    health: 50,
    speed: SPEED,
    physicalArmor: 0,
    magicalArmor: 0,
    abilities: { startInvisibleMs },
  };
}

describe('computeInvisibleExposureShare', () => {
  it('is worth nothing while the window ends before the first tower reach', () => {
    expect(computeInvisibleExposureShare({ speed: SPEED }, {})).toBe(0);
    expect(
      computeInvisibleExposureShare({ speed: SPEED }, { startInvisibleMs: MS_PER_APPROACH }),
    ).toBe(0);
  });

  it('hides the cells walked unseen past the approach, as a share of the route in reach', () => {
    const extraCells = 11;
    const ms = MS_PER_APPROACH + (extraCells / CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED) * 1000;
    expect(computeInvisibleExposureShare({ speed: SPEED }, { startInvisibleMs: ms })).toBeCloseTo(
      extraCells / V.INVISIBLE_ROUTE_CELLS_IN_REACH,
    );
  });

  it('saturates at the cap however long the window', () => {
    expect(computeInvisibleExposureShare({ speed: SPEED }, { startInvisibleMs: 60_000 })).toBe(
      V.MAX_INVISIBLE_SHARE,
    );
    expect(computeInvisibleExposureShare({ speed: 3 }, { startInvisibleMs: 30_000 })).toBe(
      V.MAX_INVISIBLE_SHARE,
    );
  });
});

describe('creature value with start invisibility', () => {
  const context = fullContext(PHYSICAL_SINGLE_FIELD);
  const valueOf = (stats: CreatureGradeStats) =>
    computeCreatureValue({ ...context, stats, sendCost: 10 });

  it('values a window shorter than the approach like no invisibility', () => {
    expect(valueOf(invisibleFor(MS_PER_APPROACH / 2))).toBe(valueOf(invisibleFor(0)));
  });

  it('grows with the window and stays finite once it saturates', () => {
    const short = valueOf(invisibleFor(4000));
    const long = valueOf(invisibleFor(20_000));
    const saturated = valueOf(invisibleFor(60_000));
    expect(short).toBeGreaterThan(valueOf(invisibleFor(0)));
    expect(long).toBeGreaterThan(short);
    expect(saturated).toBeCloseTo(valueOf(invisibleFor(59_000)));
    expect(saturated).toBeCloseTo(valueOf(invisibleFor(0)) / (1 - V.MAX_INVISIBLE_SHARE));
  });

  it('keeps the Archer branches within reach of each other (Forest Shadow was 11-13x)', () => {
    const archer = resolveUnitConfigById('elf_archer');
    const [evasion, forestShadow] = archer.talentBranches.map((branch) =>
      valueCreatureBranch(archer, branch, context),
    );
    const ratio = forestShadow.score / evasion.score;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.5);
  });
});
