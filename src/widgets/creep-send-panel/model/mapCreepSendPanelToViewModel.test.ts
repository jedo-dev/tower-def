import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { Difficulty } from '../../../entities/difficulty';
import { resolveUnitConfigById, UnitTier } from '../../../entities/unit';
import { getSendCostByTier } from '../../../entities/duel-match';
import { getRaceRegistry } from '../../../entities/race-registry';
import { getCreatureSendUnlockWave } from '../../../shared/constants/creatureSendUnlock';
import { mapCreepSendPanelToViewModel } from './mapCreepSendPanelToViewModel';

const SKELETON_BRANCH_B = resolveUnitConfigById('undead_skeleton').talentBranches[1];

function createSnapshot(overrides: Partial<GameHudSnapshot> = {}): GameHudSnapshot {
  return {
    gold: 100,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: {
      status: 'active',
      winner: null,
      reason: null,
    },
    builderFactionName: 'Undead',
    waveNumber: 1,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'orc',
    autoStartSecondsLeft: null,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    isPaused: false,
    gameSpeed: 1,
    towerBranchChoices: {},
    creatureXpByTier: {},
    creatureBranchChoices: {},
    creatureGrades: {},
    ...overrides,
  };
}

function createSetup(builderFaction: RaceId): GameSetupConfig {
  return {
    builderFaction,
    enemyFaction: RaceId.ORC,
    difficulty: Difficulty.NORMAL,
  };
}

