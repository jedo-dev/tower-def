import { describe, expect, it } from 'vitest';
import {
  canPerformBuildActions,
  completeWaveIfResolved,
  createInitialWavePhaseState,
  isBuildPhase,
  isCompletedPhase,
  isWaveActionAllowed,
  isGameOverPhase,
  isWavePhase,
  resetWavePhaseState,
  startNextWaveCycle,
  setWavePhase,
  startWave,
  transitionCompletedToBuild,
  transitionToGameOver,
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

  it('transitions completed -> build for next cycle', () => {
    const completedState = setWavePhase(createInitialWavePhaseState(), 'completed');
    const nextState = transitionCompletedToBuild(completedState);

    expect(isBuildPhase(nextState)).toBe(true);
  });

  it('does not transition non-completed phase to build', () => {
    const waveState = setWavePhase(createInitialWavePhaseState(), 'wave');
    const nextState = transitionCompletedToBuild(waveState);

    expect(nextState).toBe(waveState);
  });

  it('transitions any non-game-over phase to game-over', () => {
    const waveState = setWavePhase(createInitialWavePhaseState(), 'wave');
    const nextState = transitionToGameOver(waveState);

    expect(isGameOverPhase(nextState)).toBe(true);
  });

  it('keeps game-over phase idempotent', () => {
    const gameOverState = setWavePhase(createInitialWavePhaseState(), 'game-over');
    const nextState = transitionToGameOver(gameOverState);

    expect(nextState).toBe(gameOverState);
  });

  it('allows build actions only in build phase', () => {
    expect(canPerformBuildActions(setWavePhase(createInitialWavePhaseState(), 'build'))).toBe(
      true,
    );
    expect(canPerformBuildActions(setWavePhase(createInitialWavePhaseState(), 'wave'))).toBe(
      false,
    );
    expect(
      canPerformBuildActions(setWavePhase(createInitialWavePhaseState(), 'completed')),
    ).toBe(false);
    expect(
      canPerformBuildActions(setWavePhase(createInitialWavePhaseState(), 'game-over')),
    ).toBe(false);
  });

  it('blocks place/sell actions during wave phase and allows in build phase', () => {
    const buildState = setWavePhase(createInitialWavePhaseState(), 'build');
    const waveState = setWavePhase(createInitialWavePhaseState(), 'wave');

    expect(isWaveActionAllowed(buildState, 'place-tower')).toBe(true);
    expect(isWaveActionAllowed(buildState, 'sell-tower')).toBe(true);
    expect(isWaveActionAllowed(waveState, 'place-tower')).toBe(false);
    expect(isWaveActionAllowed(waveState, 'sell-tower')).toBe(false);
  });

  it('starts next wave cycle from completed phase', () => {
    const completedState = setWavePhase(createInitialWavePhaseState(), 'completed');
    const nextState = startNextWaveCycle(completedState);

    expect(isWavePhase(nextState)).toBe(true);
  });

  it('resets wave phase state back to build', () => {
    const gameOverState = setWavePhase(createInitialWavePhaseState(), 'game-over');
    const resetState = resetWavePhaseState();

    expect(isGameOverPhase(gameOverState)).toBe(true);
    expect(isBuildPhase(resetState)).toBe(true);
    expect(resetState.phase).toBe('build');
  });
});
