import { describe, expect, it } from 'vitest';
import { UnitTier, type CreatureTalentBranchDefinition } from '../../../entities/unit';
import {
  formatCreatureBranchLockWarning,
  mapCreatureTalentState,
  type CreatureTalentSnapshot,
} from './mapCreatureTalentState';

function branch(id: string, name: string): CreatureTalentBranchDefinition {
  return {
    id,
    name,
    description: `${name} description`,
    grades: [1, 2, 3, 4].map((level) => ({
      level: level as 1 | 2 | 3 | 4,
      health: 100 + level * 10,
      speed: 1,
      physicalArmor: 2,
      magicalArmor: 2,
    })),
  };
}

/** A tier 2 fixture: branch 12 XP, grades 4 / 10 / 20 / 36. */
const FIEND = {
  id: 'undead_crypt_fiend' as const,
  tier: UnitTier.TIER_2,
  health: 100,
  speed: 1,
  physicalArmor: 2,
  magicalArmor: 2,
  talentBranches: [
    branch('undead_crypt_fiend_a', 'Webweaver'),
    branch('undead_crypt_fiend_b', 'Burrower'),
  ],
};

function snapshot(overrides: Partial<CreatureTalentSnapshot> = {}): CreatureTalentSnapshot {
  return { creatureXpByTier: {}, creatureBranchChoices: {}, creatureGrades: {}, ...overrides };
}

describe('mapCreatureTalentState', () => {
  it('offers Develop for the tier-scaled branch price with both branch cards', () => {
    const state = mapCreatureTalentState(FIEND, snapshot({ creatureXpByTier: { 2: 14 } }));

    expect(state).toMatchObject({
      xp: 14,
      grade: 0,
      chosenBranch: null,
      gradeBadge: null,
      branchSummary: null,
      xpProgress: 1,
      xpSummary: '14/12 XP',
      action: { kind: 'develop', cost: 12, isAffordable: true, blockedReason: null },
    });
    if (state.action.kind !== 'develop') throw new Error('expected develop');
    expect(state.action.branches.map((card) => [card.name, card.glyph])).toEqual([
      ['Webweaver', 'I'],
      ['Burrower', 'II'],
    ]);
    expect(state.action.branches[0].rows.map((row) => row.healthDelta)).toEqual([
      '+10',
      '+20',
      '+30',
      '+40',
    ]);
  });

  it('blocks Develop with a reason when the tier lacks experience', () => {
    const state = mapCreatureTalentState(FIEND, snapshot({ creatureXpByTier: { 1: 99, 2: 3 } }));

    expect(state.xpProgress).toBe(0.25);
    expect(state.xpSummary).toBe('3/12 XP');
    expect(state.action).toMatchObject({
      kind: 'develop',
      isAffordable: false,
      blockedReason: 'Needs 12 XP',
    });
  });

  it('shows the chosen branch, grade badge and the next grade price', () => {
    const state = mapCreatureTalentState(
      FIEND,
      snapshot({
        creatureXpByTier: { 2: 7 },
        creatureBranchChoices: { undead_crypt_fiend: 'undead_crypt_fiend_b' },
        creatureGrades: { undead_crypt_fiend: 1 },
      }),
    );

    expect(state).toMatchObject({
      grade: 1,
      chosenBranch: { id: 'undead_crypt_fiend_b', name: 'Burrower', glyph: 'II' },
      gradeBadge: 'G1/4',
      branchSummary: 'Burrower G1/4',
      xpSummary: '7/10 XP',
      action: { kind: 'upgrade', cost: 10, nextGrade: 2, isAffordable: false },
    });
    expect(state.action.blockedReason).toBe('Needs 10 XP');
  });

  it('allows the upgrade once the experience covers it', () => {
    const state = mapCreatureTalentState(
      FIEND,
      snapshot({
        creatureXpByTier: { 2: 12 },
        creatureBranchChoices: { undead_crypt_fiend: 'undead_crypt_fiend_a' },
      }),
    );

    expect(state.gradeBadge).toBe('G0/4');
    expect(state.action).toEqual({
      kind: 'upgrade',
      cost: 4,
      nextGrade: 1,
      isAffordable: true,
      blockedReason: null,
    });
  });

  it('stops at grade 4 with a max-grade reason and a full bar', () => {
    const state = mapCreatureTalentState(
      FIEND,
      snapshot({
        creatureXpByTier: { 2: 3 },
        creatureBranchChoices: { undead_crypt_fiend: 'undead_crypt_fiend_a' },
        creatureGrades: { undead_crypt_fiend: 4 },
      }),
    );

    expect(state.gradeBadge).toBe('G4/4');
    expect(state.xpSummary).toBe('3 XP');
    expect(state.xpProgress).toBe(1);
    expect(state.action).toEqual({
      kind: 'upgrade',
      cost: null,
      nextGrade: null,
      isAffordable: false,
      blockedReason: 'Max grade',
    });
  });

  it('words the lock warning per creature', () => {
    expect(formatCreatureBranchLockWarning('Crypt Fiend')).toBe(
      'Locks the other Crypt Fiend branch for this match',
    );
  });
});
