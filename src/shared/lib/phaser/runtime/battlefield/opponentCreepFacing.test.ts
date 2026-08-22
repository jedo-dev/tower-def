import { describe, expect, it, vi } from 'vitest';
import { rebuildOpponentBattlefieldRenderState } from './battlefieldSpriteFactory';
import type { BattlefieldRenderState } from './battlefieldRenderState';
import { UNIT_DIRECTIONAL_FRAME_COUNT, UNIT_SPRITE_KEYS } from '../../../../constants/sprites';
import type { DuelMatchState } from '../../../../../entities/duel-match';

const DIRECTIONAL_SHEETS: string[] = [
  UNIT_SPRITE_KEYS.ORC_GRUNT,
  UNIT_SPRITE_KEYS.ORC_WOLF_RIDER,
  UNIT_SPRITE_KEYS.ORC_TROLL,
  UNIT_SPRITE_KEYS.ORC_HEADHUNTER,
];

function createSceneStub(): Phaser.Scene {
  return {
    add: {
      sprite: (_x: number, _y: number, key: string) => ({
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
        setVisible: vi.fn(),
        play: vi.fn(),
      }),
    },
  } as unknown as Phaser.Scene;
}

function createField(): BattlefieldRenderState {
  return {
    towers: [],
    creeps: [],
    projectiles: [],
    impactEffects: [],
    damageNumbers: [],
  } as unknown as BattlefieldRenderState;
}

function createOpponent(unitId: string): DuelMatchState['opponent'] {
  return {
    raceId: 'ORC',
    battlefield: {
      towers: [],
      path: [],
      creeps: [
        {
          id: `opponent-creep-1:${unitId}`,
          status: 'alive',
          position: { x: 0, y: 0 },
        },
      ],
    },
  } as unknown as DuelMatchState['opponent'];
}

describe('opponent battlefield creeps', () => {
  it('marks a creep with a four-row sheet as directional, so it turns instead of rotating', () => {
    const field = createField();

    rebuildOpponentBattlefieldRenderState(
      createSceneStub(),
      field,
      createOpponent('orc_grunt'),
      true,
    );

    expect(field.creeps).toHaveLength(1);
    expect(field.creeps[0]).toMatchObject({
      isDirectional: true,
      facing: 'side',
      facingFlipped: false,
    });
  });

  it('leaves a legacy strip on the rotate-and-fade path', () => {
    const field = createField();

    rebuildOpponentBattlefieldRenderState(
      createSceneStub(),
      field,
      createOpponent('undead_skeleton'),
      true,
    );

    expect(field.creeps[0]).toMatchObject({ isDirectional: false, facing: undefined });
  });
});
