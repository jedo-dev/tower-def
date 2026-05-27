import type { CreepTypeId as SharedCreepTypeId } from '../../../shared/types/content-ids';

export type WaveId = string;

export type CreepTypeId = SharedCreepTypeId;

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
