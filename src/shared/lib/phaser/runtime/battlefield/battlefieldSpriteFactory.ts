import type Phaser from 'phaser';
import type { DuelMatchState } from '../../../../../entities/duel-match';
import { buildableTowers, createInitialTowerCombatRuntime } from '../../../../../entities/tower';
import {
  tryResolveUnitConfigById,
  type UnitConfig,
  type UnitId,
} from '../../../../../entities/unit';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import {
  TOWER_ANIMATION_KEYS,
  TOWER_SPRITE_KEYS,
  UNIT_FACTION_TINTS,
  UNIT_SPRITE_KEYS,
} from '../../../../constants/sprites';
import type { RaceId } from '../../../../types/content-ids';
import type { GridPosition } from '../../../../types/pathfinding';
import {
  BONE_ARCHER_ORIGIN_X,
  BONE_ARCHER_ORIGIN_Y,
  CREEP_VISUAL_SIZE_PX,
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
import {
  destroyBattlefieldRenderState,
  type BattlefieldRenderState,
} from './battlefieldRenderState';

export function getSpriteKeyByUnit(unit: UnitConfig): string {
  if (unit.id === 'undead_skeleton') {
    return UNIT_SPRITE_KEYS.UNDEAD_SKELETON;
  }
  if (unit.id === 'undead_crypt_fiend') {
    return UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND;
  }
  if (unit.id === 'undead_gargoyle') {
    return UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE;
  }
  if (unit.id === 'undead_ghoul') {
    return UNIT_SPRITE_KEYS.UNDEAD_GHOUL;
  }

  return getFallbackSpriteKeyByTier(unit.tier);
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
  return UNIT_FACTION_TINTS[unit.faction] ?? 0xffffff;
}

export function getAnimationKeyByUnit(unit: UnitConfig): string {
  return getWalkAnimationKeyBySpriteKey(getSpriteKeyByUnit(unit));
}

export function getArcherTowerSpriteKey(scene: Phaser.Scene, factionId: RaceId): string {
  const factionTower = buildableTowers.find(
    (tower) => tower.faction === factionId && tower.towerType === 'archer',
  );
  const spriteKey = factionTower?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;
  if (scene.textures.exists(spriteKey)) {
    return spriteKey;
  }

  return TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;
}

function resolveTowerRenderDepth(position: GridPosition): number {
  return TOWER_RENDER_DEPTH + position.y * 10 + position.x * 0.01;
}

export function createPlacedArcherSprite(
  scene: Phaser.Scene,
  position: GridPosition,
  factionId: RaceId,
): Phaser.GameObjects.Sprite {
  const center = toCellCenter(position);
  const spriteKey = getArcherTowerSpriteKey(scene, factionId);
  const animationSet = getTowerAnimationSet(spriteKey);
  const sprite = scene.add.sprite(center.x, center.y, spriteKey, 0);
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
  const center = toCellCenter(position);
  const spriteKey = PLAGUE_TOWER_CONFIG?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;
  const sprite = scene.add.sprite(center.x, center.y, spriteKey, 0);
  sprite.setDepth(resolveTowerRenderDepth(position));
  sprite.setDisplaySize(
    GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS * 1.1,
    GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS * 1.1,
  );
  sprite.setOrigin(PLAGUE_TOWER_ORIGIN_X, PLAGUE_TOWER_ORIGIN_Y);
  sprite.setTint(0x44aa44);
  sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD);
  sprite.once(`animationcomplete-${TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD}`, () => {
    if (!sprite.scene) {
      return;
    }
    sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_IDLE);
  });

  return sprite;
}

export function playArcherAttackAnimation(tower: TowerRenderState): void {
  if (tower.entity.type !== 'archer') {
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
  if (tower.entity.type !== 'splash') {
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

// Duel battlefield creeps only carry an id; the source unit id is its last
// ':'-separated segment (see createSendCreepEntries / baseline entries).
function resolveUnitConfigFromBattlefieldCreepId(creepId: string): UnitConfig | undefined {
  const unitIdSegment = creepId.split(':').at(-1);
  if (!unitIdSegment) {
    return undefined;
  }
  return tryResolveUnitConfigById(unitIdSegment as UnitId);
}

export function createOpponentCreepSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  creepId: string,
): Phaser.GameObjects.Sprite {
  const unit = resolveUnitConfigFromBattlefieldCreepId(creepId);
  const spriteKey = unit ? getSpriteKeyByUnit(unit) : UNIT_SPRITE_KEYS.UNDEAD_SKELETON;
  const sprite = scene.add.sprite(x, y, spriteKey, 0);
  sprite.setDisplaySize(CREEP_VISUAL_SIZE_PX, CREEP_VISUAL_SIZE_PX);
  sprite.setDepth(TOWER_RENDER_DEPTH - 1);
  sprite.setTint(unit ? getCreepTintByUnit(unit) : 0xffffff);
  sprite.play(getWalkAnimationKeyBySpriteKey(spriteKey));
  return sprite;
}

/**
 * Rebuilds the opponent Phaser render state from the duel match state:
 * destroys the previous sprites and re-creates towers plus alive creeps.
 */
export function rebuildOpponentBattlefieldRenderState(
  scene: Phaser.Scene,
  battlefield: BattlefieldRenderState,
  opponent: DuelMatchState['opponent'],
  visible: boolean,
): void {
  destroyBattlefieldRenderState(battlefield);

  battlefield.towers = opponent.battlefield.towers.map((tower) => {
    const sprite =
      tower.type === 'splash'
        ? createPlacedPlagueSprite(scene, tower.position)
        : createPlacedArcherSprite(scene, tower.position, opponent.raceId);
    sprite.setVisible(visible);
    return {
      entity: tower,
      runtime: createInitialTowerCombatRuntime(),
      sprite,
    };
  });

  battlefield.creeps = opponent.battlefield.creeps
    .filter((creep) => creep.status === 'alive')
    .map((creep) => {
      const position = toCellCenter(creep.position);
      const sprite = createOpponentCreepSprite(scene, position.x, position.y, creep.id);
      sprite.setVisible(visible);
      const unit = resolveUnitConfigFromBattlefieldCreepId(creep.id);
      return {
        entity: { ...creep },
        sprite,
        hitFlashRemainingMs: 0,
        deathFadeRemainingMs: 0,
        baseTint: unit ? getCreepTintByUnit(unit) : 0xffffff,
      };
    });
}
