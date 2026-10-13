import { describe, expect, it } from 'vitest';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { RaceId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { createInitialDuelMatchState, type DuelMatchState } from '../../duel-match';
import { getSendCapPerWave, getUnitTypeSendCapByTier } from '../../duel-match/model/sendLimits';
import { resolveUnitConfigById } from '../../unit/model/registry';
import type { UnitId } from '../../unit/model/types';
import { applyComputerBuildStrategy } from './applyComputerBuildStrategy';
import { buildDecisionContext } from './buildDecisionContext';
import { planSendCreeps } from './planSendCreeps';
import type { DefenceAssessment } from './threat-budget';
import type { DecisionContext } from './types';

const WAVE_HEALTH = 2_000;

function defenceAtMargin(margin: number): DefenceAssessment {
  return { incomingHealth: WAVE_HEALTH, waveDamage: WAVE_HEALTH * margin, damagePerGold: 3 };
}

function createMatch(gold: number): DuelMatchState {
  const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC, generateEdgeEndpoints(2));
  return { ...state, round: 8, opponent: { ...state.opponent, gold } };
}

function contextFor(
  state: DuelMatchState,
  difficulty: Difficulty,
  defence?: DefenceAssessment,
): DecisionContext {
  const context = buildDecisionContext({ matchState: state, difficulty, leakHistory: [] });
  return defence ? { ...context, defence } : context;
}

function sendGold(context: DecisionContext): number {
  return planSendCreeps({ context }).totalCost;
}

function buildGold(state: DuelMatchState, context: DecisionContext): number {
  return applyComputerBuildStrategy({ state, context }).spentGold;
}

describe('entities/computer-opponent threat-based budget split', () => {
  it('assesses the next wave against its towers when building the context', () => {
    const state = createMatch(400);
    const quiet = contextFor(state, Difficulty.HARD);
    const threatened = contextFor(
      {
        ...state,
        player: { ...state.player, sendQueue: ['undead_crypt_fiend', 'undead_crypt_fiend'] },
      },
      Difficulty.HARD,
    );

    expect(quiet.defence?.incomingHealth).toBeGreaterThan(0);
    expect(quiet.defence?.waveDamage).toBe(0);
    expect(threatened.defence?.incomingHealth).toBeGreaterThan(quiet.defence?.incomingHealth ?? 0);
  });

  it('sends more when its defence is comfortable than when it is threatened', () => {
    const state = createMatch(600);
    const comfortable = sendGold(contextFor(state, Difficulty.NORMAL, defenceAtMargin(3)));
    const threatened = sendGold(contextFor(state, Difficulty.NORMAL, defenceAtMargin(0.3)));

    expect(comfortable).toBeGreaterThan(threatened);
  });

  it('builds more when threatened than when its defence is comfortable', () => {
    const state = createMatch(600);
    const threatened = buildGold(state, contextFor(state, Difficulty.HARD, defenceAtMargin(0.3)));
    const comfortable = buildGold(state, contextFor(state, Difficulty.HARD, defenceAtMargin(3)));

    expect(threatened).toBeGreaterThan(comfortable);
  });

  it('explains the split in its reasoning', () => {
    const state = createMatch(600);
    const result = planSendCreeps({
      context: contextFor(state, Difficulty.NORMAL, defenceAtMargin(3)),
    });

    expect(result.reasoning).toContain('defence margin 3.00');
  });

  it.each([Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD, Difficulty.NIGHTMARE])(
    'never sends past the shared limits however comfortable it is on %s',
    (difficulty) => {
      const queued: UnitId[] = ['orc_grunt', 'orc_grunt'];
      const state = createMatch(1_000_000);
      const context = {
        ...contextFor(state, difficulty, defenceAtMargin(50)),
        queuedSends: queued,
      };
      const result = planSendCreeps({ context });
      const all = [...queued, ...result.actions.map((action) => action.creepTypeId)];

      expect(all.length).toBeLessThanOrEqual(getSendCapPerWave());
      for (const unitId of new Set(all)) {
        const count = all.filter((id) => id === unitId).length;
        expect(count).toBeLessThanOrEqual(
          getUnitTypeSendCapByTier(resolveUnitConfigById(unitId).tier),
        );
      }
    },
  );

  it('decides the same way every time', () => {
    const state = createMatch(500);
    const context = contextFor(state, Difficulty.HARD);

    expect(planSendCreeps({ context })).toEqual(planSendCreeps({ context }));
    expect(contextFor(state, Difficulty.HARD).defence).toEqual(context.defence);
  });
});
