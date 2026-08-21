import { describe, expect, it, vi } from 'vitest';
import {
  ensurePlaceholderTextures,
  getPlaceholderFrameCount,
  PLACEHOLDER_TEXTURE_KEYS,
} from './placeholderTexture';
import {
  PLACEHOLDER_GLYPH,
  PLACEHOLDER_TOWER_FRAME_COUNT,
  PLACEHOLDER_UNIT_FRAME_COUNT,
} from '../../scenes/gameScene.constants';
import {
  TOWER_SPRITE_SHEET_FRAME,
  UNIT_SPRITE_SHEET_FRAME,
} from '../../../../constants/sprites';

type AddedFrame = { index: number; x: number; width: number; height: number };

type CanvasTextureStub = {
  key: string;
  width: number;
  height: number;
  frames: AddedFrame[];
  refreshed: number;
  glyphs: string[];
};

function createSceneStub() {
  const textures = new Map<string, CanvasTextureStub>();

  const scene = {
    textures: {
      exists: (key: string) => textures.has(key),
      createCanvas: (key: string, width: number, height: number) => {
        const stub: CanvasTextureStub = {
          key,
          width,
          height,
          frames: [],
          refreshed: 0,
          glyphs: [],
        };
        textures.set(key, stub);

        return {
          getContext: () => ({
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            font: '',
            textAlign: '',
            textBaseline: '',
            beginPath: vi.fn(),
            roundRect: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            setLineDash: vi.fn(),
            fillText: (glyph: string) => stub.glyphs.push(glyph),
          }),
          add: (index: number, _source: number, x: number, _y: number, width: number, height: number) => {
            stub.frames.push({ index, x, width, height });
          },
          refresh: () => {
            stub.refreshed += 1;
          },
        };
      },
    },
  } as unknown as Phaser.Scene;

  return { scene, textures };
}

describe('placeholder textures', () => {
  it('registers a unit and a tower placeholder', () => {
    const { scene, textures } = createSceneStub();

    ensurePlaceholderTextures(scene);

    expect(textures.has(PLACEHOLDER_TEXTURE_KEYS.UNIT)).toBe(true);
    expect(textures.has(PLACEHOLDER_TEXTURE_KEYS.TOWER)).toBe(true);
  });

  it('matches the spritesheet frame contract each sprite kind already uses', () => {
    const { scene, textures } = createSceneStub();

    ensurePlaceholderTextures(scene);

    const unit = textures.get(PLACEHOLDER_TEXTURE_KEYS.UNIT)!;
    const tower = textures.get(PLACEHOLDER_TEXTURE_KEYS.TOWER)!;

    expect(unit.frames).toHaveLength(PLACEHOLDER_UNIT_FRAME_COUNT);
    expect(unit.height).toBe(UNIT_SPRITE_SHEET_FRAME.height);
    expect(unit.width).toBe(UNIT_SPRITE_SHEET_FRAME.width * PLACEHOLDER_UNIT_FRAME_COUNT);
    expect(unit.frames.map((frame) => frame.index)).toEqual([0, 1, 2, 3]);

    expect(tower.frames).toHaveLength(PLACEHOLDER_TOWER_FRAME_COUNT);
    expect(tower.height).toBe(TOWER_SPRITE_SHEET_FRAME.height);
    expect(tower.frames.at(-1)?.index).toBe(PLACEHOLDER_TOWER_FRAME_COUNT - 1);
    expect(tower.frames.at(-1)?.x).toBe(
      TOWER_SPRITE_SHEET_FRAME.width * (PLACEHOLDER_TOWER_FRAME_COUNT - 1),
    );
  });

  it('draws the question mark on every frame', () => {
    const { scene, textures } = createSceneStub();

    ensurePlaceholderTextures(scene);

    const unit = textures.get(PLACEHOLDER_TEXTURE_KEYS.UNIT)!;

    expect(unit.glyphs).toHaveLength(PLACEHOLDER_UNIT_FRAME_COUNT);
    expect(new Set(unit.glyphs)).toEqual(new Set([PLACEHOLDER_GLYPH]));
    expect(unit.refreshed).toBe(1);
  });

  it('draws once and reuses the textures afterwards', () => {
    const { scene, textures } = createSceneStub();

    ensurePlaceholderTextures(scene);
    ensurePlaceholderTextures(scene);
    ensurePlaceholderTextures(scene);

    expect(textures.get(PLACEHOLDER_TEXTURE_KEYS.UNIT)!.refreshed).toBe(1);
    expect(textures.get(PLACEHOLDER_TEXTURE_KEYS.TOWER)!.refreshed).toBe(1);
  });

  it('reports the frame count animation code can rely on', () => {
    expect(getPlaceholderFrameCount(PLACEHOLDER_TEXTURE_KEYS.UNIT)).toBe(PLACEHOLDER_UNIT_FRAME_COUNT);
    expect(getPlaceholderFrameCount(PLACEHOLDER_TEXTURE_KEYS.TOWER)).toBe(PLACEHOLDER_TOWER_FRAME_COUNT);
  });
});
