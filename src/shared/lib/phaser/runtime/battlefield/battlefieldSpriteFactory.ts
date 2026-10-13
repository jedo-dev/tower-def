import { TowerAttackKind, TowerTypeId } from '../../../../types/content-ids';
import { getTowerAttackKind, getTowerCenter } from '../../../../../entities/tower';
import type Phaser from 'phaser';
import type { DuelMatchState } from '../../../../../entities/duel-match';
import {
  buildableTowers,
  createInitialTowerCombatRuntime,
  createTowersWithAuras,
} from '../../../../../entities/tower';
import type { UnitConfig, UnitId } from '../../../../../entities/unit';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import {
  TOWER_SPRITE_KEYS,
  UNIT_FACTION_TINTS,
  UNIT_SPRITE_KEY_BY_UNIT_ID,
  UNIT_SPRITE_KEYS,
} from '../../../../constants/sprites';
import type { RaceId } from '../../../../types/content-ids';
import type { GridPosition } from '../../../../types/pathfinding';
import {
  BONE_ARCHER_ORIGIN_X,
  BONE_ARCHER_ORIGIN_Y,
  PLAGUE_TOWER_CONFIG,
  PLAGUE_TOWER_ORIGIN_X,
  PLAGUE_TOWER_ORIGIN_Y,
  TOWER_RENDER_DEPTH,
  TOWER_VISUAL_SCALE_IN_CELLS,
} from '../../scenes/gameScene.constants';
import { toCellCenter } from '../../scenes/gameScene.helpers';
import type { TowerRenderState } from '../../scenes/gameScene.types';
import {
  getTowerAnimationSet,
  getWalkAnimationKeyBySpriteKey,
} from '../animation/gameSceneAnimationRuntime';
import { resolveSpriteKey } from '../assets/spriteKeyResolver';
import {
  destroyBattlefieldRenderState,
  type BattlefieldRenderState,
} from './battlefieldRenderState';

/** Creeps whose own sheet is registered; everything else falls back by tier. */
const SPRITE_KEY_BY_UNIT_ID: Partial<Record<UnitId, string>> = UNIT_SPRITE_KEY_BY_UNIT_ID;

export function getSpriteKeyByUnit(unit: UnitConfig): string {
  return SPRITE_KEY_BY_UNIT_ID[unit.id] ?? getFallbackSpriteKeyByTier(unit.tier);
}

// Only undead spritesheets exist; non-undead units reuse them by tier and
// get a faction tint so races stay distinguishable.
function getFallbackSpriteKeyByTier(tier: number): string {
  if (tier <= 1) {
    return UNIT_SPRITE_KEYS.UNDEAD_SKELETON;
  }
  if (tier === 2) {
    return UNIT_SPRITE_KEYS.UNDEAD_GHOUL;
  }
  if (tier === 3) {
    return UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND;
  }
  return UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE;
}

export function getCreepTintByUnit(unit: UnitConfig): number {
  // A creep with its own sheet is already the right colour; the faction tint is
  // only there to tell borrowed undead art apart.
  if (SPRITE_KEY_BY_UNIT_ID[unit.id]) {
    return 0xffffff;
  }

  return UNIT_FACTION_TINTS[unit.faction] ?? 0xffffff;
}

export function getAnimationKeyByUnit(unit: UnitConfig): string {
  return getWalkAnimationKeyBySpriteKey(getSpriteKeyByUnit(unit));
}

export function getArcherTowerSpriteKey(scene: Phaser.Scene, factionId: RaceId): string {
  return resolveArcherTowerSprite(scene, factionId).spriteKey;
}

function resolveArcherTowerSprite(scene: Phaser.Scene, factionId: RaceId) {
  const factionTower = buildableTowers.find(
    (tower) => tower.faction === factionId && tower.towerType === TowerTypeId.SINGLE,
  );
  const requestedKey = factionTower?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;

  return resolveSpriteKey(scene.textures, 'tower', requestedKey, {
    raceId: factionId,
    contentId: factionTower?.id,
  });
}

function resolveTowerRenderDepth(position: GridPosition): number {
  return TOWER_RENDER_DEPTH + position.y * 10 + position.x * 0.01;
}

/** Sprites stand on the centre of the tower's footprint, not on its anchor cell. */
function toTowerSpriteCenter(anchor: GridPosition): { x: number; y: number } {
  return toCellCenter(getTowerCenter({ position: anchor }));
}

