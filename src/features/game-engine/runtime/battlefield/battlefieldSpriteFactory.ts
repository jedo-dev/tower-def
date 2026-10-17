import { TowerAttackKind, TowerTypeId } from '../../../../shared/types/content-ids';
import {
  getTowerAttackKind,
  resolveBuildableTowerById,
  type TowerEntity,
} from '../../../../entities/tower';
import type Phaser from 'phaser';
import type { DuelMatchState } from '../../../../entities/duel-match';
import {
  buildableTowers,
  createInitialTowerCombatRuntime,
  createTowersWithAuras,
} from '../../../../entities/tower';
import type { UnitConfig, UnitId } from '../../../../entities/unit';
import {
  TOWER_SPRITE_KEYS,
  UNIT_FACTION_TINTS,
  UNIT_SPRITE_KEY_BY_UNIT_ID,
  UNIT_SPRITE_KEYS,
} from '../../../../shared/constants/sprites';
import type { RaceId } from '../../../../shared/types/content-ids';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { PLAGUE_TOWER_CONFIG } from '../../scenes/gameScene.constants';
import type { TowerRenderState } from '../../scenes/gameScene.types';
import {
  getTowerAnimationSet,
  getWalkAnimationKeyBySpriteKey,
} from '../animation/gameSceneAnimationRuntime';
import { resolveSpriteKey } from '../assets/spriteKeyResolver';
import { resolveTowerRenderDepth } from './actorRenderDepth';
import { getTowerVisualMetrics, toTowerSpriteFootPoint } from './towerVisualMetrics';
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

/**
 * A tower sprite at its footprint: the painted structure sized by its sheet's
 * visual metrics, its bottom centre on the footprint's bottom centre, sorted
 * with the creeps by that bottom edge. Selection, range and hit testing stay
 * on the footprint; only the art overhangs upward.
 */
function addTowerSprite(
  scene: Phaser.Scene,
  position: GridPosition,
  textureKey: string,
): Phaser.GameObjects.Sprite {
  const foot = toTowerSpriteFootPoint(position);
  const metrics = getTowerVisualMetrics(textureKey);
  const sprite = scene.add.sprite(foot.x, foot.y, textureKey, 0);
  sprite.setDepth(resolveTowerRenderDepth(position));
  sprite.setDisplaySize(metrics.displayWidthPx, metrics.displayHeightPx);
  sprite.setOrigin(metrics.originX, metrics.originY);
  return sprite;
}

/** A placed tower's sprite, and whether it draws the tower's own sheet or borrowed art. */
export type PlacedTowerSprite = {
  sprite: Phaser.GameObjects.Sprite;
  hasOwnArt: boolean;
};

type PlacedTowerSource = Pick<TowerEntity, 'type' | 'position' | 'buildableTowerId'>;

function playBuildThenIdle(sprite: Phaser.GameObjects.Sprite, spriteKey: string): void {
  const animationSet = getTowerAnimationSet(spriteKey);
  sprite.play(animationSet.build);
  sprite.once(`animationcomplete-${animationSet.build}`, () => {
    if (!sprite.scene) {
      return;
    }
    sprite.play(animationSet.idle);
  });
}

function createOwnArtTowerSprite(
  scene: Phaser.Scene,
  position: GridPosition,
  spriteKey: string,
): Phaser.GameObjects.Sprite {
  const sprite = addTowerSprite(scene, position, spriteKey);
  playBuildThenIdle(sprite, spriteKey);
  return sprite;
}

/**
 * The sprite of a placed tower: its own sheet when the art is loaded,
 * otherwise the borrowed art of its attack kind (the plague sheet for splash,
 * the race's archer for the rest). A tower without its own art is still
 * reported to the missing-art list.
 */
export function createPlacedTowerSprite(
  scene: Phaser.Scene,
  tower: PlacedTowerSource,
  raceId: RaceId,
): PlacedTowerSprite {
  const config =
    tower.buildableTowerId === undefined ? null : resolveBuildableTowerById(tower.buildableTowerId);
  if (config) {
    if (scene.textures.exists(config.spriteKey)) {
      return {
        sprite: createOwnArtTowerSprite(scene, tower.position, config.spriteKey),
        hasOwnArt: true,
      };
    }
    // Only for the missing-art report; the borrowed art below is what gets drawn.
    resolveSpriteKey(scene.textures, 'tower', config.spriteKey, { raceId, contentId: config.id });
  }

  const sprite =
    getTowerAttackKind(tower.type) === TowerAttackKind.SPLASH
      ? createPlacedPlagueSprite(scene, tower.position)
      : createPlacedArcherSprite(scene, tower.position, raceId);
  return { sprite, hasOwnArt: false };
}

export function createPlacedArcherSprite(
  scene: Phaser.Scene,
  position: GridPosition,
  factionId: RaceId,
): Phaser.GameObjects.Sprite {
  const resolved = resolveArcherTowerSprite(scene, factionId);
  const sprite = addTowerSprite(scene, position, resolved.spriteKey);
  if (resolved.isPlaceholder && resolved.placeholderTint !== undefined) {
    sprite.setTint(resolved.placeholderTint);
  }
  playBuildThenIdle(sprite, resolved.spriteKey);

  return sprite;
}

export function createPlacedPlagueSprite(
  scene: Phaser.Scene,
  position: GridPosition,
): Phaser.GameObjects.Sprite {
  const resolved = resolveSpriteKey(
    scene.textures,
    'tower',
    PLAGUE_TOWER_CONFIG?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER,
    { contentId: PLAGUE_TOWER_CONFIG?.id },
  );
  const sprite = addTowerSprite(scene, position, resolved.spriteKey);
  sprite.setTint(0x44aa44);
  playBuildThenIdle(sprite, resolved.spriteKey);

  return sprite;
}

/** Plays the sheet's attack, then back to idle: every tower with its own art, plus borrowed archers. */
export function playArcherAttackAnimation(tower: TowerRenderState): void {
  if (!tower.hasOwnArt && getTowerAttackKind(tower.entity.type) !== TowerAttackKind.SINGLE_TARGET) {
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

/** A splash tower with its own sheet animates; one on borrowed plague art flashes its tint. */
export function playPlagueAttackAnimation(scene: Phaser.Scene, tower: TowerRenderState): void {
  if (tower.hasOwnArt) {
    playArcherAttackAnimation(tower);
    return;
  }

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
    const { sprite, hasOwnArt } = createPlacedTowerSprite(scene, tower, opponent.raceId);
    sprite.setVisible(visible);
    return {
      entity: tower,
      runtime: createInitialTowerCombatRuntime(),
      sprite,
      hasOwnArt,
    };
  });
}
