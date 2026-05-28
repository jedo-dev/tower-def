import type { RaceId } from '../../../shared/types/content-ids';
import type { BuildableTowerId } from '../../tower/model/types';
import type { UnitId } from '../../unit/model/types';

export type RaceRegistryEntry = {
  raceId: RaceId;
  name: string;
  description: string;
  themeColor: string;
  starterTowerId: BuildableTowerId;
  buildableTowerIds: BuildableTowerId[];
  sendableCreepIds: UnitId[];
};

export type RaceRegistryMap = Readonly<Record<RaceId, RaceRegistryEntry>>;
