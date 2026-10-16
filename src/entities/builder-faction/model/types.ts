import type { BuildableTowerId } from '../../tower/model/types';
import { RaceId } from '../../../shared/types/content-ids';

export { RaceId as BuilderFaction };

export type BuilderFactionConfig = {
  id: RaceId;
  name: string;
  description: string;
  /** Accent as a theme token reference (`var(--color-faction-*)`), never raw hex. */
  themeColor: string;
  towerIds: BuildableTowerId[];
};
