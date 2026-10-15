export type { CreepTypeId, WaveConfig, WaveId, WaveSpawnConfig } from './model/types';
export type {
  WaveComposition,
  WaveCompositionEntry,
  WavePreviewSummary,
  WavePreviewUnitLine,
} from './model/composition';
export { spawnCreepsFromWave } from './model/spawnCreepsFromWave';
export {
  calculateWaveRoutes,
  EMPTY_WAVE_ROUTES,
  hasWaveRoute,
  selectWaveRoute,
  type WaveRoute,
  type WaveRoutes,
  type WaveRouteTraits,
} from './model/calculateWavePath';
export {
  generateWaveUnits,
  getWaveBudget,
  getWaveUnitCap,
  getWaveUnitValue,
} from './model/generateWaveUnits';
export {
  WAVE_AIR_UNIT_BUDGET_MULTIPLIER,
  WAVE_BUDGET_CURVE,
  WAVE_HEALTH_GROWTH,
  WAVE_TIER_UNLOCK_WAVE,
  WAVE_TIER_VALUE_BY_TIER,
  WAVE_UNIT_COUNT_BOUNDS,
} from './model/waveBalance';
export { buildWavePreview, composeWave } from './model/composeWave';
export { getWaveHealthMultiplier, scaleHealthForWave } from './model/waveHealth';
