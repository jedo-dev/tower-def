import Phaser from 'phaser';
import { PROPS, TILES, type Faction } from '../../../../../assets/registry';
import {
  TOWER_SPRITE_ASSETS,
  TOWER_SPRITE_KEYS,
  TOWER_SPRITE_SHEET_FRAME,
  UNIT_SPRITE_ASSETS,
  UNIT_SPRITE_KEYS,
  UNIT_SPRITE_SHEET_FRAME,
} from '../../../../constants/sprites';

function forEachTerrainTextureKey(callback: (textureKey: string, url: string) => void): void {
  const factions = Object.keys(TILES) as Faction[];
  factions.forEach((faction) => {
    const urls = [TILES[faction].ground, TILES[faction].path, ...PROPS[faction]];
    urls.forEach((url) => {
      callback(`terrain:${faction}:${url}`, url);
    });
  });
}

export function preloadGameSceneAssets(scene: Phaser.Scene): void {
  forEachTerrainTextureKey((textureKey, url) => {
    if (!scene.textures.exists(textureKey)) {
      scene.load.image(textureKey, url);
    }
  });

  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    forEachTerrainTextureKey((textureKey) => {
      if (scene.textures.exists(textureKey)) {
        scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });
  });

  Object.entries(UNIT_SPRITE_ASSETS).forEach(([key, assetPath]) => {
    if (!scene.textures.exists(key)) {
      scene.load.spritesheet(key, assetPath, {
        frameWidth: UNIT_SPRITE_SHEET_FRAME.width,
        frameHeight: UNIT_SPRITE_SHEET_FRAME.height,
      });
    }
  });

  Object.entries(TOWER_SPRITE_ASSETS).forEach(([key, assetPath]) => {
    if (!scene.textures.exists(key)) {
      scene.load.spritesheet(key, assetPath, {
        frameWidth: TOWER_SPRITE_SHEET_FRAME.width,
        frameHeight: TOWER_SPRITE_SHEET_FRAME.height,
      });
    }
  });
}

export function applyNearestNeighborFiltering(scene: Phaser.Scene): void {
  Object.values(UNIT_SPRITE_KEYS).forEach((spriteKey) => {
    if (scene.textures.exists(spriteKey)) {
      scene.textures.get(spriteKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  });
  Object.values(TOWER_SPRITE_KEYS).forEach((spriteKey) => {
    if (scene.textures.exists(spriteKey)) {
      scene.textures.get(spriteKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  });
}
