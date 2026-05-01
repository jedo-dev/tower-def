import type { CreepType } from '../../creep';

export type WaveId = string;

export type CreepTypeId = CreepType;

export type WaveSpawnConfig = {
  creepTypeId: CreepTypeId;
  count: number;
  intervalMs: number;
  startDelayMs: number;
};

export type WaveConfig = {
  id: WaveId;
  rewardGold: number;
  spawns: WaveSpawnConfig[];
};
