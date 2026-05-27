import type { BuildableTowerId } from '../../tower/model/types';
import { RaceId } from '../../../shared/types/content-ids';

export { RaceId as BuilderFaction };

export type BuilderFactionConfig = {
  id: RaceId;
  name: string;
  description: string;
  themeColor: string;
  towerIds: BuildableTowerId[];
};
