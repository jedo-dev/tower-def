import { describe, expect, it } from 'vitest';
import { calculateAirRoute } from '../../../shared/lib/pathfinding/airRoute';
import { RaceId, UnitMoveType } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { createInitialDuelMatchState, getSendUnlockWave } from '../../duel-match';
import { UnitTier } from '../../unit/model/types';
import { getUnitsByFaction, resolveUnitConfigById } from '../../unit/model/registry';
import { computeExpectedWaveHealth } from '../../wave/model/expectedWaveHealth';
import { WAVE_TIER_UNLOCK_WAVE } from '../../wave/model/waveBalance';
import {
  ledgerTower,
  SPLASH_TYPE,
  STRAIGHT_ANCHOR,
  U_TURN_ROUTE,
  WALL_TYPE,
} from './damage-placement/damagePlacementFixtures';
import { createDualRouteLedger } from './damage-placement/dualRouteLedger';
import { createRouteDamageLedger } from './damage-placement/routeDamageLedger';
import { createRouteGeometry } from './damage-placement/routeGeometry';
import { assessDefence } from './threat-budget/assessDefence';
import { THREAT_BUDGET_TUNING_BY_DIFFICULTY } from './threat-budget/constants';
import { estimateIncomingThreat } from './threat-budget/estimateIncomingThreat';
import {
  computeAirThreatShare,
  computeDefenceMargin,
  splitThreatBudget,
  type DefenceAssessment,
  type ThreatBudgetInput,
} from './threat-budget/splitThreatBudget';

const GARGOYLE_WAVE = WAVE_TIER_UNLOCK_WAVE[resolveUnitConfigById('undead_gargoyle').tier];
const UNDEAD_ROSTER = getUnitsByFaction(RaceId.UNDEAD);
const ORC_ROSTER = getUnitsByFaction(RaceId.ORC);
const SENDABLES = ['undead_skeleton', 'undead_gargoyle'] as const;

function threatAt(waveNumber: number, roster = UNDEAD_ROSTER) {
  return estimateIncomingThreat({
    waveNumber,
    baselineFactionUnits: roster,
    observedSends: [],
    expectedSendGold: 0,
    enemySendables: SENDABLES.map((id) => resolveUnitConfigById(id)),
  });
}

describe('entities/computer-opponent air lane: incoming threat', () => {
  it('counts no air before the first flier unlocks', () => {
    const threat = threatAt(1);
    expect(threat.airCreepCount).toBe(0);
    expect(threat.airHealth).toBe(0);
  });

  it('splits the wave into a ground and an air part once fliers are drawn', () => {
    const threat = threatAt(GARGOYLE_WAVE + 5);
    expect(threat.airCreepCount).toBeGreaterThan(0);
    expect(threat.airHealth).toBeGreaterThan(0);
    expect(threat.airHealth).toBeLessThan(threat.totalHealth);
    expect(threat.airCreepCount).toBeLessThan(threat.creepCount);
  });

  it('counts queued fliers by their move type, never by id', () => {
    const gargoyle = resolveUnitConfigById('undead_gargoyle');
    const threat = estimateIncomingThreat({
      waveNumber: 1,
      baselineFactionUnits: ORC_ROSTER,
      observedSends: [gargoyle, { ...gargoyle, moveType: UnitMoveType.GROUND }],
      expectedSendGold: 0,
      enemySendables: [],
    });
    expect(threat.airCreepCount).toBe(1);
    expect(threat.airAverageSpeed).toBe(gargoyle.speed);
  });
});

describe('entities/computer-opponent air lane: expected flier share', () => {
  it('expects no fliers before the first one unlocks', () => {
    expect(threatAt(1).expectedAirHealthShare).toBe(0);
  });

  it('reads the baseline over every roll, not off the one typical draw', () => {
    for (let waveNumber = GARGOYLE_WAVE; waveNumber <= GARGOYLE_WAVE + 12; waveNumber += 1) {
      const expected = computeExpectedWaveHealth(waveNumber, UNDEAD_ROSTER);
      expect(threatAt(waveNumber).expectedAirHealthShare, `wave ${waveNumber}`).toBeCloseTo(
        expected.airHealth / expected.totalHealth,
        10,
      );
      expect(threatAt(waveNumber).expectedAirHealthShare).toBeGreaterThan(0);
    }
  });

  it('adds the fliers the other side has queued', () => {
    const gargoyle = resolveUnitConfigById('undead_gargoyle');
    const quiet = estimateIncomingThreat({
      waveNumber: GARGOYLE_WAVE,
      baselineFactionUnits: ORC_ROSTER,
      observedSends: [],
      expectedSendGold: 0,
      enemySendables: [],
    });
    const sent = estimateIncomingThreat({
      waveNumber: GARGOYLE_WAVE,
      baselineFactionUnits: ORC_ROSTER,
      observedSends: [gargoyle, gargoyle],
      expectedSendGold: 0,
      enemySendables: [],
    });
    expect(quiet.expectedAirHealthShare).toBe(0);
    expect(sent.expectedAirHealthShare).toBeGreaterThan(0);
    expect(sent.expectedAirHealthShare).toBeLessThan(1);
  });
});

