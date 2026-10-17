import { describe, expect, it } from 'vitest';
import { RaceId, UnitMoveType } from '../../../../shared/types/content-ids';
import { Difficulty } from '../../../difficulty/model/types';
import { resolveUnitConfigById } from '../../../unit/model/registry';
import type { UnitId } from '../../../unit/model/types';
import { EVEN_DAMAGE_MIX } from '../damage-profile';
import { planSendCreeps } from '../planSendCreeps';
import type { DecisionContext } from '../types';
import { AirCoverageReading, computeAirSurvivalFactor } from './airSurvivalFactor';
import type { DefenderLaneProfile } from './laneDefence';

const CHIMERA = 'elf_chimera';

/** Air and ground lanes: the wave mostly walks; only the towers' reach of the air line varies. */
function lanes(airWaveDamage: number): DefenderLaneProfile {
  return {
    [UnitMoveType.GROUND]: {
      waveDamage: 4000,
      incomingHealth: 3000,
      damageMix: EVEN_DAMAGE_MIX,
    },
    [UnitMoveType.AIR]: {
      waveDamage: airWaveDamage,
      incomingHealth: 600,
      damageMix: EVEN_DAMAGE_MIX,
    },
    marginalSendHealth: 150,
  };
}

/** No anti-air on the air line at all. */
const NO_ANTI_AIR = lanes(0);
/** Anti-air packed along the air line: it takes far more fire per hit point than the maze. */
const DENSE_ANTI_AIR = lanes(8000);
/** The air line exactly as loaded as the maze: (600 + 150) / 1000 = (3000 + 150) / 4200. */
const EVEN_COVERAGE: DefenderLaneProfile = {
  ...lanes(1000),
  [UnitMoveType.GROUND]: { waveDamage: 4200, incomingHealth: 3000, damageMix: EVEN_DAMAGE_MIX },
};

function context(overrides: Partial<DecisionContext>): DecisionContext {
  return {
    gold: 1200,
    income: 60,
    hp: 20,
    raceId: RaceId.ELF,
    difficulty: Difficulty.HARD,
    round: 12,
    phase: 'build',
    mazeCoverage: { totalWalkableCells: 150, occupiedCells: 40, towerCount: 10 },
    threat: { incomingCreepCount: 0, estimatedLeakCount: 0, threatLevel: 'low' },
    leakHistory: [],
    affordableTowers: [],
    upgradeableTowerIds: [],
    availableBuildPositions: [],
    enemy: { hp: 20, income: 60, towerCount: 10 },
    ...overrides,
  };
}

function sentIds(overrides: Partial<DecisionContext>): UnitId[] {
  return planSendCreeps({ context: context(overrides) }).actions.map(
    (action) => action.creepTypeId,
  );
}

function countFliers(ids: readonly UnitId[]): number {
  return ids.filter((id) => resolveUnitConfigById(id).moveType === UnitMoveType.AIR).length;
}

describe('entities/computer-opponent air coverage: survival factor', () => {
  it('rates an unguarded air line as weak as the bound allows', () => {
    expect(computeAirSurvivalFactor(NO_ANTI_AIR, AirCoverageReading.FULL)).toBe(2.5);
    expect(computeAirSurvivalFactor(NO_ANTI_AIR, AirCoverageReading.COARSE)).toBe(1.5);
  });

  it('rates dense anti-air below a walker', () => {
    expect(computeAirSurvivalFactor(DENSE_ANTI_AIR, AirCoverageReading.FULL)).toBeLessThan(0.5);
    expect(computeAirSurvivalFactor(DENSE_ANTI_AIR, AirCoverageReading.COARSE)).toBeCloseTo(
      1 / 1.5,
    );
  });

  it('leaves fliers as authored when both lanes are as loaded', () => {
    expect(computeAirSurvivalFactor(EVEN_COVERAGE, AirCoverageReading.FULL)).toBeCloseTo(1);
    expect(computeAirSurvivalFactor(EVEN_COVERAGE, AirCoverageReading.COARSE)).toBe(1);
  });

  it('reads nothing when ignored, unknown, or before the field shoots the ground', () => {
    expect(computeAirSurvivalFactor(NO_ANTI_AIR, AirCoverageReading.IGNORE)).toBe(1);
    expect(computeAirSurvivalFactor(undefined, AirCoverageReading.FULL)).toBe(1);
    const unbuilt = {
      ...NO_ANTI_AIR,
      [UnitMoveType.GROUND]: { ...NO_ANTI_AIR[UnitMoveType.GROUND], waveDamage: 0 },
    };
    expect(computeAirSurvivalFactor(unbuilt, AirCoverageReading.FULL)).toBe(1);
  });
});

describe('entities/computer-opponent air coverage: send choice', () => {
  it('sends fliers into a defender with no anti-air', () => {
    const ids = sentIds({ enemyLanes: NO_ANTI_AIR });
    expect(ids).toContain(CHIMERA);
    expect(countFliers(ids)).toBeGreaterThanOrEqual(countFliers(sentIds({})));
  });

  it('sends walkers into a defender with dense anti-air on the air lane', () => {
    // Blind to the air line, the elf buys Chimeras here.
    expect(countFliers(sentIds({}))).toBeGreaterThan(0);
    const ids = sentIds({ enemyLanes: DENSE_ANTI_AIR });
    expect(ids.length).toBeGreaterThan(0);
    expect(countFliers(ids)).toBe(0);
  });

  it('values fliers as authored against a defender that covers both lanes alike', () => {
    expect(sentIds({ enemyLanes: EVEN_COVERAGE })).toEqual(sentIds({}));
  });

  it('gates the reading by difficulty: easy ignores it, normal reads it coarsely', () => {
    for (const lanesRead of [NO_ANTI_AIR, DENSE_ANTI_AIR]) {
      expect(sentIds({ difficulty: Difficulty.EASY, enemyLanes: lanesRead })).toEqual(
        sentIds({ difficulty: Difficulty.EASY }),
      );
    }
    expect(sentIds({ difficulty: Difficulty.NORMAL, enemyLanes: NO_ANTI_AIR })).toContain(CHIMERA);
    expect(
      countFliers(sentIds({ difficulty: Difficulty.NORMAL, enemyLanes: DENSE_ANTI_AIR })),
    ).toBe(0);
  });

  it('is deterministic for the same field', () => {
    expect(sentIds({ enemyLanes: NO_ANTI_AIR })).toEqual(sentIds({ enemyLanes: NO_ANTI_AIR }));
  });
});