describe('mapCreepSendPanelToViewModel', () => {
  it('lists race-specific sendable creeps with cost and income gain', () => {
    const viewModel = mapCreepSendPanelToViewModel(createSnapshot(), createSetup(RaceId.UNDEAD));

    expect(viewModel.raceName).toBe('Undead');
    expect(viewModel.buttons.map((button) => button.creepTypeId)).toEqual(
      getRaceRegistry(RaceId.UNDEAD).sendableCreepIds,
    );
    expect(viewModel.buttons).toHaveLength(8);
    expect(viewModel.buttons[0]).toMatchObject({
      name: 'Skeleton',
      tier: 1,
      cost: 50,
      incomeGain: 10,
      isAffordable: true,
      isDisabled: false,
      disabledReason: null,
      ariaLabel: 'Send Skeleton for 50 gold and gain 10 income. No branch. 0 of 6 XP',
    });
  });

  it('marks unaffordable creep sends disabled', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({ gold: 40 }),
      createSetup(RaceId.UNDEAD),
    );

    expect(viewModel.buttons[0].isAffordable).toBe(false);
    expect(viewModel.buttons[0].isDisabled).toBe(true);
    expect(viewModel.buttons[0].disabledReason).toBe('requires 50 gold');
    expect(viewModel.buttons[0].ariaLabel).toBe(
      'Cannot send Skeleton: requires 50 gold. No branch. 0 of 6 XP',
    );
  });

  it('disables send buttons during active battle phase', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({ phase: 'wave', gold: 500 }),
      createSetup(RaceId.ORC),
    );

    expect(viewModel.isBattleActive).toBe(true);
    expect(viewModel.buttons.every((button) => button.isDisabled)).toBe(true);
    expect(viewModel.buttons[0].disabledReason).toBe('locked in battle');
    expect(viewModel.buttons[0].ariaLabel).toBe(
      'Cannot send Grunt: locked in battle. No branch. 0 of 6 XP',
    );
  });

  it('summarizes queued player sends from the event-driven snapshot', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({
        playerSendQueue: [
          { creepTypeId: 'undead_skeleton', index: 0 },
          { creepTypeId: 'undead_ghoul', index: 1 },
        ],
      }),
      createSetup(RaceId.UNDEAD),
    );

    expect(viewModel.queueCount).toBe(2);
    expect(viewModel.queueSummary).toBe('2 queued');
  });

  it('shows send limits and prefers the cap reason over the gold reason', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({ gold: 0 }),
      createSetup(RaceId.UNDEAD),
      {
        owner: 'player',
        waveSendCap: 12,
        waveSendsRemaining: 4,
        units: [
          {
            creepTypeId: 'undead_skeleton',
            cap: 6,
            remaining: 0,
            availableBranches: [],
            branchCostXp: 4,
            grade: 0,
            nextUpgradeCostXp: 6,
          },
        ],
      },
    );

    expect(viewModel.waveCapacitySummary).toBe('4/12 left');
    expect(viewModel.buttons[0]).toMatchObject({
      remainingOfType: 0,
      typeCap: 6,
      isAtSendLimit: true,
      isDisabled: true,
      disabledReason: 'send limit reached',
    });
    expect(viewModel.buttons[1].disabledReason).toMatch(/^requires \d+ gold$/);
  });

  it('leaves counters empty before the scene publishes limits', () => {
    const viewModel = mapCreepSendPanelToViewModel(createSnapshot(), createSetup(RaceId.UNDEAD));

    expect(viewModel.waveCapacitySummary).toBeNull();
    expect(viewModel.buttons[0].remainingOfType).toBeNull();
  });

  it('uses undead registry as a safe fallback before setup is available', () => {
    const viewModel = mapCreepSendPanelToViewModel(createSnapshot(), null);

    expect(viewModel.raceName).toBe('Undead');
    expect(viewModel.buttons[0].creepTypeId).toBe('undead_skeleton');
  });

  it('names the branch, grade and tier experience on the send chip', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({
        creatureXpByTier: { 1: 7, 2: 3 },
        creatureBranchChoices: { undead_skeleton: SKELETON_BRANCH_B.id },
        creatureGrades: { undead_skeleton: 2 },
      }),
      createSetup(RaceId.UNDEAD),
    );
    const [skeleton, ghoul] = viewModel.buttons;

    const talent = `Grade 2 of 4, ${SKELETON_BRANCH_B.name}. 7 of 10 XP`;
    expect(skeleton.ariaLabel).toContain(talent);
    expect(skeleton.tooltip).toBe(`Skeleton: ${talent}`);
    expect(ghoul.tooltip).toBe('Ghoul: No branch. 7 of 6 XP');
    expect(viewModel.hasAffordableTalent).toBe(true);
    expect(viewModel.xpByTier).toEqual([
      { tier: 1, xp: 7, label: 'T1 7 XP', ariaLabel: 'Tier 1: 7 XP' },
      { tier: 2, xp: 3, label: 'T2 3 XP', ariaLabel: 'Tier 2: 3 XP' },
      { tier: 3, xp: 0, label: 'T3 0 XP', ariaLabel: 'Tier 3: 0 XP' },
      { tier: 4, xp: 0, label: 'T4 0 XP', ariaLabel: 'Tier 4: 0 XP' },
      { tier: 5, xp: 0, label: 'T5 0 XP', ariaLabel: 'Tier 5: 0 XP' },
      { tier: 6, xp: 0, label: 'T6 0 XP', ariaLabel: 'Tier 6: 0 XP' },
    ]);
  });

  it('locks a tier before its unlock wave and keeps its price for planning', () => {
    const viewModel = mapCreepSendPanelToViewModel(
      createSnapshot({ gold: 10_000 }),
      createSetup(RaceId.UNDEAD),
    );
    const wyrm = viewModel.buttons.find((button) => button.creepTypeId === 'undead_frost_wyrm');
    const unlockWave = getCreatureSendUnlockWave(6);

    expect(wyrm).toMatchObject({
      isLocked: true,
      unlockWave,
      isDisabled: true,
      disabledReason: `from wave ${unlockWave}`,
      cost: getSendCostByTier(UnitTier.TIER_6),
    });
    expect(wyrm?.ariaLabel).toMatch(
      new RegExp(`^Frost Wyrm locked: sendable from wave ${unlockWave}, costs \\d+ gold`),
    );
    // Wave 1: every unlocked tier is sendable, every locked one waits for its wave.
    for (const button of viewModel.buttons) {
      expect(button.isLocked).toBe(button.unlockWave > 1);
    }
  });

  it('unlocks a tier in the build phase before its wave, and mid-wave for the next one', () => {
    const unlockWave = getCreatureSendUnlockWave(5);
    const isNecromancerLocked = (overrides: Partial<GameHudSnapshot>) =>
      mapCreepSendPanelToViewModel(
        createSnapshot({ gold: 10_000, ...overrides }),
        createSetup(RaceId.UNDEAD),
      ).buttons.find((button) => button.creepTypeId === 'undead_necromancer')?.isLocked;

    expect(isNecromancerLocked({ waveNumber: unlockWave - 1 })).toBe(true);
    expect(isNecromancerLocked({ waveNumber: unlockWave })).toBe(false);
    // Wave `unlockWave - 1` running: a send queued after it joins the unlock wave.
    expect(isNecromancerLocked({ waveNumber: unlockWave - 1, phase: 'wave' })).toBe(false);
  });

  it('has nothing affordable to develop without experience', () => {
    const viewModel = mapCreepSendPanelToViewModel(createSnapshot(), createSetup(RaceId.UNDEAD));

    expect(viewModel.hasAffordableTalent).toBe(false);
  });
});
