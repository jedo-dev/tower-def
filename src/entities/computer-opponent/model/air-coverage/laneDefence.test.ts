import { describe, expect, it } from 'vitest';
import { calculateAirRoute } from '../../../../shared/lib/pathfinding/airRoute';
import {
  DamageType,
  RaceId,
  TowerTargetScope,
  TowerTypeId,
  UnitMoveType,
} from '../../../../shared/types/content-ids';
import type { GridPoint } from '../../../../shared/types/grid';
import { createInitialDuelMatchState } from '../../../duel-match';
import { getUnitsByFaction, resolveUnitConfigById } from '../../../unit/model/registry';
import { WAVE_TIER_UNLOCK_WAVE } from '../../../wave/model/waveBalance';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../../tower/model/types';
import type { LedgerTower } from '../damage-placement';
import { estimateIncomingThreat } from '../threat-budget/estimateIncomingThreat';
import { AirCoverageReading, computeAirSurvivalFactor } from './airSurvivalFactor';
import { computeDefenderLaneProfile } from './laneDefence';

const GRID = createInitialDuelMatchState(RaceId.ELF, RaceId.UNDEAD).player.battlefield.grid;
const AIR_LINE = calculateAirRoute(GRID.entrance, GRID.exit);
const THREAT = estimateIncomingThreat({
  waveNumber: WAVE_TIER_UNLOCK_WAVE[resolveUnitConfigById('undead_gargoyle').tier] + 4,
  baselineFactionUnits: getUnitsByFaction(RaceId.UNDEAD),
  observedSends: [],
  expectedSendGold: 0,
  enemySendables: [],
});

/** Anchors beside the air line, `count` of them spread along it. */
function besideAirLine(count: number): GridPoint[] {
  const step = Math.floor(AIR_LINE.length / (count + 1));
  return Array.from({ length: count }, (_, index) => {
    const point = AIR_LINE[step * (index + 1)];
    return { x: point.x + 2, y: point.y };
  });
}

function tower(
  anchor: GridPoint,
  allowedTargets: TowerTargetScope,
  extra: Partial<Pick<LedgerTower, 'damageType'>> & {
    stats?: Partial<LedgerTower['stats']>;
  } = {},
): LedgerTower {
  return {
    anchor,
    towerType: TowerTypeId.SINGLE,
    allowedTargets,
    ...(extra.damageType === undefined ? {} : { damageType: extra.damageType }),
    stats: { ...TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.SINGLE], ...extra.stats },
  };
}

function profile(towers: readonly LedgerTower[]) {
  return computeDefenderLaneProfile(GRID, towers, THREAT);
}

describe('entities/computer-opponent air coverage: defender lanes', () => {
  it('sees no anti-air when every tower shoots the ground only', () => {
    const lanes = profile(besideAirLine(4).map((at) => tower(at, TowerTargetScope.GROUND)));
    expect(lanes[UnitMoveType.GROUND].waveDamage).toBeGreaterThan(0);
    expect(lanes[UnitMoveType.AIR].waveDamage).toBe(0);
    expect(computeAirSurvivalFactor(lanes, AirCoverageReading.FULL)).toBe(2.5);
  });

  it('sees dense anti-air when the air line is lined with towers that shoot air', () => {
    const groundOnly = besideAirLine(2).map((at) => tower(at, TowerTargetScope.GROUND));
    const antiAir = besideAirLine(6).map((at) =>
      tower({ ...at, x: at.x - 4 }, TowerTargetScope.AIR),
    );
    const lanes = profile([...groundOnly, ...antiAir]);
    expect(computeAirSurvivalFactor(lanes, AirCoverageReading.FULL)).toBeLessThan(1);
  });

  it('counts a grade that opens air targets, and the air damage bonus', () => {
    const anchors = besideAirLine(3);
    const groundOnly = profile(anchors.map((at) => tower(at, TowerTargetScope.GROUND)));
    const graded = profile(
      anchors.map((at) =>
        tower(at, TowerTargetScope.GROUND, { stats: { allowedTargets: TowerTargetScope.BOTH } }),
      ),
    );
    const archers = profile(
      anchors.map((at) =>
        tower(at, TowerTargetScope.GROUND, {
          stats: {
            allowedTargets: TowerTargetScope.BOTH,
            abilities: { airDamageMultiplier: 1.5 },
          },
        }),
      ),
    );
    expect(groundOnly[UnitMoveType.AIR].waveDamage).toBe(0);
    expect(graded[UnitMoveType.AIR].waveDamage).toBeGreaterThan(0);
    expect(archers[UnitMoveType.AIR].waveDamage).toBeCloseTo(
      graded[UnitMoveType.AIR].waveDamage * 1.5,
    );
    expect(archers[UnitMoveType.GROUND].waveDamage).toBeCloseTo(
      graded[UnitMoveType.GROUND].waveDamage,
    );
  });

  it('reads each lane its own damage types', () => {
    const anchors = besideAirLine(4);
    const lanes = profile([
      tower(anchors[0], TowerTargetScope.GROUND, { damageType: DamageType.PHYSICAL }),
      tower(anchors[1], TowerTargetScope.GROUND, { damageType: DamageType.PHYSICAL }),
      tower(anchors[2], TowerTargetScope.AIR, { damageType: DamageType.MAGICAL }),
    ]);
    expect(lanes[UnitMoveType.GROUND].damageMix[DamageType.PHYSICAL]).toBe(1);
    expect(lanes[UnitMoveType.AIR].damageMix[DamageType.MAGICAL]).toBe(1);
  });

  it('splits the next wave by its expected flier share', () => {
    const lanes = profile([]);
    const total =
      lanes[UnitMoveType.GROUND].incomingHealth + lanes[UnitMoveType.AIR].incomingHealth;
    expect(total).toBeCloseTo(THREAT.totalHealth);
    expect(lanes[UnitMoveType.AIR].incomingHealth).toBeCloseTo(
      THREAT.totalHealth * THREAT.expectedAirHealthShare,
    );
    expect(lanes.marginalSendHealth).toBeCloseTo(THREAT.totalHealth / THREAT.creepCount);
  });
});