export function createPlacedArcherSprite(
  scene: Phaser.Scene,
  position: GridPosition,
  factionId: RaceId,
): Phaser.GameObjects.Sprite {
  const center = toTowerSpriteCenter(position);
  const resolved = resolveArcherTowerSprite(scene, factionId);
  const animationSet = getTowerAnimationSet(resolved.spriteKey);
  const sprite = scene.add.sprite(center.x, center.y, resolved.spriteKey, 0);
  if (resolved.isPlaceholder && resolved.placeholderTint !== undefined) {
    sprite.setTint(resolved.placeholderTint);
  }
  sprite.setDepth(resolveTowerRenderDepth(position));
  sprite.setDisplaySize(
    GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS,
    GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS,
  );
  sprite.setOrigin(BONE_ARCHER_ORIGIN_X, BONE_ARCHER_ORIGIN_Y);
  sprite.play(animationSet.build);
  sprite.once(`animationcomplete-${animationSet.build}`, () => {
    if (!sprite.scene) {
      return;
    }
    sprite.play(animationSet.idle);
  });

  return sprite;
}

export function createPlacedPlagueSprite(
  scene: Phaser.Scene,
  position: GridPosition,
): Phaser.GameObjects.Sprite {
  const center = toTowerSpriteCenter(position);
  const resolved = resolveSpriteKey(
    scene.textures,
    'tower',
    PLAGUE_TOWER_CONFIG?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER,
    { contentId: PLAGUE_TOWER_CONFIG?.id },
  );
  const animationSet = getTowerAnimationSet(resolved.spriteKey);
  const sprite = scene.add.sprite(center.x, center.y, resolved.spriteKey, 0);
  sprite.setDepth(resolveTowerRenderDepth(position));
  sprite.setDisplaySize(
    GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS * 1.1,
    GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS * 1.1,
  );
  sprite.setOrigin(PLAGUE_TOWER_ORIGIN_X, PLAGUE_TOWER_ORIGIN_Y);
  sprite.setTint(0x44aa44);
  sprite.play(animationSet.build);
  sprite.once(`animationcomplete-${animationSet.build}`, () => {
    if (!sprite.scene) {
      return;
    }
    sprite.play(animationSet.idle);
  });

  return sprite;
}

export function playArcherAttackAnimation(tower: TowerRenderState): void {
  if (getTowerAttackKind(tower.entity.type) !== TowerAttackKind.SINGLE_TARGET) {
    return;
  }

  if (!tower.sprite.active) {
    return;
  }

  const animationSet = getTowerAnimationSet(tower.sprite.texture.key);
  tower.sprite.play(animationSet.attack, true);
  tower.sprite.once(`animationcomplete-${animationSet.attack}`, () => {
    if (!tower.sprite.active) {
      return;
    }
    tower.sprite.play(animationSet.idle, true);
  });
}

export function playBoneArcherSellAnimation(tower: TowerRenderState): void {
  if (!tower.sprite.active) {
    return;
  }

  const animationSet = getTowerAnimationSet(tower.sprite.texture.key);
  tower.sprite.play(animationSet.sell, true);
  tower.sprite.once(`animationcomplete-${animationSet.sell}`, () => {
    if (!tower.sprite.active) {
      return;
    }

    tower.sprite.destroy();
  });
}

export function playPlagueAttackAnimation(scene: Phaser.Scene, tower: TowerRenderState): void {
  if (getTowerAttackKind(tower.entity.type) !== TowerAttackKind.SPLASH) {
    return;
  }

  if (!tower.sprite.active) {
    return;
  }

  tower.sprite.setTint(0x66ff66);
  scene.time.delayedCall(150, () => {
    if (tower.sprite.active) {
      tower.sprite.setTint(0x44aa44);
    }
  });
}

/**
 * Rebuilds the opponent Phaser render state from the duel match state at wave
 * start: destroys the previous wave's sprites and re-creates the towers. The
 * wave's creeps arrive through the field's spawn schedule, like the player's.
 */
export function rebuildOpponentBattlefieldRenderState(
  scene: Phaser.Scene,
  battlefield: BattlefieldRenderState,
  opponent: DuelMatchState['opponent'],
  visible: boolean,
): void {
  destroyBattlefieldRenderState(battlefield);

  // Same aura rule as the player's field; copies keep the duel state untouched.
  battlefield.towers = createTowersWithAuras(opponent.battlefield.towers).map((tower) => {
    const sprite =
      getTowerAttackKind(tower.type) === TowerAttackKind.SPLASH
        ? createPlacedPlagueSprite(scene, tower.position)
        : createPlacedArcherSprite(scene, tower.position, opponent.raceId);
    sprite.setVisible(visible);
    return {
      entity: tower,
      runtime: createInitialTowerCombatRuntime(),
      sprite,
    };
  });
}
