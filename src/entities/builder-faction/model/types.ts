import type { BuildableTowerId } from '../../tower/model/types';

export enum BuilderFaction {
  UNDEAD = 'UNDEAD',
  ORC = 'ORC',
  HUMAN = 'HUMAN',
  ELF = 'ELF',
}

export type BuilderFactionConfig = {
  id: BuilderFaction;
  name: string;
  description: string;
  themeColor: string;
  towerIds: BuildableTowerId[];
};