describe('entities/computer-opponent air lane: damage ledgers', () => {
  const geometry = createRouteGeometry(U_TURN_ROUTE);

  it('gives a ground-only tower no damage on the air lane and full damage on the ground lane', () => {
    const splash = ledgerTower(STRAIGHT_ANCHOR, SPLASH_TYPE);
    expect(createRouteDamageLedger(geometry, [], UnitMoveType.AIR).contributionOf(splash)).toBe(0);
    expect(createRouteDamageLedger(geometry).contributionOf(splash)).toBeGreaterThan(0);
  });

  it('values a both-scope tower on both lanes', () => {
    const archer = ledgerTower(STRAIGHT_ANCHOR, WALL_TYPE);
    const ground = createRouteDamageLedger(geometry).contributionOf(archer);
    const air = createRouteDamageLedger(geometry, [], UnitMoveType.AIR).contributionOf(archer);
    expect(air).toBeCloseTo(ground);
  });

  it('weighs the two lanes by the air share and keeps both ledgers in step', () => {
    const airRoute = calculateAirRoute({ x: 0, y: 2 }, { x: 0, y: 28 });
    const ground = createRouteDamageLedger(geometry);
    const air = createRouteDamageLedger(createRouteGeometry(airRoute), [], UnitMoveType.AIR);
    const dual = createDualRouteLedger(ground, air, 0.25);
    const archer = ledgerTower(STRAIGHT_ANCHOR, WALL_TYPE);
    const splash = ledgerTower(STRAIGHT_ANCHOR, SPLASH_TYPE);

    expect(dual.contributionOf(archer)).toBeCloseTo(
      0.75 * ground.contributionOf(archer) + 0.25 * air.contributionOf(archer),
    );
    expect(dual.contributionOf(splash)).toBeCloseTo(0.75 * ground.contributionOf(splash));

    const index = dual.add(archer);
    expect(ground.towers).toHaveLength(1);
    expect(air.towers).toHaveLength(1);
    dual.replace(index, splash);
    expect(ground.towers[0]).toBe(splash);
    expect(air.towers[0]).toBe(splash);
    expect(dual.averageSampleDps()).toBeCloseTo(0.75 * ground.averageSampleDps());
  });
});

describe('entities/computer-opponent air lane: threat split', () => {
  const TUNING = THREAT_BUDGET_TUNING_BY_DIFFICULTY[Difficulty.HARD];

  function input(assessment: DefenceAssessment): ThreatBudgetInput {
    return {
      gold: 400,
      assessment,
      tuning: TUNING,
      maxSendShare: 0.5,
      maxBuildBudget: 300,
      livesShare: 1,
      cheapestSendCost: 50,
    };
  }

  it('is threatened by an unanswered air lane even when the maze holds the ground', () => {
    const comfortable = { incomingHealth: 1000, waveDamage: 4000, damagePerGold: 4 };
    const air = { incomingHealth: 500, waveDamage: 200, damagePerGold: 2 };

    expect(computeDefenceMargin(comfortable)).toBe(4);
    expect(computeDefenceMargin({ ...comfortable, air })).toBeCloseTo(0.4);
    // The maze holds the ground: every coverage tower belongs on the air line.
    expect(computeAirThreatShare({ ...comfortable, air }, TUNING.comfortableMargin)).toBe(1);
    // Neither lane short: fall back to the air part of the wave's health.
    const held = { incomingHealth: 500, waveDamage: 4000, damagePerGold: 2 };
    expect(
      computeAirThreatShare({ ...comfortable, air: held }, TUNING.comfortableMargin),
    ).toBeCloseTo(1 / 3);
    expect(computeAirThreatShare(comfortable, TUNING.comfortableMargin)).toBe(0);

    const calm = splitThreatBudget(input(comfortable));
    const flanked = splitThreatBudget(input({ ...comfortable, air }));
    expect(calm.comfort).toBe(1);
    expect(flanked.comfort).toBe(0);
    expect(flanked.defenceShortfallGold).toBe(
      Math.ceil((air.incomingHealth * TUNING.comfortableMargin - air.waveDamage) / 2),
    );
    expect(flanked.buildBudget).toBeGreaterThan(calm.buildBudget);
  });
});

describe('entities/computer-opponent air lane: defence assessment', () => {
  it('adds an air lane once the enemy roster fields fliers, and none without', () => {
    const undead = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const orc = createInitialDuelMatchState(RaceId.ORC, RaceId.ORC);
    const late = (state: typeof undead) => ({ ...state, round: GARGOYLE_WAVE + 5 });

    // Orc's first flier is tier 5: before its send unlock (and its baseline
    // wave) there is nothing to fly. Undead can send a gargoyle from the
    // build phase before its tier's send unlock wave (tower-def-qpb).
    const orcBeforeFliers = { ...orc, round: getSendUnlockWave(UnitTier.TIER_5) - 2 };
    const gargoyleSendRound = getSendUnlockWave(resolveUnitConfigById('undead_gargoyle').tier) - 1;
    expect(assessDefence(orcBeforeFliers).air).toBeUndefined();
    expect(assessDefence(undead).air).toBeUndefined();
    expect(assessDefence({ ...undead, round: gargoyleSendRound }).air).toBeDefined();

    const flanked = assessDefence(late(undead));
    expect(flanked.air).toBeDefined();
    expect(flanked.air?.incomingHealth).toBeGreaterThan(0);
    // No towers yet: no damage on either lane, but anti-air can be priced.
    expect(flanked.air?.waveDamage).toBe(0);
    expect(flanked.air?.damagePerGold).toBeGreaterThan(0);
    expect(flanked.expectedAirHealthShare).toBeGreaterThan(0);
    expect(assessDefence(orcBeforeFliers).expectedAirHealthShare).toBe(0);
  });
});
