/**
 * Routes the next wave walks, one per creep footprint, computed once at wave
 * start with the same clearance-aware search that validates builds.
 */
export {
  calculateWaveRoutes,
  EMPTY_WAVE_ROUTES,
  hasWaveRoute,
  selectWaveRoute,
  type WaveRoute,
  type WaveRoutes,
  type WaveRouteTraits,
} from '../../../shared/lib/pathfinding/waveRoutes';
