import { describe, expect, it, vi } from 'vitest';
import { resolveUnitConfigById, undeadUnits } from '../../../../entities/unit';
import { createInitialWavePhaseState } from '../../../wave-phase';
import { createBattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import {
  createOpponentFieldWaveState,
  isFieldWaveResolved,
  processPendingWaveSpawns,
  resolveWaveSpawnTiming,
  scheduleOpponentFieldWave,
  type FieldSpawnDeps,
} from './fieldWaveSpawns';
import {
  spawnWaveCreeps,
  type WaveRuntimeConfig,
  type WaveRuntimeDependencies,
  type WaveRuntimeState,
} from './gameSceneWaveRuntime';

const WAVE_START_MS = 5_000;
const CONFIG: WaveRuntimeConfig = {
  autoWaveStartDelayMs: 30_000,
  waveSpawnIntervalMs: 500,
  waveFirstSpawnDelayMs: 250,
  earlyWaveStartBonusPlaceholderEligible: false,
};
const ROUTES = { small: [{ x: 0, y: 0 }], large: [{ x: 0, y: 0 }], air: [{ x: 0, y: 0 }] };
const BASELINE = undeadUnits.slice(0, 3);
const PLAYER_SENDS = [resolveUnitConfigById('undead_ghoul')];
const COMPUTER_SENDS = [resolveUnitConfigById('undead_gargoyle')];

function createSpriteStub(): Phaser.GameObjects.Sprite {
  return {
    destroy: vi.fn(),
    play: vi.fn(),
    setDepth: vi.fn(),
    setDisplaySize: vi.fn(),
    setTint: vi.fn(),
  } as unknown as Phaser.GameObjects.Sprite;
}

const SPAWN_DEPS: FieldSpawnDeps = {
  getSpriteKeyByUnit: () => 'unit:sprite',
  getAnimationKeyByUnit: () => 'unit:walk',
  getCreepTypeFromUnit: () => 'basic',
  toCellCenter: (position) => position,
  createCreepSprite: () => createSpriteStub(),
};

function createPlayerRunState(): WaveRuntimeState {
  return {
    activeCreepRoutes: ROUTES,
    activeCreeps: [],
    pendingWaveSpawns: [],
    wavePhaseState: createInitialWavePhaseState(),
    isWaveCompletionRewardGranted: false,
    nextWaveStartsAtMs: null,
    playerGold: 100,
    waveKillBountyEarned: 0,
    isGameOver: false,
    currentWaveNumber: 1,
    lastPublishedAutoStartSecondsLeft: null,
  };
}

function schedulePlayerField(): WaveRuntimeState {
  const state = createPlayerRunState();
  const deps = {
    ...SPAWN_DEPS,
    nowMs: () => WAVE_START_MS,
    getAdditionalWaveUnits: () => COMPUTER_SENDS,
  } as unknown as WaveRuntimeDependencies;
  spawnWaveCreeps(state, CONFIG, deps, BASELINE);
  return state;
}

function scheduleComputerField() {
  const field = createBattlefieldRenderState();
  const state = createOpponentFieldWaveState(field);
  scheduleOpponentFieldWave(state, {
    routes: ROUTES,
    waveNumber: 1,
    baselineUnits: BASELINE,
    sentUnits: PLAYER_SENDS,
    timing: resolveWaveSpawnTiming(WAVE_START_MS, CONFIG),
  });
  return { field, state };
}

describe('computer field wave schedule', () => {
  it('plays the same baseline as the player field, then the player sends', () => {
    const { state } = scheduleComputerField();

    expect(state.pendingWaveSpawns.map((spawn) => spawn.unit.id)).toEqual([
      ...BASELINE.map((unit) => unit.id),
      ...PLAYER_SENDS.map((unit) => unit.id),
    ]);
    expect(state.pendingWaveSpawns.at(-1)?.sender).toBe('player');
    expect(state.pendingWaveSpawns[0]?.sender).toBeUndefined();
  });

  it('releases creeps on the same timing as the player field', () => {
    const player = schedulePlayerField();
    const { state } = scheduleComputerField();

    expect(state.pendingWaveSpawns.map((spawn) => spawn.spawnAtMs)).toEqual(
      player.pendingWaveSpawns.map((spawn) => spawn.spawnAtMs),
    );
    expect(state.pendingWaveSpawns.map((spawn) => spawn.unit.id).slice(0, BASELINE.length)).toEqual(
      player.pendingWaveSpawns.map((spawn) => spawn.unit.id).slice(0, BASELINE.length),
    );
  });

  it('staggers the computer field instead of dropping the whole wave at once', () => {
    const { field, state } = scheduleComputerField();
    const firstSpawnAtMs = WAVE_START_MS + CONFIG.waveFirstSpawnDelayMs;

    processPendingWaveSpawns(state, SPAWN_DEPS, firstSpawnAtMs - 1);
    expect(field.creeps).toHaveLength(0);

    processPendingWaveSpawns(state, SPAWN_DEPS, firstSpawnAtMs);
    expect(field.creeps).toHaveLength(1);

    processPendingWaveSpawns(state, SPAWN_DEPS, firstSpawnAtMs + CONFIG.waveSpawnIntervalMs);
    expect(field.creeps).toHaveLength(2);

    processPendingWaveSpawns(state, SPAWN_DEPS, firstSpawnAtMs + 10 * CONFIG.waveSpawnIntervalMs);
    expect(field.creeps).toHaveLength(BASELINE.length + PLAYER_SENDS.length);
    expect(field.creeps.at(-1)?.entity.sender).toBe('player');
    expect(state.pendingWaveSpawns).toHaveLength(0);
  });

  it('clears the previous wave from the field when the next one is scheduled', () => {
    const { field, state } = scheduleComputerField();
    processPendingWaveSpawns(state, SPAWN_DEPS, Number.MAX_SAFE_INTEGER);
    const oldSprite = field.creeps[0]?.sprite;

    scheduleOpponentFieldWave(state, {
      routes: ROUTES,
      waveNumber: 2,
      baselineUnits: BASELINE,
      sentUnits: [],
      timing: resolveWaveSpawnTiming(WAVE_START_MS, CONFIG),
    });

    expect(field.creeps).toHaveLength(0);
    expect(oldSprite?.destroy).toHaveBeenCalled();
  });

  it('schedules nothing on a sealed field, so the wave cannot hang on it', () => {
    const field = createBattlefieldRenderState();
    const state = createOpponentFieldWaveState(field);

    scheduleOpponentFieldWave(state, {
      routes: { small: [], large: [], air: [] },
      waveNumber: 1,
      baselineUnits: BASELINE,
      sentUnits: PLAYER_SENDS,
      timing: resolveWaveSpawnTiming(WAVE_START_MS, CONFIG),
    });

    expect(state.pendingWaveSpawns).toHaveLength(0);
    expect(isFieldWaveResolved(state)).toBe(true);
  });
});

describe('isFieldWaveResolved', () => {
  function creep(status: CreepRenderState['entity']['status']): CreepRenderState {
    return { entity: { status } } as CreepRenderState;
  }

  it('waits while creeps are still scheduled', () => {
    const { state } = scheduleComputerField();
    expect(isFieldWaveResolved(state)).toBe(false);
  });

  it('waits while a creep is still walking', () => {
    expect(
      isFieldWaveResolved({ pendingWaveSpawns: [], activeCreeps: [creep('alive'), creep('dead')] }),
    ).toBe(false);
  });

  it('is resolved once every creep died or escaped, even after corpses were removed', () => {
    expect(
      isFieldWaveResolved({
        pendingWaveSpawns: [],
        activeCreeps: [creep('dead'), creep('escaped')],
      }),
    ).toBe(true);
    expect(isFieldWaveResolved({ pendingWaveSpawns: [], activeCreeps: [] })).toBe(true);
  });
});

describe('sent creature spawn cue', () => {
  it('announces sends on the receiving board, never baseline wave creeps', () => {
    const { state } = scheduleComputerField();
    const announced: (string | undefined)[] = [];
    const deps: FieldSpawnDeps = {
      ...SPAWN_DEPS,
      onSentCreepSpawned: (creep) => announced.push(creep.unitId),
    };

    processPendingWaveSpawns(state, deps, Number.MAX_SAFE_INTEGER);

    expect(state.activeCreeps).toHaveLength(BASELINE.length + PLAYER_SENDS.length);
    expect(announced).toEqual(PLAYER_SENDS.map((unit) => unit.id));
  });

  it('announces the computer sends on the player board', () => {
    const state = schedulePlayerField();
    const announced: (string | undefined)[] = [];

    processPendingWaveSpawns(
      state,
      { ...SPAWN_DEPS, onSentCreepSpawned: (creep) => announced.push(creep.unitId) },
      Number.MAX_SAFE_INTEGER,
    );

    expect(announced).toEqual(COMPUTER_SENDS.map((unit) => unit.id));
  });
});
