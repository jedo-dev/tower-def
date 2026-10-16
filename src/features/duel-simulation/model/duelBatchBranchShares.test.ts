import { describe, expect, it } from 'vitest';
import { summarizeBranchShares } from './duelBatchBranchShares';

describe('features/duel-simulation/duelBatchBranchShares', () => {
  it('lists every authored branch of a developed type, the ones never picked at 0', () => {
    const shares = summarizeBranchShares([
      { branchChoices: { orc_tar_pit: 'orc_tar_pit_quagmire' } },
      {
        branchChoices: {
          orc_tar_pit: 'orc_tar_pit_quagmire',
          orc_burning_pit: 'orc_burning_pit_mortar',
        },
      },
      { branchChoices: {} },
    ]);

    expect(shares).toEqual([
      {
        towerId: 'orc_tar_pit',
        sides: 2,
        picks: [
          { branchId: 'orc_tar_pit_quagmire', count: 2 },
          { branchId: 'orc_tar_pit_sticky', count: 0 },
        ],
      },
      {
        towerId: 'orc_burning_pit',
        sides: 1,
        picks: [
          { branchId: 'orc_burning_pit_napalm', count: 0 },
          { branchId: 'orc_burning_pit_mortar', count: 1 },
        ],
      },
    ]);
  });

  it('keeps a pick it does not know after the authored branches', () => {
    const [share] = summarizeBranchShares([
      { branchChoices: { fixture_tower: 'fixture_a' } },
      { branchChoices: { fixture_tower: 'fixture_a' } },
    ]);

    expect(share).toEqual({
      towerId: 'fixture_tower',
      sides: 2,
      picks: [{ branchId: 'fixture_a', count: 2 }],
    });
  });
});
