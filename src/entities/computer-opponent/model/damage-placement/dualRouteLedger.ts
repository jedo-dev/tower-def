import type { LedgerTower, RouteDamageLedger } from './routeDamageLedger';

/**
 * One ledger over two lanes: the ground maze and the straight air route.
 * A tower is worth what it adds on each lane, weighted by the share of the
 * expected wave that flies (`airShare`), so with fliers coming a block on the
 * air line is worth building and a ground-only type on it is worth less.
 * Both inner ledgers hold the same towers in the same order, so `add`,
 * `replace` and `excludeIndex` mean the same thing on either. Route gain is
 * a ground matter (the air line cannot be lengthened), so the mean damage
 * per route sample is the ground lane's, scaled by its share of the wave.
 */
export function createDualRouteLedger(
  ground: RouteDamageLedger,
  air: RouteDamageLedger,
  airShare: number,
): RouteDamageLedger {
  const share = Math.min(1, Math.max(0, airShare));
  const groundShare = 1 - share;

  return {
    geometry: ground.geometry,
    moveType: ground.moveType,
    towers: ground.towers,
    add(tower: LedgerTower): number {
      const index = ground.add(tower);
      air.add(tower);
      return index;
    },
    replace(index: number, tower: LedgerTower): void {
      ground.replace(index, tower);
      air.replace(index, tower);
    },
    contributionOf(tower: LedgerTower, excludeIndex?: number): number {
      return (
        groundShare * ground.contributionOf(tower, excludeIndex) +
        share * air.contributionOf(tower, excludeIndex)
      );
    },
    averageSampleDps(): number {
      return groundShare * ground.averageSampleDps();
    },
  };
}
