import { describe, expect, it, vi } from 'vitest';
import { resolveUnitConfigById, type UnitConfig } from '../../../../../entities/unit';
import { UNIT_DIRECTIONAL_FRAME_COUNT, UNIT_SPRITE_KEYS } from '../../../../constants/sprites';
import {
  createOpponentFieldWaveState,
  processPendingWaveSpawns,
  scheduleOpponentFieldWave,
  type FieldSpawnDeps,
} from '../wave/fieldWaveSpawns';
import { createBattlefieldRenderState } from './battlefieldRenderState';
import { getSpriteKeyByUnit } from './battlefieldSpriteFactory';

const DIRECTIONAL_SHEETS: string[] = [
  UNIT_SPRITE_KEYS.ORC_GRUNT,
  UNIT_SPRITE_KEYS.ORC_WOLF_RIDER,
  UNIT_SPRITE_KEYS.ORC_TROLL,
  UNIT_SPRITE_KEYS.ORC_HEADHUNTER,
];

function createSprite(key: string): Phaser.GameObjects.Sprite {
  return {
    texture: {
      key,
      getFrameNames: () =>
        Array.from(
          { length: DIRECTIONAL_SHEETS.includes(key) ? UNIT_DIRECTIONAL_FRAME_COUNT : 4 },
          (_, index) => String(index),
        ),
    },
    setDisplaySize: vi.fn(),
    setDepth: vi.fn(),
    setTint: vi.fn(),
    play: vi.fn(),
    destroy: vi.fn(),
  } as unknown as Phaser.GameObjects.Sprite;
}

const SPAWN_DEPS: FieldSpawnDeps = {
  getSpriteKeyByUnit,
  getAnimationKeyByUnit: () => 'unit:walk',
  getCreepTypeFromUnit: () => 'basic',
  toCellCenter: (position) => position,
  createCreepSprite: (_x, _y, spriteKey) => createSprite(spriteKey),
};

function spawnOnComputerField(unit: UnitConfig) {
  const field = createBattlefieldRenderState();
  const state = createOpponentFieldWaveState(field);
  scheduleOpponentFieldWave(state, {
    routes: { small: [{ x: 0, y: 0 }], large: [{ x: 0, y: 0 }] },
    waveNumber: 1,
    baselineUnits: [unit],
    sentUnits: [],
    timing: { firstSpawnAtMs: 0, spawnIntervalMs: 100 },
  });
  processPendingWaveSpawns(state, SPAWN_DEPS, 0);
  return field;
}

describe('computer battlefield creeps', () => {
  it('marks a creep with a four-row sheet as directional, so it turns instead of rotating', () => {
    const field = spawnOnComputerField(resolveUnitConfigById('orc_grunt'));

    expect(field.creeps).toHaveLength(1);
    expect(field.creeps[0]).toMatchObject({
      isDirectional: true,
      facing: 'side',
      facingFlipped: false,
    });
  });

  it('leaves a legacy strip on the rotate-and-fade path', () => {
    const field = spawnOnComputerField(resolveUnitConfigById('undead_skeleton'));

    expect(field.creeps[0]).toMatchObject({ isDirectional: false, facing: undefined });
  });
});
