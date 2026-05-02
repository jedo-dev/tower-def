import { describe, expect, it } from 'vitest';
import {
  completeWaveIfResolved,
  createInitialWavePhaseState,
  isBuildPhase,
  isCompletedPhase,
  isGameOverPhase,
  isWavePhase,
  setWavePhase,
  startWave,
} from './state';
import type { CreepEntity } from '../../../entities/creep';

function createCreep(status: CreepEntity['status']): CreepEntity {
  return {
    id: `creep:${status}`,
    type: 'basic',
    hp: 100,
    lifeState: status === 'dead' ? 'dead' : 'alive',
    speed: 1,
    status,
    position: { x: 0, y: 0 },
    pathIndex: 0,
  };
}

describe('wave phase state', () => {
  it('starts in build phase by default', () => {
    const state = createInitialWavePhaseState();

    expect(isBuildPhase(state)).toBe(true);
    expect(state.phase).toBe('build');
  });

  it('transitions build -> wave when startWave is called', () => {
    const state = createInitialWavePhaseState();
    const result = startWave(state);

    expect(result.started).toBe(true);
    expect(isWavePhase(result.state)).toBe(true);
    expect(result.state.phase).toBe('wave');
  });

  it('does not start wave when current phase is completed', () => {
    const completedState = setWavePhase(createInitialWavePhaseState(), 'completed');
    const result = startWave(completedState);

    expect(isCompletedPhase(completedState)).toBe(true);
    expect(result.started).toBe(false);
    expect(result.state).toBe(completedState);
  });

  it('does not start wave when current phase is game-over', () => {
    const gameOverState = setWavePhase(createInitialWavePhaseState(), 'game-over');
    const result = startWave(gameOverState);

    expect(isGameOverPhase(gameOverState)).toBe(true);
    expect(result.started).toBe(false);
    expect(result.state).toBe(gameOverState);
  });

  it('completes wave when all creeps are dead or escaped', () => {
    const waveState = setWavePhase(createInitialWavePhaseState(), 'wave');
    const creeps = [createCreep('dead'), createCreep('escaped')];

    const nextState = completeWaveIfResolved(waveState, creeps);

    expect(isCompletedPhase(nextState)).toBe(true);
  });

  it('keeps wave phase while at least one creep is alive', () => {
    const waveState = setWavePhase(createInitialWavePhaseState(), 'wave');
    const creeps = [createCreep('dead'), createCreep('alive')];

    const nextState = completeWaveIfResolved(waveState, creeps);

    expect(isWavePhase(nextState)).toBe(true);
  });
});
