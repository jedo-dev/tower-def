export enum EnemyFaction {
  UNDEAD = 'UNDEAD',
  ORC = 'ORC',
  HUMAN = 'HUMAN',
  ELF = 'ELF',
}

export type EnemyFactionConfig = {
  id: EnemyFaction;
  name: string;
  description: string;
  creepStyle: string;
};
