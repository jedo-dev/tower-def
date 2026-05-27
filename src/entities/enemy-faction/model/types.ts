import { RaceId } from '../../../shared/types/content-ids';

export { RaceId as EnemyFaction };

export type EnemyFactionConfig = {
  id: RaceId;
  name: string;
  description: string;
  creepStyle: string;
};
